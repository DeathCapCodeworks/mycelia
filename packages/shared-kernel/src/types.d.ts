declare module 'libsodium-wrappers-sumo' {
  export function ready(): Promise<void>;
  export function crypto_sign_keypair(): { publicKey: Uint8Array; privateKey: Uint8Array };
  export function crypto_sign(message: Uint8Array, privateKey: Uint8Array): Uint8Array;
  export function crypto_sign_open(signedMessage: Uint8Array, publicKey: Uint8Array): Uint8Array;
  export function crypto_sign_detached(message: Uint8Array, privateKey: Uint8Array): Uint8Array;
  export function crypto_sign_verify_detached(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean;
  export function crypto_secretbox(message: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array;
  export function crypto_secretbox_open(ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array;
  export function crypto_box_seal(message: Uint8Array, publicKey: Uint8Array): Uint8Array;
  export function crypto_box_seal_open(ciphertext: Uint8Array, publicKey: Uint8Array, privateKey: Uint8Array): Uint8Array;
  export function randombytes_buf(length: number): Uint8Array;
  export const crypto_secretbox_NONCEBYTES: number;
  export const crypto_secretbox_KEYBYTES: number;
}

