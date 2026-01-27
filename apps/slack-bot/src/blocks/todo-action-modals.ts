/**
 * Todo Action Modals
 * 成交、拒絕、完成並建立下一個的 Modal
 */

export interface TodoActionModalData {
  todoId: string;
  todoTitle: string;
  opportunityId?: string;
  customerNumber?: string;
  companyName?: string;
}

/**
 * 成交 Modal
 */
export function buildWinTodoModal(data: TodoActionModalData): object {
  const customerInfo =
    data.customerNumber || data.companyName
      ? `${data.customerNumber || ""} ${data.companyName || ""}`.trim()
      : "無客戶資訊";

  return {
    type: "modal",
    callback_id: "win_todo_form",
    private_metadata: JSON.stringify(data),
    title: { type: "plain_text", text: "恭喜成交" },
    submit: { type: "plain_text", text: "確認成交" },
    close: { type: "plain_text", text: "取消" },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*客戶資訊*\n${customerInfo}\n\n*待辦事項*\n${data.todoTitle}`,
        },
      },
      { type: "divider" },
      {
        type: "input",
        block_id: "payment_date_block",
        optional: true,
        label: { type: "plain_text", text: "預計付款日期" },
        element: {
          type: "datepicker",
          action_id: "payment_date",
          placeholder: { type: "plain_text", text: "選擇日期" },
        },
      },
      {
        type: "input",
        block_id: "amount_block",
        optional: true,
        label: { type: "plain_text", text: "成交金額" },
        element: {
          type: "plain_text_input",
          action_id: "amount",
          placeholder: { type: "plain_text", text: "例如：50000" },
        },
      },
      {
        type: "input",
        block_id: "note_block",
        optional: true,
        label: { type: "plain_text", text: "備註" },
        element: {
          type: "plain_text_input",
          action_id: "note",
          multiline: true,
          placeholder: { type: "plain_text", text: "成交備註（選填）" },
        },
      },
    ],
  };
}

/**
 * 拒絕 Modal
 */
export function buildLoseTodoModal(data: TodoActionModalData): object {
  const customerInfo =
    data.customerNumber || data.companyName
      ? `${data.customerNumber || ""} ${data.companyName || ""}`.trim()
      : "無客戶資訊";

  return {
    type: "modal",
    callback_id: "lose_todo_form",
    private_metadata: JSON.stringify(data),
    title: { type: "plain_text", text: "記錄拒絕" },
    submit: { type: "plain_text", text: "確認記錄" },
    close: { type: "plain_text", text: "取消" },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*客戶資訊*\n${customerInfo}\n\n*待辦事項*\n${data.todoTitle}`,
        },
      },
      { type: "divider" },
      {
        type: "input",
        block_id: "reason_block",
        label: { type: "plain_text", text: "拒絕原因" },
        element: {
          type: "plain_text_input",
          action_id: "reason",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "例如：預算不足、選擇競品、暫無需求",
          },
        },
      },
      {
        type: "input",
        block_id: "competitor_block",
        optional: true,
        label: { type: "plain_text", text: "競品" },
        element: {
          type: "plain_text_input",
          action_id: "competitor",
          placeholder: {
            type: "plain_text",
            text: "若客戶選擇競品，請填寫（選填）",
          },
        },
      },
      {
        type: "input",
        block_id: "note_block",
        optional: true,
        label: { type: "plain_text", text: "備註" },
        element: {
          type: "plain_text_input",
          action_id: "note",
          multiline: true,
          placeholder: { type: "plain_text", text: "其他備註（選填）" },
        },
      },
    ],
  };
}

/**
 * 完成並建立下一個 Modal
 */
export function buildCompleteAndNextModal(data: TodoActionModalData): object {
  const customerInfo =
    data.customerNumber || data.companyName
      ? `${data.customerNumber || ""} ${data.companyName || ""}`.trim()
      : "無客戶資訊";

  return {
    type: "modal",
    callback_id: "complete_and_next_todo_form",
    private_metadata: JSON.stringify(data),
    title: { type: "plain_text", text: "完成並建立下一個" },
    submit: { type: "plain_text", text: "完成並建立" },
    close: { type: "plain_text", text: "取消" },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*當前待辦*\n[${customerInfo}] ${data.todoTitle}`,
        },
      },
      { type: "divider" },
      {
        type: "input",
        block_id: "completion_note_block",
        label: { type: "plain_text", text: "完成備註" },
        element: {
          type: "plain_text_input",
          action_id: "completion_note",
          multiline: true,
          placeholder: { type: "plain_text", text: "請描述執行結果..." },
        },
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*建立下一個待辦* (自動帶入客戶資訊)",
        },
      },
      {
        type: "input",
        block_id: "next_title_block",
        label: { type: "plain_text", text: "Follow 事項" },
        element: {
          type: "plain_text_input",
          action_id: "next_title",
          placeholder: {
            type: "plain_text",
            text: "例如：確認客戶試用狀況、跟進報價單",
          },
        },
      },
      {
        type: "input",
        block_id: "next_days_block",
        label: { type: "plain_text", text: "幾天後提醒" },
        element: {
          type: "static_select",
          action_id: "next_days",
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
      {
        type: "input",
        block_id: "next_description_block",
        optional: true,
        label: { type: "plain_text", text: "詳細描述" },
        element: {
          type: "plain_text_input",
          action_id: "next_description",
          multiline: true,
          placeholder: { type: "plain_text", text: "補充說明（選填）" },
        },
      },
    ],
  };
}

/**
 * 解析成交表單
 */
export function parseWinTodoFormValues(
  values: Record<
    string,
    Record<string, { value?: string; selected_date?: string }>
  >
): {
  paymentDate?: string;
  amount?: number;
  note?: string;
} {
  const paymentDate = values.payment_date_block?.payment_date?.selected_date;
  const amountStr = values.amount_block?.amount?.value;
  const note = values.note_block?.note?.value;

  return {
    paymentDate,
    amount: amountStr ? Number.parseInt(amountStr, 10) : undefined,
    note: note || undefined,
  };
}

/**
 * 解析拒絕表單
 */
export function parseLoseTodoFormValues(
  values: Record<string, Record<string, { value?: string }>>
): {
  reason: string;
  competitor?: string;
  note?: string;
} {
  const reason = values.reason_block?.reason?.value || "";
  const competitor = values.competitor_block?.competitor?.value;
  const note = values.note_block?.note?.value;

  return {
    reason,
    competitor: competitor || undefined,
    note: note || undefined,
  };
}

/**
 * 解析完成並建立下一個表單
 */
export function parseCompleteAndNextFormValues(
  values: Record<
    string,
    Record<string, { value?: string; selected_option?: { value: string } }>
  >
): {
  completionNote: string;
  nextTitle: string;
  nextDays: number;
  nextDescription?: string;
} {
  const completionNote =
    values.completion_note_block?.completion_note?.value || "";
  const nextTitle = values.next_title_block?.next_title?.value || "";
  const nextDays = Number.parseInt(
    values.next_days_block?.next_days?.selected_option?.value || "3",
    10
  );
  const nextDescription =
    values.next_description_block?.next_description?.value;

  return {
    completionNote,
    nextTitle,
    nextDays,
    nextDescription: nextDescription || undefined,
  };
}
