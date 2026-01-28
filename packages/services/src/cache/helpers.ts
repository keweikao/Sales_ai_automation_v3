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

// ============================================================
// Opportunities Cache Helpers
// ============================================================

/**
 * 失效機會列表快取
 * 採用 Invalidation-First 策略
 *
 * @param cache CacheService 實例
 * @param userId 用戶 ID（用於個人快取）
 * @param opportunityId 可選，機會 ID（用於失效詳情快取）
 */
export async function invalidateOpportunitiesCache(
  cache: CacheService,
  userId: string,
  opportunityId?: string
): Promise<void> {
  const keys = [
    // 個人列表快取
    `user:${userId}:opportunities:list:active`,
    `user:${userId}:opportunities:list:won`,
    `user:${userId}:opportunities:list:lost`,
    // 管理員共用列表快取
    "admin:opportunities:list:active",
    "admin:opportunities:list:won",
    "admin:opportunities:list:lost",
    // 主管列表快取（失效所有產品線）
    "manager:ichef:opportunities:list:active",
    "manager:ichef:opportunities:list:won",
    "manager:ichef:opportunities:list:lost",
    "manager:beauty:opportunities:list:active",
    "manager:beauty:opportunities:list:won",
    "manager:beauty:opportunities:list:lost",
    // 相關的 analytics 快取
    `user:${userId}:analytics:dashboard`,
  ];

  if (opportunityId) {
    keys.push(`opportunity:${opportunityId}:detail`);
  }

  await cache.deleteMultiple(keys);
  console.log(
    `[Cache] Invalidated opportunities cache for user: ${userId}${opportunityId ? `, opportunity: ${opportunityId}` : ""}`
  );
}
