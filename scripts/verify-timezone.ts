/**
 * 驗證時區修復腳本
 * 檢查時區工具函式是否正確運作
 */

import {
	formatDateInTaipei,
	formatDateTimeInTaipei,
	formatTaiwanDate,
	getDateEndInTaipei,
	getDateStartInTaipei,
	getTodayEndInTaipei,
	getTodayStartInTaipei,
	isTodayInTaipei,
	nowInTaipei,
} from "../packages/shared/src/utils/timezone";

console.log("=== 時區工具函式驗證 ===\n");

// 1. 測試 nowInTaipei
const now = new Date();
const taipeiNow = nowInTaipei();
console.log("1. nowInTaipei() 測試");
console.log(`   當前 UTC 時間: ${now.toISOString()}`);
console.log(`   nowInTaipei():  ${taipeiNow.toISOString()}`);
console.log(
	`   差異: ${(taipeiNow.getTime() - now.getTime()) / (60 * 60 * 1000)} 小時`,
);
console.log("");

// 2. 測試格式化函式
console.log("2. 格式化函式測試");
console.log(`   formatDateInTaipei(now):     ${formatDateInTaipei(now)}`);
console.log(`   formatDateTimeInTaipei(now): ${formatDateTimeInTaipei(now)}`);
console.log(`   formatTaiwanDate(now):       ${formatTaiwanDate(now)}`);
console.log("");

// 3. 測試 getDateStartInTaipei / getDateEndInTaipei
const testDate = "2026-01-27";
const dateStart = getDateStartInTaipei(testDate);
const dateEnd = getDateEndInTaipei(testDate);
console.log(`3. ${testDate} 的時間範圍測試`);
console.log(`   getDateStartInTaipei("${testDate}"): ${dateStart.toISOString()}`);
console.log(`   getDateEndInTaipei("${testDate}"):   ${dateEnd.toISOString()}`);
console.log(`   預期: 2026-01-26T16:00:00.000Z ~ 2026-01-27T15:59:59.999Z`);
console.log(
	`   (因為 UTC+8 的 1/27 00:00 = UTC 的 1/26 16:00)`,
);
console.log("");

// 4. 測試 getTodayStartInTaipei / getTodayEndInTaipei
const todayStart = getTodayStartInTaipei();
const todayEnd = getTodayEndInTaipei();
console.log("4. 今天的時間範圍測試");
console.log(`   getTodayStartInTaipei(): ${todayStart.toISOString()}`);
console.log(`   getTodayEndInTaipei():   ${todayEnd.toISOString()}`);
console.log("");

// 5. 測試 isTodayInTaipei
console.log("5. isTodayInTaipei() 測試");
console.log(`   isTodayInTaipei(new Date()): ${isTodayInTaipei(new Date())}`);
console.log(`   isTodayInTaipei("2020-01-01"): ${isTodayInTaipei("2020-01-01")}`);
console.log("");

// 6. 模擬資料庫查詢邏輯
console.log("6. 模擬資料庫查詢邏輯");
console.log(`   假設 dueDate 存儲為: 2026-01-27T00:00:00.000Z (UTC)`);
const mockDueDate = new Date("2026-01-27T00:00:00.000Z");
console.log(`   這對應到 UTC+8 的日期是: ${formatTaiwanDate(mockDueDate)}`);

const isInRange =
	mockDueDate >= dateStart && mockDueDate <= dateEnd;
console.log(`   查詢 1/27 時是否會包含此待辦: ${isInRange ? "是" : "否"}`);

if (!isInRange) {
	console.log(`   原因: UTC 的 2026-01-27T00:00:00 = UTC+8 的 2026-01-27T08:00:00`);
	console.log(`         應該被包含在 1/27 的查詢範圍內`);
}

console.log("");
console.log("=== 驗證完成 ===");
