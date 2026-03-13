import sodium from "libsodium-wrappers";

/** Signal types whose numeric value must be encrypted at rest. */
const SENSITIVE_TYPES = new Set([
    "cgm_glucose_mgdl",
    "hr_bpm",
    "hrv_rmssd",
    "sleep_minutes",
    "steps",
]);

let _ready: Promise<void> | null = null;
function ensureReady(): Promise<void> {
    if (!_ready) _ready = sodium.ready;
    return _ready;
}

function getKey(): Uint8Array {
    const b64 = process.env.ZYNTRA_FIELD_ENCRYPTION_KEY;
    if (!b64) throw new Error("ZYNTRA_FIELD_ENCRYPTION_KEY not set");
    const key = sodium.from_base64(b64, sodium.base64_variants.ORIGINAL);
    if (key.length !== sodium.crypto_secretbox_KEYBYTES) {
        throw new Error(
            `Encryption key must be ${sodium.crypto_secretbox_KEYBYTES} bytes (got ${key.length})`
        );
    }
    return key;
}

/** Returns true if this signal type should be encrypted. */
export function isSensitiveType(type: string): boolean {
    return SENSITIVE_TYPES.has(type);
}

/**
 * Encrypts a numeric value using secretbox.
 * Returns a base64 string of `nonce || ciphertext`.
 */
export async function encryptValue(value: number): Promise<string> {
    await ensureReady();
    const key = getKey();
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const plaintext = sodium.from_string(String(value));
    const ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, key);
    const combined = new Uint8Array(nonce.length + ciphertext.length);
    combined.set(nonce);
    combined.set(ciphertext, nonce.length);
    return sodium.to_base64(combined, sodium.base64_variants.ORIGINAL);
}

/**
 * Decrypts a base64 encoded `nonce || ciphertext` back to a number.
 */
export async function decryptValue(encoded: string): Promise<number> {
    await ensureReady();
    const key = getKey();
    const combined = sodium.from_base64(encoded, sodium.base64_variants.ORIGINAL);
    const nonceLen = sodium.crypto_secretbox_NONCEBYTES;
    const nonce = combined.slice(0, nonceLen);
    const ciphertext = combined.slice(nonceLen);
    const plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
    return Number(sodium.to_string(plaintext));
}
