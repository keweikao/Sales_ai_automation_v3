/**
 * 使用 HeadObject 檢查 R2 檔案大小（不下載整個檔案）
 */
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: "https://2b14cb05a60d60ad55427f4dd7570b90.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "78ffdd5460e7b0336a62b44bc00f90dc",
    secretAccessKey: "255e6da0ab3ad565a43e40215856f12faf121792e0cb8516d825589f685cc917",
  },
});

async function checkFileSize(key: string, durationSeconds?: number) {
  console.log(`🔍 檢查 R2 檔案: ${key}\n`);

  try {
    const command = new HeadObjectCommand({
      Bucket: "sales-ai-audio-files",
      Key: key,
    });

    const response = await client.send(command);
    const sizeBytes = response.ContentLength || 0;
    const sizeMB = sizeBytes / 1024 / 1024;

    console.log(`📏 Size: ${sizeBytes.toLocaleString()} bytes (${sizeMB.toFixed(2)} MB)`);
    console.log(`📦 Content-Type: ${response.ContentType}`);
    console.log(`📅 Last Modified: ${response.LastModified}`);
    console.log(`\n🗜️  需要 Lambda 壓縮: ${sizeMB > 25 ? "✅ 是 (>25MB)" : "❌ 否 (≤25MB)"}`);

    if (durationSeconds) {
      const bitrateKbps = (sizeBytes * 8) / durationSeconds / 1000;
      console.log(`🎵 估算比特率: ${bitrateKbps.toFixed(0)} kbps`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// 從命令列參數獲取 key，或使用預設值
const key = process.argv[2] || "audio/ba083750-7064-404d-a026-a06d15917568/1769484067879/1769484067879.mp3";
const duration = process.argv[3] ? parseInt(process.argv[3]) : 77 * 60 + 28; // 預設 IC920 的長度

checkFileSize(key, duration);
