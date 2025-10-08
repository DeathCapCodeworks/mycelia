import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { featureFlags } from '@mycelia/web4-feature-flags';
import { observability } from '@mycelia/observability';

export interface Room {
  id: string;
  name: string;
  rights: 'Original' | 'CC' | 'Licensed';
  creatorDid: string;
  createdAt: number;
  listenerCount: number;
  currentTrack?: Track;
  queueLength: number;
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

export interface Listener {
  id: string;
  did: string;
  joinedAt: number;
  bytesReceived: number;
}

export interface PayoutEstimate {
  uploader: number;
  seeders: number;
  total: number;
}

const RadioUX: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [listeners, setListeners] = useState<Listener[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isAddingTrack, setIsAddingTrack] = useState(false);
  const [payoutEstimate, setPayoutEstimate] = useState<PayoutEstimate | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!featureFlags.isFlagEnabled('radio_v0')) {
      return;
    }

    // Connect to Radio SFU
    const socket = io('http://localhost:3002');
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to Radio SFU');
      observability.logEvent('radio_ux_connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from Radio SFU');
      observability.logEvent('radio_ux_disconnected');
    });

    socket.on('roomState', (data) => {
      setCurrentRoom(data.room);
      setTracks(data.queue);
      setListeners(data.listeners);
    });

    socket.on('trackAdded', (track: Track) => {
      setTracks(prev => [...prev, track]);
      observability.logEvent('radio_track_added_ui', {
        track_id: track.id,
        title: track.title
      });
    });

    socket.on('listenerJoined', (data) => {
      setListeners(prev => [...prev, data]);
    });

    socket.on('listenerLeft', (data) => {
      setListeners(prev => prev.filter(l => l.id !== data.listenerId));
    });

    // Load rooms
    loadRooms();

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadRooms = async () => {
    try {
      const response = await fetch('http://localhost:3002/rooms');
      const data = await response.json();
      setRooms(data.rooms);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  };

  const createRoom = async (name: string, rights: 'Original' | 'CC' | 'Licensed') => {
    setIsCreatingRoom(true);
    try {
      const response = await fetch('http://localhost:3002/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          rights,
          creatorDid: 'did:mycelia:creator123' // Mock DID
        }),
      });

      const room = await response.json();
      setRooms(prev => [...prev, room]);
      
      observability.logEvent('radio_room_created_ui', {
        room_id: room.id,
        name: room.name,
        rights: room.rights
      });

    } catch (error) {
      console.error('Failed to create room:', error);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const joinRoom = (roomId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('joinRoom', {
        roomId,
        did: 'did:mycelia:listener123' // Mock DID
      });
      
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        setCurrentRoom(room);
      }

      observability.logEvent('radio_room_joined_ui', {
        room_id: roomId
      });
    }
  };

  const leaveRoom = () => {
    if (socketRef.current && currentRoom) {
      socketRef.current.emit('leaveRoom', {
        roomId: currentRoom.id
      });
      setCurrentRoom(null);
      setTracks([]);
      setListeners([]);

      observability.logEvent('radio_room_left_ui', {
        room_id: currentRoom.id
      });
    }
  };

  const addTrack = async (cid: string, title: string, artist: string, duration: number, rights: 'Original' | 'CC' | 'Licensed') => {
    if (!currentRoom) return;

    setIsAddingTrack(true);
    try {
      const response = await fetch(`http://localhost:3002/rooms/${currentRoom.id}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cid,
          title,
          artist,
          duration,
          rights,
          uploaderDid: 'did:mycelia:uploader123' // Mock DID
        }),
      });

      const track = await response.json();
      setTracks(prev => [...prev, track]);

      observability.logEvent('radio_track_added_ui', {
        room_id: currentRoom.id,
        track_id: track.id,
        title: track.title
      });

    } catch (error) {
      console.error('Failed to add track:', error);
    } finally {
      setIsAddingTrack(false);
    }
  };

  const calculatePayouts = () => {
    if (!currentRoom || tracks.length === 0) return;

    // Mock payout calculation
    const totalListeners = listeners.length;
    const totalTracks = tracks.length;
    
    // Simple calculation: 70% to uploaders, 30% to seeders
    const uploaderShare = 0.7;
    const seederShare = 0.3;
    
    const baseAmount = 100; // Mock BLOOM amount
    const uploaderAmount = baseAmount * uploaderShare * totalTracks;
    const seederAmount = baseAmount * seederShare * totalListeners;
    
    setPayoutEstimate({
      uploader: uploaderAmount,
      seeders: seederAmount,
      total: uploaderAmount + seederAmount
    });
  };

  useEffect(() => {
    calculatePayouts();
  }, [currentRoom, tracks, listeners]);

  if (!featureFlags.isFlagEnabled('radio_v0')) {
    return (
      <div className="radio-disabled">
        <h2>Radio v0</h2>
        <p>Radio feature is currently disabled. Enable the radio_v0 feature flag to use this feature.</p>
      </div>
    );
  }

  return (
    <div className="radio-ux">
      <h1>Radio v0 - WebRTC SFU Rooms</h1>
      
      <div className="connection-status">
        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>

      {!currentRoom ? (
        <div className="room-selection">
          <h2>Available Rooms</h2>
          <div className="rooms-grid">
            {rooms.map(room => (
              <div key={room.id} className="room-card">
                <h3>{room.name}</h3>
                <div className="room-meta">
                  <span className={`rights ${room.rights.toLowerCase()}`}>
                    {room.rights}
                  </span>
                  <span className="listeners">
                    {room.listenerCount} listeners
                  </span>
                  <span className="queue">
                    {room.queueLength} tracks
                  </span>
                </div>
                <button onClick={() => joinRoom(room.id)} className="join-button">
                  Join Room
                </button>
              </div>
            ))}
          </div>

          <div className="create-room">
            <h3>Create New Room</h3>
            <CreateRoomForm onCreateRoom={createRoom} isCreating={isCreatingRoom} />
          </div>
        </div>
      ) : (
        <div className="room-view">
          <div className="room-header">
            <h2>{currentRoom.name}</h2>
            <div className="room-info">
              <span className={`rights ${currentRoom.rights.toLowerCase()}`}>
                {currentRoom.rights}
              </span>
              <span className="listeners">
                {listeners.length} listeners
              </span>
            </div>
            <button onClick={leaveRoom} className="leave-button">
              Leave Room
            </button>
          </div>

          <div className="room-content">
            <div className="tracks-section">
              <h3>Track Queue</h3>
              <AddTrackForm onAddTrack={addTrack} isAdding={isAddingTrack} />
              <div className="tracks-list">
                {tracks.map(track => (
                  <div key={track.id} className="track-item">
                    <div className="track-info">
                      <h4>{track.title}</h4>
                      <p>{track.artist}</p>
                      <span className={`track-rights ${track.rights.toLowerCase()}`}>
                        {track.rights}
                      </span>
                    </div>
                    <div className="track-duration">
                      {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="payouts-section">
              <h3>Payouts Meter</h3>
              <div className="payouts-info">
                <p><strong>Note:</strong> These are provisional BLOOM shares for demo purposes only. No mainnet payouts until governance flag is enabled.</p>
                {payoutEstimate && (
                  <div className="payout-breakdown">
                    <div className="payout-item">
                      <span>Uploader Share:</span>
                      <span>{payoutEstimate.uploader.toFixed(2)} BLOOM</span>
                    </div>
                    <div className="payout-item">
                      <span>Seeder Share:</span>
                      <span>{payoutEstimate.seeders.toFixed(2)} BLOOM</span>
                    </div>
                    <div className="payout-item total">
                      <span>Total:</span>
                      <span>{payoutEstimate.total.toFixed(2)} BLOOM</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .radio-ux {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          color: #eee;
        }

        h1 {
          color: #00d4ff;
          margin-bottom: 2rem;
          text-align: center;
        }

        h2 {
          color: #00ff88;
          margin-bottom: 1rem;
        }

        h3 {
          color: #00d4ff;
          margin-bottom: 1rem;
        }

        .connection-status {
          margin-bottom: 2rem;
          text-align: center;
        }

        .status-indicator {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: bold;
        }

        .status-indicator.connected {
          background: rgba(0, 255, 136, 0.2);
          color: #00ff88;
        }

        .status-indicator.disconnected {
          background: rgba(255, 102, 102, 0.2);
          color: #ff6666;
        }

        .rooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .room-card {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid #00d4ff;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .room-card h3 {
          margin-top: 0;
          color: #00d4ff;
        }

        .room-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .room-meta span {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .rights.original {
          background: rgba(0, 255, 136, 0.2);
          color: #00ff88;
        }

        .rights.cc {
          background: rgba(255, 170, 0, 0.2);
          color: #ffaa00;
        }

        .rights.licensed {
          background: rgba(255, 102, 102, 0.2);
          color: #ff6666;
        }

        .listeners {
          background: rgba(0, 212, 255, 0.2);
          color: #00d4ff;
        }

        .queue {
          background: rgba(128, 128, 128, 0.2);
          color: #ccc;
        }

        .join-button {
          background: #00d4ff;
          color: #1a1a1a;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 25px;
          cursor: pointer;
          font-weight: bold;
          transition: background 0.3s ease;
        }

        .join-button:hover {
          background: #00b3e6;
        }

        .create-room {
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid #00ff88;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .room-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #333;
        }

        .room-header h2 {
          margin: 0;
          color: #00d4ff;
        }

        .room-info {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .leave-button {
          background: #ff6666;
          color: #1a1a1a;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 25px;
          cursor: pointer;
          font-weight: bold;
          transition: background 0.3s ease;
        }

        .leave-button:hover {
          background: #e65c5c;
        }

        .room-content {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
        }

        .tracks-section {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid #00d4ff;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .tracks-list {
          margin-top: 1rem;
        }

        .track-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          margin-bottom: 0.5rem;
        }

        .track-info h4 {
          margin: 0 0 0.25rem 0;
          color: #00d4ff;
        }

        .track-info p {
          margin: 0 0 0.5rem 0;
          color: #ccc;
        }

        .track-rights {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .track-duration {
          color: #888;
          font-family: monospace;
        }

        .payouts-section {
          background: rgba(255, 170, 0, 0.1);
          border: 1px solid #ffaa00;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .payouts-info p {
          color: #ccc;
          margin-bottom: 1rem;
        }

        .payout-breakdown {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .payout-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }

        .payout-item.total {
          background: rgba(255, 170, 0, 0.2);
          font-weight: bold;
        }

        .radio-disabled {
          padding: 2rem;
          text-align: center;
          color: #ccc;
        }

        .radio-disabled h2 {
          color: #ff6666;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
};

// Create Room Form Component
const CreateRoomForm: React.FC<{
  onCreateRoom: (name: string, rights: 'Original' | 'CC' | 'Licensed') => void;
  isCreating: boolean;
}> = ({ onCreateRoom, isCreating }) => {
  const [name, setName] = useState('');
  const [rights, setRights] = useState<'Original' | 'CC' | 'Licensed'>('Original');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateRoom(name.trim(), rights);
      setName('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-room-form">
      <input
        type="text"
        placeholder="Room name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <select value={rights} onChange={(e) => setRights(e.target.value as 'Original' | 'CC' | 'Licensed')}>
        <option value="Original">Original</option>
        <option value="CC">Creative Commons</option>
        <option value="Licensed">Licensed</option>
      </select>
      <button type="submit" disabled={isCreating}>
        {isCreating ? 'Creating...' : 'Create Room'}
      </button>
    </form>
  );
};

// Add Track Form Component
const AddTrackForm: React.FC<{
  onAddTrack: (cid: string, title: string, artist: string, duration: number, rights: 'Original' | 'CC' | 'Licensed') => void;
  isAdding: boolean;
}> = ({ onAddTrack, isAdding }) => {
  const [cid, setCid] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [duration, setDuration] = useState(180); // 3 minutes default
  const [rights, setRights] = useState<'Original' | 'CC' | 'Licensed'>('Original');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cid.trim() && title.trim() && artist.trim()) {
      onAddTrack(cid.trim(), title.trim(), artist.trim(), duration, rights);
      setCid('');
      setTitle('');
      setArtist('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-track-form">
      <input
        type="text"
        placeholder="Content ID (CID)"
        value={cid}
        onChange={(e) => setCid(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Track title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Artist"
        value={artist}
        onChange={(e) => setArtist(e.target.value)}
        required
      />
      <input
        type="number"
        placeholder="Duration (seconds)"
        value={duration}
        onChange={(e) => setDuration(parseInt(e.target.value))}
        min="1"
        required
      />
      <select value={rights} onChange={(e) => setRights(e.target.value as 'Original' | 'CC' | 'Licensed')}>
        <option value="Original">Original</option>
        <option value="CC">Creative Commons</option>
        <option value="Licensed">Licensed</option>
      </select>
      <button type="submit" disabled={isAdding}>
        {isAdding ? 'Adding...' : 'Add Track'}
      </button>
    </form>
  );
};

export default RadioUX;
