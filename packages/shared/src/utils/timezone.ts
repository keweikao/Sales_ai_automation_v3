/**
 * 時區工具函式
 * 統一使用 UTC+8 (Asia/Taipei) 時區
 */

// UTC+8 偏移量（毫秒）
const UTC_PLUS_8_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * 取得當前 UTC+8 時間
 */
export function nowInTaipei(): Date {
  const now = new Date();
  // 將 UTC 時間轉換為 UTC+8
  return new Date(now.getTime() + UTC_PLUS_8_OFFSET_MS);
}

/**
 * 將 Date 物件轉換為 UTC+8 時間
 */
export function toTaipeiTime(date: Date): Date {
  return new Date(date.getTime() + UTC_PLUS_8_OFFSET_MS);
}

/**
 * 取得 UTC+8 的今天開始時間 (00:00:00.000)
 * 返回的是 UTC 時間點，對應到 UTC+8 的今天 00:00
 */
export function getTodayStartInTaipei(): Date {
  // 先取得當前 UTC+8 的日期字串
  const taipeiNow = nowInTaipei();
  const year = taipeiNow.getUTCFullYear();
  const month = String(taipeiNow.getUTCMonth() + 1).padStart(2, "0");
  const day = String(taipeiNow.getUTCDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;
  // 使用 getDateStartInTaipei 取得正確的 UTC 時間點
  return getDateStartInTaipei(todayStr);
}

/**
 * 取得 UTC+8 的今天結束時間 (23:59:59.999)
 * 返回的是 UTC 時間點，對應到 UTC+8 的今天 23:59:59.999
 */
export function getTodayEndInTaipei(): Date {
  // 先取得當前 UTC+8 的日期字串
  const taipeiNow = nowInTaipei();
  const year = taipeiNow.getUTCFullYear();
  const month = String(taipeiNow.getUTCMonth() + 1).padStart(2, "0");
  const day = String(taipeiNow.getUTCDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;
  // 使用 getDateEndInTaipei 取得正確的 UTC 時間點
  return getDateEndInTaipei(todayStr);
}

/**
 * 取得特定日期在 UTC+8 的開始時間
 * @param dateStr - 日期字串 (格式: "yyyy-MM-dd")
 */
export function getDateStartInTaipei(dateStr: string): Date {
  // 將日期字串解析為 UTC+8 的 00:00:00
  // "2026-01-27" -> 2026-01-26T16:00:00.000Z (UTC+8 的 00:00)
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  // 減去 8 小時得到對應的 UTC 時間
  return new Date(date.getTime() - UTC_PLUS_8_OFFSET_MS);
}

/**
 * 取得特定日期在 UTC+8 的結束時間
 * @param dateStr - 日期字串 (格式: "yyyy-MM-dd")
 */
export function getDateEndInTaipei(dateStr: string): Date {
  // 將日期字串解析為 UTC+8 的 23:59:59.999
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  // 減去 8 小時得到對應的 UTC 時間
  return new Date(date.getTime() - UTC_PLUS_8_OFFSET_MS);
}

/**
 * 將 UTC 時間格式化為 UTC+8 的日期字串
 * @param date - Date 物件或 ISO 字串
 * @returns "yyyy-MM-dd" 格式的日期字串
 */
export function formatDateInTaipei(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const taipeiTime = toTaipeiTime(d);
  const year = taipeiTime.getUTCFullYear();
  const month = String(taipeiTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(taipeiTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 將 UTC 時間格式化為 UTC+8 的日期時間字串
 * @param date - Date 物件或 ISO 字串
 * @returns "yyyy-MM-dd HH:mm:ss" 格式的日期時間字串
 */
export function formatDateTimeInTaipei(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const taipeiTime = toTaipeiTime(d);
  const year = taipeiTime.getUTCFullYear();
  const month = String(taipeiTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(taipeiTime.getUTCDate()).padStart(2, "0");
  const hours = String(taipeiTime.getUTCHours()).padStart(2, "0");
  const minutes = String(taipeiTime.getUTCMinutes()).padStart(2, "0");
  const seconds = String(taipeiTime.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 取得 UTC+8 的星期幾
 * @param date - Date 物件或 ISO 字串
 * @returns 0-6 (日-六)
 */
export function getDayOfWeekInTaipei(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const taipeiTime = toTaipeiTime(d);
  return taipeiTime.getUTCDay();
}

/**
 * 格式化為台灣常用的日期顯示格式
 * @param date - Date 物件或 ISO 字串
 * @returns "M/d (週X)" 格式的字串
 */
export function formatTaiwanDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const taipeiTime = toTaipeiTime(d);
  const month = taipeiTime.getUTCMonth() + 1;
  const day = taipeiTime.getUTCDate();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekday = weekdays[taipeiTime.getUTCDay()];
  return `${month}/${day} (${weekday})`;
}

/**
 * 建立 UTC+8 時區的特定日期時間
 * @param year - 年份
 * @param month - 月份 (1-12)
 * @param day - 日期
 * @param hours - 小時 (0-23)
 * @param minutes - 分鐘 (0-59)
 * @param seconds - 秒 (0-59)
 * @returns Date 物件（UTC 時間）
 */
export function createTaipeiDate(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0
): Date {
  // 建立 UTC 時間，然後減去 8 小時
  const utcDate = new Date(
    Date.UTC(year, month - 1, day, hours, minutes, seconds)
  );
  return new Date(utcDate.getTime() - UTC_PLUS_8_OFFSET_MS);
}

/**
 * 檢查日期是否為今天（UTC+8）
 */
export function isTodayInTaipei(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDateInTaipei(d) === formatDateInTaipei(new Date());
}

/**
 * 檢查日期是否已過期（UTC+8）
 * @param date - 要檢查的日期
 * @returns 如果日期早於今天則返回 true
 */
export function isOverdueInTaipei(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const todayStart = getTodayStartInTaipei();
  // 將 todayStart 轉回 UTC 以進行比較
  const todayStartUTC = new Date(todayStart.getTime() - UTC_PLUS_8_OFFSET_MS);
  return d < todayStartUTC;
}
