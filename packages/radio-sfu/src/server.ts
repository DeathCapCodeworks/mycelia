import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import sqlite3 from 'sqlite3';
import { create } from 'ipfs-core';
import { observability } from '@mycelia/observability';
import { featureFlags } from '@mycelia/web4-feature-flags';

export interface Room {
  id: string;
  name: string;
  rights: 'Original' | 'CC' | 'Licensed';
  creatorDid: string;
  createdAt: number;
  isActive: boolean;
  currentTrack?: Track;
  queue: Track[];
}

export interface Track {
  id: string;
  cid: string;
  title: string;
  artist: string;
  duration: number;
  rights: 'Original' | 'CC' | 'Licensed';
  uploaderDid: string;
  uploadedAt: number;
}

export interface DistributionReceipt {
  roomId: string;
  trackId: string;
  contributors: string[];
  bytesOut: number;
  timestamp: number;
}

export interface Listener {
  id: string;
  socketId: string;
  did: string;
  joinedAt: number;
  bytesReceived: number;
}

export class RadioSFU {
  private app: express.Application;
  private server: any;
  private io: Server;
  private db: sqlite3.Database;
  private ipfs: any = null;
  private rooms: Map<string, Room> = new Map();
  private listeners: Map<string, Map<string, Listener>> = new Map();
  private port: number;

