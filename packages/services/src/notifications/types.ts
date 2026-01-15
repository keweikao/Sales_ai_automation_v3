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
  risks?: string[];
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
}

/**
 * Slack 通知服務介面
 */
export interface SlackNotificationService {
  /**
   * 發送處理開始通知
   */
  notifyProcessingStarted(params: ProcessingStartedParams): Promise<void>;

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
    fallbackText: string
  ): Promise<void>;
}
