/**
 * Slack 通知服務類型定義
 */

import type { KnownBlock } from "@slack/web-api";

/**
 * MEDDIC 分析結果 (簡化版,用於通知)
 */
export interface MEDDICAnalysisResult {
  overallScore: number;
  qualificationStatus: string;
  dimensions?: Record<
    string,
    {
      name: string;
      score: number;
      evidence?: string[];
      gaps?: string[];
      recommendations?: string[];
    }
  >;
  keyFindings?: string[];
  nextSteps?: Array<{
    action: string;
    priority: string;
    owner: string;
  }>;
  risks?: Array<{
    risk: string;
    severity: string;
    mitigation?: string;
  }>; // 風險列表 (含嚴重程度和緩解措施)
  alerts?: string[]; // 新增: 高優先級警報列表 (從 Agent 6, Agent 2, dimensions 提取)
  painPoints?: string[]; // 新增: 客戶痛點列表 (從 Agent 4 markdown 提取)
  summary?: string; // 新增: Agent 4 生成的 markdown 摘要
  smsText?: string; // 新增: Agent 4 生成的 SMS 文字
  contactPhone?: string; // 新增: 客戶電話 (用於發送簡訊)
}

/**
 * Slack 通知配置
 */
export interface SlackNotificationConfig {
  token: string;
  defaultChannel?: string;
}

/**
 * 處理開始通知參數
 */
export interface ProcessingStartedParams {
  userId: string;
  fileName: string;
  fileSize: number;
  conversationId: string;
  caseNumber?: string;
}

/**
 * 處理完成通知參數
 */
export interface ProcessingCompletedParams {
  userId: string;
  conversationId: string;
  caseNumber: string;
  analysisResult: MEDDICAnalysisResult;
  processingTimeMs: number;
  threadTs?: string; // Slack thread timestamp (用於回覆在同一個 thread 內)
}

/**
 * 處理失敗通知參數
 */
export interface ProcessingFailedParams {
  userId: string;
  fileName: string;
  errorMessage: string;
  conversationId?: string;
  caseNumber?: string;
  retryCount?: number;
  threadTs?: string; // Slack thread timestamp (用於回覆在同一個 thread 內)
}

/**
 * Slack 通知服務介面
 */
export interface SlackNotificationService {
  /**
   * 發送處理開始通知
   * @returns 訊息的 thread_ts (用於後續回覆)
   */
  notifyProcessingStarted(params: ProcessingStartedParams): Promise<string>;

  /**
   * 發送處理完成通知
   */
  notifyProcessingCompleted(params: ProcessingCompletedParams): Promise<void>;

  /**
   * 發送處理失敗通知
   */
  notifyProcessingFailed(params: ProcessingFailedParams): Promise<void>;

  /**
   * 發送自訂訊息
   */
  sendCustomMessage(
    channel: string,
    blocks: KnownBlock[],
    fallbackText: string,
    threadTs?: string
  ): Promise<string>;
}