  constructor(port: number = 3002) {
    this.port = port;
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    this.db = new sqlite3.Database('.cache/radio-sfu.db');
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.initializeDatabase();
    this.initializeIPFS();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            rights TEXT NOT NULL,
            creator_did TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT TRUE
          )
        `);

        this.db.run(`
          CREATE TABLE IF NOT EXISTS tracks (
            id TEXT PRIMARY KEY,
            cid TEXT NOT NULL,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            duration INTEGER NOT NULL,
            rights TEXT NOT NULL,
            uploader_did TEXT NOT NULL,
            uploaded_at INTEGER NOT NULL
          )
        `);

        this.db.run(`
          CREATE TABLE IF NOT EXISTS room_tracks (
            room_id TEXT NOT NULL,
            track_id TEXT NOT NULL,
            position INTEGER NOT NULL,
            FOREIGN KEY (room_id) REFERENCES rooms (id),
            FOREIGN KEY (track_id) REFERENCES tracks (id)
          )
        `);

        this.db.run(`
          CREATE TABLE IF NOT EXISTS distribution_receipts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id TEXT NOT NULL,
            track_id TEXT NOT NULL,
            contributors TEXT NOT NULL,
            bytes_out INTEGER NOT NULL,
            timestamp INTEGER NOT NULL
          )
        `);

        resolve();
      });
    });
  }

  private async initializeIPFS(): Promise<void> {
    try {
      this.ipfs = await create({
        repo: '.cache/ipfs-radio',
        config: {
          Addresses: {
            Swarm: ['/ip4/0.0.0.0/tcp/4004']
          }
        }
      });

      observability.logEvent('radio_sfu_initialized', {
        ipfs_peer_id: this.ipfs.peerId?.toString(),
        port: this.port
      });
    } catch (error) {
      console.error('Failed to initialize IPFS for radio:', error);
    }
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: Date.now(),
        rooms: this.rooms.size,
        totalListeners: Array.from(this.listeners.values()).reduce((sum, roomListeners) => sum + roomListeners.size, 0)
      });
    });

    // Create room
    this.app.post('/rooms', async (req, res) => {
      try {
        if (!featureFlags.isFlagEnabled('radio_v0')) {
          return res.status(403).json({ error: 'Radio v0 feature flag disabled' });
        }

        const { name, rights, creatorDid } = req.body;
        
        if (!['Original', 'CC', 'Licensed'].includes(rights)) {
          return res.status(400).json({ error: 'Invalid rights type' });
        }

        const room: Room = {
          id: this.generateRoomId(),
          name,
          rights,
          creatorDid,
          createdAt: Date.now(),
          isActive: true,
          queue: []
        };

        this.rooms.set(room.id, room);
        await this.saveRoom(room);

        observability.logEvent('radio_room_created', {
          room_id: room.id,
          name: room.name,
          rights: room.rights,
          creator_did: room.creatorDid
        });

        res.json(room);

      } catch (error) {
        console.error('Failed to create room:', error);
        res.status(500).json({ error: 'Failed to create room' });
      }
    });

    // Get rooms
    this.app.get('/rooms', (req, res) => {
      const rooms = Array.from(this.rooms.values())
        .filter(room => room.isActive)
        .map(room => ({
          id: room.id,
          name: room.name,
          rights: room.rights,
          creatorDid: room.creatorDid,
          createdAt: room.createdAt,
          listenerCount: this.listeners.get(room.id)?.size || 0,
          currentTrack: room.currentTrack,
          queueLength: room.queue.length
        }));

      res.json({ rooms });
    });

    // Add track to room
    this.app.post('/rooms/:roomId/tracks', async (req, res) => {
      try {
        const { roomId } = req.params;
        const { cid, title, artist, duration, rights, uploaderDid } = req.body;

        const room = this.rooms.get(roomId);
        if (!room) {
          return res.status(404).json({ error: 'Room not found' });
        }

        if (!['Original', 'CC', 'Licensed'].includes(rights)) {
          return res.status(400).json({ error: 'Invalid rights type' });
        }

        const track: Track = {
          id: this.generateTrackId(),
          cid,
          title,
          artist,
          duration,
          rights,
          uploaderDid,
          uploadedAt: Date.now()
        };

        room.queue.push(track);
        await this.saveTrack(track);
        await this.addTrackToRoom(roomId, track.id, room.queue.length - 1);

        // Notify room listeners
        this.io.to(roomId).emit('trackAdded', track);

        observability.logEvent('radio_track_added', {
          room_id: roomId,
          track_id: track.id,
          title: track.title,
          rights: track.rights,
          uploader_did: track.uploaderDid
        });

        res.json(track);

      } catch (error) {
        console.error('Failed to add track:', error);
        res.status(500).json({ error: 'Failed to add track' });
      }
    });

    // Get room details
    this.app.get('/rooms/:roomId', (req, res) => {
      const { roomId } = req.params;
      const room = this.rooms.get(roomId);
      
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const listeners = this.listeners.get(roomId) || new Map();
      
      res.json({
        ...room,
        listeners: Array.from(listeners.values()),
        listenerCount: listeners.size
      });
    });
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('joinRoom', (data) => {
        this.handleJoinRoom(socket, data);
      });

      socket.on('leaveRoom', (data) => {
        this.handleLeaveRoom(socket, data);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleJoinRoom(socket: any, data: { roomId: string; did: string }): void {
    const { roomId, did } = data;
    const room = this.rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Join socket room
    socket.join(roomId);

    // Add listener
    const listener: Listener = {
      id: this.generateListenerId(),
      socketId: socket.id,
      did,
      joinedAt: Date.now(),
      bytesReceived: 0
    };

    if (!this.listeners.has(roomId)) {
      this.listeners.set(roomId, new Map());
    }
    this.listeners.get(roomId)!.set(socket.id, listener);

    // Notify room
    socket.to(roomId).emit('listenerJoined', {
      listenerId: listener.id,
      did: listener.did
    });

    // Send current room state
    socket.emit('roomState', {
      room,
      currentTrack: room.currentTrack,
      queue: room.queue,
      listeners: Array.from(this.listeners.get(roomId)?.values() || [])
    });

    observability.logEvent('radio_listener_joined', {
      room_id: roomId,
      listener_did: did,
      socket_id: socket.id
    });
  }

  private handleLeaveRoom(socket: any, data: { roomId: string }): void {
    const { roomId } = data;
    const room = this.rooms.get(roomId);
    
    if (room) {
      socket.leave(roomId);
      
      const listeners = this.listeners.get(roomId);
      if (listeners) {
        const listener = listeners.get(socket.id);
        if (listener) {
          listeners.delete(socket.id);
          
          // Notify room
          socket.to(roomId).emit('listenerLeft', {
            listenerId: listener.id,
            did: listener.did
          });

          observability.logEvent('radio_listener_left', {
            room_id: roomId,
            listener_did: listener.did,
            socket_id: socket.id
          });
        }
      }
    }
  }

  private handleDisconnect(socket: any): void {
    // Remove from all rooms
    for (const [roomId, listeners] of this.listeners.entries()) {
      if (listeners.has(socket.id)) {
        const listener = listeners.get(socket.id)!;
        listeners.delete(socket.id);
        
        socket.to(roomId).emit('listenerLeft', {
          listenerId: listener.id,
          did: listener.did
        });
      }
    }

    observability.logEvent('radio_client_disconnected', {
      socket_id: socket.id
    });
  }

  async generateDistributionReceipt(roomId: string, trackId: string, bytesOut: number): Promise<DistributionReceipt> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const listeners = this.listeners.get(roomId) || new Map();
    const contributors = Array.from(listeners.values()).map(listener => listener.did);

    const receipt: DistributionReceipt = {
      roomId,
      trackId,
      contributors,
      bytesOut,
      timestamp: Date.now()
    };

    await this.saveDistributionReceipt(receipt);

    observability.logEvent('radio_distribution_receipt', {
      room_id: roomId,
      track_id: trackId,
      contributors_count: contributors.length,
      bytes_out: bytesOut
    });

    return receipt;
  }

  private async saveRoom(room: Room): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO rooms (id, name, rights, creator_did, created_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [room.id, room.name, room.rights, room.creatorDid, room.createdAt, room.isActive ? 1 : 0],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async saveTrack(track: Track): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO tracks (id, cid, title, artist, duration, rights, uploader_did, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [track.id, track.cid, track.title, track.artist, track.duration, track.rights, track.uploaderDid, track.uploadedAt],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async addTrackToRoom(roomId: string, trackId: string, position: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO room_tracks (room_id, track_id, position) VALUES (?, ?, ?)',
        [roomId, trackId, position],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async saveDistributionReceipt(receipt: DistributionReceipt): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO distribution_receipts (room_id, track_id, contributors, bytes_out, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [receipt.roomId, receipt.trackId, JSON.stringify(receipt.contributors), receipt.bytesOut, receipt.timestamp],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private generateRoomId(): string {
    return 'room_' + Math.random().toString(36).substr(2, 9);
  }

  private generateTrackId(): string {
    return 'track_' + Math.random().toString(36).substr(2, 9);
  }

  private generateListenerId(): string {
    return 'listener_' + Math.random().toString(36).substr(2, 9);
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`Radio SFU server running on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.ipfs) {
      await this.ipfs.stop();
    }
    this.db.close();
    this.server.close();
  }
}

export default RadioSFU;
