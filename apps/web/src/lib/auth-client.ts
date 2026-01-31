import { createAuthClient } from "better-auth/react";

// 使用同域 proxy (/api/auth/*) 來避免跨域 OAuth cookie 問題
// Pages Function 會將請求轉發到 server
export const authClient = createAuthClient({
  // 不指定 baseURL，使用當前域
});
