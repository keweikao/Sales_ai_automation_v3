/**
 * SMS 整合測試腳本
 * 測試完整的 SMS 發送流程
 */

import { sendSMS } from "./packages/services/src/sms/every8d";

async function testSMSIntegration() {
  console.log("🧪 開始測試 SMS 整合...\n");

  // 測試參數
  const testPhoneNumber = "0912345678"; // 請替換為實際測試電話
  const testMessage = `【iCHEF】測試公司 您好，您的銷售對話分析已完成!

案件編號: 202601-TEST001
MEDDIC 分數: 85/100

查看完整報告:
https://example.com/share/test-token

如有疑問請聯繫您的業務專員。`;

  // 測試配置 (需要實際的 EVERY8D 憑證)
  const config = {
    apiUrl:
      process.env.EVERY8D_API_URL ||
      "https://oms.every8d.com/API21/HTTP/sendSMS.ashx",
    username: process.env.EVERY8D_USERNAME || "",
    password: process.env.EVERY8D_PASSWORD || "",
  };

  // 檢查環境變數
  if (!(config.username && config.password)) {
    console.log("⚠️  警告: 未設定 EVERY8D 憑證");
    console.log("請設定以下環境變數:");
    console.log("- EVERY8D_USERNAME");
    console.log("- EVERY8D_PASSWORD");
    console.log("\n跳過實際發送測試\n");
    return;
  }

  console.log("📱 發送測試簡訊...");
  console.log(`目標號碼: ${testPhoneNumber}`);
  console.log(`訊息內容:\n${testMessage}\n`);

  try {
    const result = await sendSMS(
      {
        phoneNumber: testPhoneNumber,
        message: testMessage,
        subject: "iCHEF",
      },
      config
    );

    console.log("📊 發送結果:");
    console.log(`  狀態: ${result.success ? "✅ 成功" : "❌ 失敗"}`);
    console.log(`  狀態碼: ${result.statusCode}`);
    console.log(`  狀態訊息: ${result.statusMessage}`);
    console.log(`  發送成本: ${result.credit} 點`);
    console.log(`  剩餘點數: ${result.creditAfter} 點`);
    if (result.messageId) {
      console.log(`  訊息 ID: ${result.messageId}`);
    }
    if (result.errorDetails) {
      console.log(`  錯誤詳情: ${result.errorDetails}`);
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error);
  }
}

// 執行測試
testSMSIntegration();
