/**
 * Follow-up Modal
 *
 * 讓業務在上傳音檔後設定 follow-up 待辦事項
 * 或標記客戶已拒絕
 */

export interface FollowUpModalData {
  conversationId: string;
  caseNumber: string;
  opportunityId?: string;
  opportunityName?: string;
}

/**
 * 建構 Follow-up Modal
 */
export function buildFollowUpModal(data: FollowUpModalData): object {
  const blocks: object[] = [
    // 案件資訊區塊
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*案件資訊*\n:clipboard: 案件編號：\`${data.caseNumber}\`${data.opportunityName ? `\n:briefcase: 商機：${data.opportunityName}` : ""}`,
      },
    },
    {
      type: "divider",
    },
    // 操作選擇（建立 Follow-up 或 客戶已拒絕）
    {
      type: "input",
      block_id: "action_block",
      label: {
        type: "plain_text",
        text: "選擇操作",
      },
      element: {
        type: "radio_buttons",
        action_id: "action_input",
        options: [
          {
            text: {
              type: "plain_text",
              text: "📅 建立 Follow-up 待辦",
            },
            value: "follow_up",
          },
          {
            text: {
              type: "plain_text",
              text: "👋 客戶已拒絕（結案）",
            },
            value: "reject",
          },
        ],
        initial_option: {
          text: {
            type: "plain_text",
            text: "📅 建立 Follow-up 待辦",
          },
          value: "follow_up",
        },
      },
    },
    {
      type: "divider",
    },
    // 標題：Follow-up 相關欄位
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*📅 Follow-up 設定*（如選擇建立 Follow-up）",
      },
    },
    // 天數選擇
    {
      type: "input",
      block_id: "days_block",
      optional: true,
      label: {
        type: "plain_text",
        text: "幾天後提醒",
      },
      element: {
        type: "static_select",
        action_id: "days_input",
        placeholder: {
          type: "plain_text",
          text: "選擇天數",
        },
        options: [
          { text: { type: "plain_text", text: "1 天後" }, value: "1" },
          { text: { type: "plain_text", text: "3 天後" }, value: "3" },
          { text: { type: "plain_text", text: "5 天後" }, value: "5" },
          { text: { type: "plain_text", text: "7 天後" }, value: "7" },
          { text: { type: "plain_text", text: "14 天後" }, value: "14" },
        ],
        initial_option: {
          text: { type: "plain_text", text: "3 天後" },
          value: "3",
        },
      },
    },
    // Follow 事項
    {
      type: "input",
      block_id: "title_block",
      optional: true,
      label: {
        type: "plain_text",
        text: "Follow 事項",
      },
      element: {
        type: "plain_text_input",
        action_id: "title_input",
        placeholder: {
          type: "plain_text",
          text: "例如：確認客戶試用狀況、跟進報價單",
        },
      },
      hint: {
        type: "plain_text",
        text: "簡短描述要 follow 的事項",
      },
    },
    // 詳細描述（選填）
    {
      type: "input",
      block_id: "description_block",
      optional: true,
      label: {
        type: "plain_text",
        text: "詳細描述",
      },
      element: {
        type: "plain_text_input",
        action_id: "description_input",
        multiline: true,
        placeholder: {
          type: "plain_text",
          text: "補充說明（選填）",
        },
      },
    },
    {
      type: "divider",
    },
    // 標題：拒絕相關欄位
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*👋 拒絕設定*（如選擇客戶已拒絕）",
      },
    },
    // 拒絕原因
    {
      type: "input",
      block_id: "reject_reason_block",
      optional: true,
      label: {
        type: "plain_text",
        text: "拒絕原因",
      },
      element: {
        type: "plain_text_input",
        action_id: "reject_reason_input",
        placeholder: {
          type: "plain_text",
          text: "例如：預算不足、選擇競品、時機不對",
        },
      },
      hint: {
        type: "plain_text",
        text: "記錄客戶拒絕的原因，以利後續分析",
      },
    },
    // 競品資訊（選填）
    {
      type: "input",
      block_id: "competitor_block",
      optional: true,
      label: {
        type: "plain_text",
        text: "競品資訊",
      },
      element: {
        type: "plain_text_input",
        action_id: "competitor_input",
        placeholder: {
          type: "plain_text",
          text: "客戶選擇的競品（選填）",
        },
      },
    },
  ];

  return {
    type: "modal",
    callback_id: "follow_up_form",
    private_metadata: JSON.stringify({
      conversationId: data.conversationId,
      caseNumber: data.caseNumber,
      opportunityId: data.opportunityId,
      opportunityName: data.opportunityName,
    }),
    title: {
      type: "plain_text",
      text: "後續處理",
    },
    submit: {
      type: "plain_text",
      text: "確認送出",
    },
    close: {
      type: "plain_text",
      text: "取消",
    },
    blocks,
  };
}

export type FollowUpAction = "follow_up" | "reject";

export interface ParsedFollowUpFormValues {
  action: FollowUpAction;
  // Follow-up 欄位
  days?: number;
  title?: string;
  description?: string;
  // Reject 欄位
  rejectReason?: string;
  competitor?: string;
}

/**
 * 解析 Follow-up 表單值
 */
export function parseFollowUpFormValues(
  values: Record<
    string,
    Record<
      string,
      {
        value?: string;
        selected_option?: { value: string };
      }
    >
  >
): ParsedFollowUpFormValues {
  const action =
    (values.action_block?.action_input?.selected_option
      ?.value as FollowUpAction) || "follow_up";

  const days = Number.parseInt(
    values.days_block?.days_input?.selected_option?.value || "3",
    10
  );
  const title = values.title_block?.title_input?.value || "";
  const description = values.description_block?.description_input?.value;
  const rejectReason = values.reject_reason_block?.reject_reason_input?.value;
  const competitor = values.competitor_block?.competitor_input?.value;

  return {
    action,
    days,
    title: title || undefined,
    description: description || undefined,
    rejectReason: rejectReason || undefined,
    competitor: competitor || undefined,
  };
}
