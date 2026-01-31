const STORAGE_KEY = 'actor_keypair'

export interface ActorIdentity {
  publicKey: string   // Base64 encoded
  privateKey: string  // Base64 encoded (stored locally only)
}

export async function getOrCreateIdentity(): Promise<ActorIdentity> {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // Corrupted storage, regenerate
    }
  }

  // Generate ECDSA P-256 keypair
  const keypair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,  // extractable
    ['sign', 'verify']
  )

  const publicKeyBuffer = await crypto.subtle.exportKey('raw', keypair.publicKey)
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keypair.privateKey)

  const identity: ActorIdentity = {
    publicKey: btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer))),
    privateKey: btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)))
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  return identity
}

// Derive colorHue from public key (deterministic)
// Uses a simple hash that produces values 0-360
export function deriveColorHue(publicKey: string): number {
  const bytes = atob(publicKey)
  let hash = 0
  for (let i = 0; i < bytes.length; i++) {
    hash = (hash * 31 + bytes.charCodeAt(i)) >>> 0
  }
  return hash % 360
}
