/**
 * Ops Module Types
 * Routine Operations Agent 的核心類型定義
 */

// ============================================================
// Health Check Results
// ============================================================

/**
 * 健康檢查狀態
 */
export type HealthStatus = "healthy" | "degraded" | "critical";

/**
 * 健康檢查結果
 */
export interface OpsCheckResult {
  /** 檢查工具名稱 */
  toolName: string;
  /** 健康狀態 */
  status: HealthStatus;
  /** 檢查時間戳 */
  timestamp: Date;
  /** 詳細訊息 */
  details?: string;
  /** 效能指標 */
  metrics?: Record<string, number>;
}

// ============================================================
// Repair Results
// ============================================================

/**
 * 修復結果
 */
export interface OpsRepairResult {
  /** 修復工具名稱 */
  toolName: string;
  /** 修復是否成功 */
  success: boolean;
  /** 修復詳細訊息 */
  details: string;
  /** 修復執行時間（毫秒） */
  executionTimeMs?: number;
}

// ============================================================
// Orchestrator Types
// ============================================================

/**
 * Ops Orchestrator 選項
 */
export interface OpsOrchestratorOptions {
  /** 是否啟用並行檢查 */
  enableParallelChecks?: boolean;
  /** 是否自動修復 */
  enableAutoRepair?: boolean;
  /** 檢查超時時間（毫秒） */
  checkTimeoutMs?: number;
  /** 修復超時時間（毫秒） */
  repairTimeoutMs?: number;
}

/**
 * Ops 執行摘要
 */
export interface OpsExecutionSummary {
  /** 執行時間戳 */
  timestamp: Date;
  /** 總執行時間（毫秒） */
  totalTimeMs: number;
  /** 檢查結果 */
  checkResults: OpsCheckResult[];
  /** 修復結果 */
  repairResults: OpsRepairResult[];
  /** 健康的檢查數量 */
  healthyCount: number;
  /** 降級的檢查數量 */
  degradedCount: number;
  /** 嚴重的檢查數量 */
  criticalCount: number;
  /** 修復成功數量 */
  repairSuccessCount: number;
  /** 修復失敗數量 */
  repairFailureCount: number;
}

// ============================================================
// Tool Mapping
// ============================================================

/**
 * 檢查工具到修復工具的映射
 */
export interface CheckToRepairMapping {
  /** 檢查工具名稱 */
  checkTool: string;
  /** 對應的修復工具名稱 */
  repairTool: string;
  /** 觸發修復的最低狀態 (預設: "degraded") */
  triggerOnStatus?: HealthStatus;
}
