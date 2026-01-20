/**
 * EVERY8D SMS 服務整合
 * API 文件: https://www.every8d.com/api
 */

export interface SendSMSParams {
  phoneNumber: string; // 收件人電話號碼
  message: string; // 簡訊內容
  subject?: string; // 簡訊主旨（選填）
}

export interface SendSMSResponse {
  success: boolean;
  statusCode: string;
  statusMessage: string;
  credit: number; // 發送成本
  creditAfter: number; // 剩餘點數
  messageId?: string; // 訊息 ID
  errorDetails?: string;
}

/**
 * 發送 SMS
 */
export async function sendSMS(
  params: SendSMSParams,
  config: {
    apiUrl: string;
    username: string;
    password: string;
  }
): Promise<SendSMSResponse> {
  const { phoneNumber, message, subject } = params;
  const { apiUrl, username, password } = config;

  try {
    // 建立 EVERY8D API 請求
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        UID: username,
        PWD: password,
        SB: subject || "iCHEF",
        MSG: message,
        DEST: phoneNumber,
        ST: "", // 預約時間（空值表示立即發送）
      }),
    });

    const result = await response.text();

    // 解析 EVERY8D 回應
    // 格式: "credit,sended,cost,unsend,batch_id"
    // 範例: "99.5,1,0.5,0,1234567890"
    const parts = result.split(",");

    if (parts.length >= 5) {
      const [creditAfter, sended, cost, _unsend, batchId] = parts;

      return {
        success: Number(sended) > 0,
        statusCode: Number(sended) > 0 ? "SUCCESS" : "FAILED",
        statusMessage: Number(sended) > 0 ? "發送成功" : "發送失敗",
        credit: Number(cost),
        creditAfter: Number(creditAfter),
        messageId: batchId,
      };
    }

    // 錯誤格式
    return {
      success: false,
      statusCode: "ERROR",
      statusMessage: "EVERY8D API 回應格式錯誤",
      credit: 0,
      creditAfter: 0,
      errorDetails: result,
    };
  } catch (error) {
    return {
      success: false,
      statusCode: "NETWORK_ERROR",
      statusMessage: "網路錯誤",
      credit: 0,
      creditAfter: 0,
      errorDetails: String(error),
    };
  }
}

/**
 * 生成客戶 SMS 內容
 */
export function generateCustomerSMSContent(data: {
  companyName: string;
  caseNumber: string;
  meddicScore: number;
  shareUrl: string;
}): string {
  const { companyName, caseNumber, meddicScore, shareUrl } = data;

  return `【iCHEF】${companyName} 您好，您的銷售對話分析已完成！

案件編號: ${caseNumber}
MEDDIC 分數: ${meddicScore}/100

查看完整報告:
${shareUrl}

如有疑問請聯繫您的業務專員。`;
}
