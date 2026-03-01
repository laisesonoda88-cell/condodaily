import crypto from 'crypto';

/**
 * L6: AES-256-GCM encryption for sensitive data (e.g. MP access tokens).
 *
 * Key is derived from ENCRYPTION_KEY env var (min 32 chars).
 * Format: base64(iv:tag:ciphertext)
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    throw new Error('ENCRYPTION_KEY não configurada ou muito curta (mínimo 32 caracteres)');
  }
  // Use SHA-256 to derive exactly 32 bytes regardless of input length
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Encrypt a plaintext string → base64-encoded ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Pack: iv + tag + ciphertext → base64
  const packed = Buffer.concat([iv, tag, encrypted]);
  return packed.toString('base64');
}

/**
 * Decrypt a base64-encoded ciphertext → plaintext string
 */
export function decrypt(cipherB64: string): string {
  const key = getKey();
  const packed = Buffer.from(cipherB64, 'base64');

  const iv = packed.subarray(0, IV_LENGTH);
  const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Check if a string looks like an encrypted value (base64 with minimum length)
 */
export function isEncrypted(value: string): boolean {
  if (value.length < 60) return false; // iv(16) + tag(16) + min data → base64 ≈ 60+ chars
  try {
    const buf = Buffer.from(value, 'base64');
    return buf.length >= IV_LENGTH + TAG_LENGTH + 1;
  } catch {
    return false;
  }
}
