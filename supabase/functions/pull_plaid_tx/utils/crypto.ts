// supabase/functions/pull_plaid_tx/utils/crypto.ts
// —————————————————————————————————————————————————————————
// Assumes you set PLAID_TOKEN_ENCRYPTION_KEY in your Edge Function’s env to the
// same base64 value you use in Express.

export async function decryptToken(encrypted: string): Promise<string> {
  // 1) pull down the same base64 key, decode to raw bytes
  const keyB64 = Deno.env.get("PLAID_TOKEN_ENCRYPTION_KEY")!;
  const rawKey = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));

  // 2) split your iv:tag:ciphertext blob
  const [ivB64, tagB64, ctB64] = encrypted.split(":");
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const tag = Uint8Array.from(atob(tagB64), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));

  // 3) WebCrypto wants ciphertext+tag concatenated
  const data = new Uint8Array(ct.length + tag.length);
  data.set(ct);
  data.set(tag, ct.length);

  // 4) import and decrypt
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey.buffer,
    "AES-GCM",
    false,
    ["decrypt"]
  );

  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data.buffer
  );

  return new TextDecoder().decode(plain);
}
