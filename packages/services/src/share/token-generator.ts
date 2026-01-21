import { customAlphabet } from "nanoid";

/**
 * 生成 URL-safe 的隨機 ID
 * 使用 nanoid，不含易混淆字元 (0OIl)
 */
const nanoid = customAlphabet(
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
  16
);

/**
 * 生成公開分享 Token
 *
 * @param conversationId - Conversation ID
 * @param secret - 加密密鑰（從環境變數取得）
 * @returns 加密的 token 字串
 */
export async function generateShareToken(
  conversationId: string,
  secret: string
): Promise<string> {
  const randomPart = nanoid(); // 16 字元隨機字串
  const timestamp = Date.now().toString(36); // 時間戳轉 base36

  // 組合原始資料
  const rawData = `${conversationId}:${timestamp}:${randomPart}`;

  // 使用 Web Crypto API 生成 HMAC-SHA256 簽名
  const encoder = new TextEncoder();
  const data = encoder.encode(rawData);
  const keyData = encoder.encode(secret);

  // 匯入密鑰
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // 生成簽名
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, data);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signature = signatureArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);

  // 最終 token: {randomPart}-{timestamp}-{signature}
  return `${randomPart}-${timestamp}-${signature}`;
}

/**
 * 計算 Token 過期時間
 *
 * @param days - 有效天數（預設 7 天）
 * @returns Date 物件
 */
export function getTokenExpiry(days = 7): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}
