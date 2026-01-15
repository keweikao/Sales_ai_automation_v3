/**
 * 常用分析查詢模板
 * 提供預定義的 SQL 查詢範本，用於團隊績效、業務個人表現、商機漏斗和 MEDDIC 趨勢分析
 */

export const ANALYTICS_QUERIES = {
  /**
   * 團隊績效統計
   * @param period - 統計週期：week, month, quarter
   */
  teamPerformance: (period: "week" | "month" | "quarter") => `
    SELECT
      COUNT(DISTINCT c.id) as total_conversations,
      AVG(m.overall_score) as avg_meddic_score,
      COUNT(DISTINCT CASE WHEN o.stage = 'closed_won' THEN o.id END) as deals_closed,
      AVG(o.value) as avg_deal_value,
      COUNT(DISTINCT c.user_id) as active_reps
    FROM conversations c
    LEFT JOIN meddic_analyses m ON c.id = m.conversation_id
    LEFT JOIN opportunities o ON c.opportunity_id = o.id
    WHERE c.created_at >= NOW() - INTERVAL '1 ${period}'
      AND c.status = 'completed'
  `,

  /**
   * 業務個人績效
   * @param repId - 業務代表 ID
   * @param period - 統計週期（例如：'1 month', '1 week'）
   */
  repPerformance: (repId: string, period: string) => `
    SELECT
      u.id as rep_id,
      u.name as rep_name,
      COUNT(c.id) as conversation_count,
      AVG(m.overall_score) as avg_score,
      AVG(m.metrics_score) as avg_metrics_score,
      AVG(m.economic_buyer_score) as avg_economic_buyer_score,
      AVG(m.decision_criteria_score) as avg_decision_criteria_score,
      AVG(m.decision_process_score) as avg_decision_process_score,
      AVG(m.identify_pain_score) as avg_identify_pain_score,
      AVG(m.champion_score) as avg_champion_score,
      COUNT(DISTINCT o.id) as opportunities_count,
      COUNT(DISTINCT CASE WHEN o.stage = 'closed_won' THEN o.id END) as deals_won
    FROM users u
    LEFT JOIN conversations c ON u.id = c.user_id
    LEFT JOIN meddic_analyses m ON c.id = m.conversation_id
    LEFT JOIN opportunities o ON c.opportunity_id = o.id
    WHERE u.id = '${repId}'
      AND c.created_at >= NOW() - INTERVAL '${period}'
      AND c.status = 'completed'
    GROUP BY u.id, u.name
  `,

  /**
   * 商機漏斗分析
   * 顯示各階段的商機數量、總價值和平均 MEDDIC 評分
   */
  opportunityFunnel: () => `
    SELECT
      o.stage,
      COUNT(DISTINCT o.id) as count,
      SUM(o.value) as total_value,
      AVG(o.value) as avg_value,
      AVG(m.overall_score) as avg_meddic_score,
      COUNT(DISTINCT c.id) as conversations_count
    FROM opportunities o
    LEFT JOIN conversations c ON o.id = c.opportunity_id
    LEFT JOIN meddic_analyses m ON c.id = m.conversation_id
    WHERE c.status = 'completed'
    GROUP BY o.stage
    ORDER BY
      CASE o.stage
        WHEN 'prospecting' THEN 1
        WHEN 'qualification' THEN 2
        WHEN 'proposal' THEN 3
        WHEN 'negotiation' THEN 4
        WHEN 'closed_won' THEN 5
        WHEN 'closed_lost' THEN 6
        ELSE 7
      END
  `,

  /**
   * MEDDIC 評分趨勢
   * @param opportunityId - 商機 ID
   */
  meddicTrend: (opportunityId: string) => `
    SELECT
      c.id as conversation_id,
      c.created_at,
      c.case_number,
      m.overall_score,
      m.qualification_status,
      m.metrics_score,
      m.economic_buyer_score,
      m.decision_criteria_score,
      m.decision_process_score,
      m.identify_pain_score,
      m.champion_score
    FROM conversations c
    JOIN meddic_analyses m ON c.id = m.conversation_id
    WHERE c.opportunity_id = '${opportunityId}'
      AND c.status = 'completed'
    ORDER BY c.created_at ASC
  `,

  /**
   * 最近的警示列表
   * @param limit - 返回數量限制
   */
  recentAlerts: (limit = 50) => `
    SELECT
      a.id,
      a.conversation_id,
      a.opportunity_id,
      a.alert_type,
      a.severity,
      a.message,
      a.created_at,
      c.case_number,
      u.name as rep_name
    FROM alerts a
    LEFT JOIN conversations c ON a.conversation_id = c.id
    LEFT JOIN users u ON c.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ${limit}
  `,

  /**
   * 低評分商機列表
   * @param threshold - 評分閾值（預設 60）
   */
  lowScoreOpportunities: (threshold = 60) => `
    SELECT
      o.id as opportunity_id,
      o.name as opportunity_name,
      o.stage,
      o.value,
      c.id as latest_conversation_id,
      c.case_number,
      c.created_at as last_analyzed_at,
      m.overall_score,
      m.qualification_status,
      u.name as rep_name
    FROM opportunities o
    JOIN LATERAL (
      SELECT id, case_number, created_at, user_id, opportunity_id
      FROM conversations
      WHERE opportunity_id = o.id AND status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    ) c ON TRUE
    JOIN meddic_analyses m ON c.id = m.conversation_id
    LEFT JOIN users u ON c.user_id = u.id
    WHERE m.overall_score < ${threshold}
      AND o.stage NOT IN ('closed_won', 'closed_lost')
    ORDER BY m.overall_score ASC, o.value DESC
  `,

  /**
   * 轉錄任務狀態統計
   */
  transcriptionStats: () => `
    SELECT
      status,
      COUNT(*) as count,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time_seconds
    FROM conversations
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY status
    ORDER BY count DESC
  `,

  /**
   * 資料庫健康檢查 - 孤立記錄
   */
  orphanedRecords: () => `
    SELECT
      'conversations_without_users' as check_type,
      COUNT(*) as count
    FROM conversations c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE u.id IS NULL AND c.user_id IS NOT NULL

    UNION ALL

    SELECT
      'analyses_without_conversations' as check_type,
      COUNT(*) as count
    FROM meddic_analyses m
    LEFT JOIN conversations c ON m.conversation_id = c.id
    WHERE c.id IS NULL

    UNION ALL

    SELECT
      'alerts_without_conversations' as check_type,
      COUNT(*) as count
    FROM alerts a
    LEFT JOIN conversations c ON a.conversation_id = c.id
    WHERE c.id IS NULL AND a.conversation_id IS NOT NULL
  `,
};

/**
 * 查詢建構器輔助函數
 */
export const QueryBuilder = {
  /**
   * 建構日期範圍條件
   */
  dateRange: (field: string, days: number) =>
    `${field} >= NOW() - INTERVAL '${days} days'`,

  /**
   * 建構分頁條件
   */
  pagination: (page: number, pageSize: number) =>
    `LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,

  /**
   * 建構排序條件
   */
  orderBy: (field: string, direction: "ASC" | "DESC" = "DESC") =>
    `ORDER BY ${field} ${direction}`,
};
