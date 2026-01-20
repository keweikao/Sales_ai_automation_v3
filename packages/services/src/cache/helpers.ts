import type { CacheService, ConversationDetail } from "./types";

/**
 * 更新單筆 Conversation 詳細資料快取 (Layer 1)
 * 直接寫入,無並發問題
 */
export async function updateConversationDetailCache(
  cache: CacheService,
  conversationId: string,
  detail: ConversationDetail
): Promise<void> {
  const cacheKey = `conversation:${conversationId}:detail`;
  await cache.set(cacheKey, detail, 86_400); // 24 小時
  console.log(`[Cache] Updated conversation detail: ${conversationId}`);
}

/**
 * 失效用戶的 Conversations 列表快取 (Layer 2)
 * 採用 Invalidation-First 策略,避免並發寫入問題
 *
 * 策略說明:
 * - 不直接更新列表快取,而是刪除快取
 * - 下次 API 請求時會重新從資料庫查詢並建立快取
 * - 避免多個 Queue Worker 同時寫入造成資料覆蓋
 */
export async function invalidateConversationsListCache(
  cache: CacheService,
  userId: string
): Promise<void> {
  const keys = [
    `user:${userId}:conversations:list`,
    `user:${userId}:analytics:dashboard`,
  ];
  await cache.deleteMultiple(keys);
  console.log(
    `[Cache] Invalidated conversations list cache for user: ${userId}`
  );
}

/**
 * 組合函數: 更新單筆 + 失效列表
 * Queue Worker 應該使用這個函數
 */
export async function updateConversationCache(
  cache: CacheService,
  userId: string,
  conversationId: string,
  detail: ConversationDetail
): Promise<void> {
  // 1. 更新單筆詳細資料 (Layer 1)
  await updateConversationDetailCache(cache, conversationId, detail);

  // 2. 失效列表快取 (Layer 2)
  await invalidateConversationsListCache(cache, userId);

  console.log(`[Cache] Updated cache for conversation: ${conversationId}`);
}
