import crypto from "crypto";

/** Signal types whose numeric value must be encrypted at rest. */
const SENSITIVE_TYPES = new Set([
    "cgm_glucose_mgdl",
    "hr_bpm",
    "hrv_rmssd",
    "sleep_minutes",
    "steps",
]);

function getKey(): Buffer {
    const b64 = process.env.ZYNTRA_FIELD_ENCRYPTION_KEY;
    if (!b64) throw new Error("ZYNTRA_FIELD_ENCRYPTION_KEY not set");
    const key = Buffer.from(b64, "base64");
    const expectedLen = 32; // AES-256 key size
    if (key.length !== expectedLen) {
        throw new Error(`Encryption key must be ${expectedLen} bytes (got ${key.length})`);
    }
    return key;
}

/** Returns true if this signal type should be encrypted. */
export function isSensitiveType(type: string): boolean {
    return SENSITIVE_TYPES.has(type);
}

/**
 * Encrypts a numeric value.
 * Returns a versioned payload string.
 */
export async function encryptValue(value: number): Promise<string> {
    return encryptText(String(value));
}

/**
 * Encrypts an arbitrary string with AES-256-GCM.
 * Returns a versioned base64 payload: `v2:base64(iv || authTag || ciphertext)`.
 */
export async function encryptText(value: string): Promise<string> {
    const key = getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const payload = Buffer.concat([iv, authTag, ciphertext]).toString("base64");
    return `v2:${payload}`;
}

/**
 * Decrypts a base64 encoded `nonce || ciphertext` back to a number.
 */
export async function decryptValue(encoded: string): Promise<number> {
    const plaintext = await decryptText(encoded);
    return Number(plaintext);
}

/**
 * Decrypts a versioned encrypted payload back to a string.
 * Backward compatible with legacy libsodium payloads (unversioned base64).
 */
export async function decryptText(encoded: string): Promise<string> {
    if (encoded.startsWith("v2:")) {
        return decryptTextV2(encoded.slice(3));
    }
    try {
        return decryptTextV2(encoded);
    } catch {
        const legacy = await decryptLegacySodium(encoded);
        if (legacy !== null) return legacy;
        throw new Error("Unable to decrypt payload");
    }
}

function decryptTextV2(payloadB64: string): string {
    const key = getKey();
    const combined = Buffer.from(payloadB64, "base64");
    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 28);
    const ciphertext = combined.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
}

async function decryptLegacySodium(encoded: string): Promise<string | null> {
    try {
        const req = eval("require") as NodeRequire;
        const sodium = req("libsodium-wrappers") as typeof import("libsodium-wrappers");
        await sodium.ready;
        const key = sodium.from_base64(
            process.env.ZYNTRA_FIELD_ENCRYPTION_KEY!,
            sodium.base64_variants.ORIGINAL
        );
        const combined = sodium.from_base64(encoded, sodium.base64_variants.ORIGINAL);
        const nonceLen = sodium.crypto_secretbox_NONCEBYTES;
        const nonce = combined.slice(0, nonceLen);
        const ciphertext = combined.slice(nonceLen);
        const plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
        return sodium.to_string(plaintext);
    } catch {
        return null;
    }
}
