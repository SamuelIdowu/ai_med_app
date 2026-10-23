import { randomBytes } from 'crypto';

export const getRandomBytes = (byteCount: number): Uint8Array =>
  new Uint8Array(randomBytes(byteCount));

export const getRandomBytesAsync = async (byteCount: number): Promise<Uint8Array> =>
  getRandomBytes(byteCount);

export const getRandomValues = <T extends Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array>(
  typedArray: T
): T => {
  const bytes = randomBytes(typedArray.byteLength);
  new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength).set(bytes);
  return typedArray;
};

export const randomUUID = (): string => {
  const bytes = getRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
