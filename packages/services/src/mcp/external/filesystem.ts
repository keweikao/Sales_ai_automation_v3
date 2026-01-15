/**
 * Filesystem MCP Tools
 * 提供檔案系統讀寫功能，用於報表生成、日誌記錄等
 * 安全性：僅允許存取特定目錄 (.doc/, reports/, logs/)
 */

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { z } from "zod";
import type { MCPTool } from "../types.js";

// 安全性：允許存取的目錄白名單
const ALLOWED_DIRECTORIES = [".doc", "reports", "logs"];

/**
 * 驗證路徑是否在允許的目錄內
 */
function validatePath(filePath: string): { valid: boolean; error?: string } {
  const normalizedPath = resolve(filePath);
  const projectRoot = process.cwd();

  // 檢查是否在專案目錄內
  const relativePath = relative(projectRoot, normalizedPath);
  if (relativePath.startsWith("..")) {
    return {
      valid: false,
      error: "Access denied: Path is outside project directory",
    };
  }

  // 檢查是否在允許的目錄內
  const isAllowed = ALLOWED_DIRECTORIES.some((dir) =>
    relativePath.startsWith(dir)
  );
  if (!isAllowed) {
    return {
      valid: false,
      error: `Access denied: Only ${ALLOWED_DIRECTORIES.join(", ")} directories are allowed`,
    };
  }

  return { valid: true };
}

// ============================================================
// Filesystem Read Tool
// ============================================================

const FilesystemReadInputSchema = z.object({
  path: z.string().min(1, "Path is required"),
  encoding: z.enum(["utf-8", "base64"]).default("utf-8"),
});

const FilesystemReadOutputSchema = z.object({
  content: z.string(),
  size: z.number(),
  path: z.string(),
});

type FilesystemReadInput = z.infer<typeof FilesystemReadInputSchema>;
type FilesystemReadOutput = z.infer<typeof FilesystemReadOutputSchema>;

export const filesystemReadTool: MCPTool<
  FilesystemReadInput,
  FilesystemReadOutput
> = {
  name: "filesystem_read",
  description: "讀取檔案內容。僅允許讀取 .doc/, reports/, logs/ 目錄中的檔案。",
  inputSchema: FilesystemReadInputSchema,
  handler: async (input) => {
    const validation = validatePath(input.path);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      const absolutePath = resolve(input.path);
      const content = await readFile(absolutePath, input.encoding);
      const stats = await stat(absolutePath);

      return {
        content: content.toString(),
        size: stats.size,
        path: input.path,
      };
    } catch (error) {
      throw new Error(
        `Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
};

// ============================================================
// Filesystem Write Tool
// ============================================================

const FilesystemWriteInputSchema = z.object({
  path: z.string().min(1, "Path is required"),
  content: z.string(),
  encoding: z.enum(["utf-8", "base64"]).default("utf-8"),
  createDirectories: z.boolean().default(true),
});

const FilesystemWriteOutputSchema = z.object({
  success: z.boolean(),
  path: z.string(),
  size: z.number(),
});

type FilesystemWriteInput = z.infer<typeof FilesystemWriteInputSchema>;
type FilesystemWriteOutput = z.infer<typeof FilesystemWriteOutputSchema>;

export const filesystemWriteTool: MCPTool<
  FilesystemWriteInput,
  FilesystemWriteOutput
> = {
  name: "filesystem_write",
  description:
    "寫入檔案內容。僅允許寫入 .doc/, reports/, logs/ 目錄。支援自動建立目錄。",
  inputSchema: FilesystemWriteInputSchema,
  handler: async (input) => {
    const validation = validatePath(input.path);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      const absolutePath = resolve(input.path);

      // 確保目錄存在
      if (input.createDirectories) {
        const dir = dirname(absolutePath);
        await mkdir(dir, { recursive: true });
      }

      // 寫入檔案
      await writeFile(absolutePath, input.content, input.encoding);

      // 取得檔案大小
      const stats = await stat(absolutePath);

      return {
        success: true,
        path: input.path,
        size: stats.size,
      };
    } catch (error) {
      throw new Error(
        `Failed to write file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
};

// ============================================================
// Filesystem List Tool
// ============================================================

const FilesystemListInputSchema = z.object({
  path: z.string().default(".doc"),
  recursive: z.boolean().default(false),
  pattern: z.string().optional(), // 簡單的檔名匹配，例如 "*.md"
});

const FilesystemListOutputSchema = z.object({
  files: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
      size: z.number(),
      isDirectory: z.boolean(),
      modified: z.string(),
    })
  ),
  totalCount: z.number(),
});

type FilesystemListInput = z.infer<typeof FilesystemListInputSchema>;
type FilesystemListOutput = z.infer<typeof FilesystemListOutputSchema>;

export const filesystemListTool: MCPTool<
  FilesystemListInput,
  FilesystemListOutput
> = {
  name: "filesystem_list",
  description:
    "列出目錄中的檔案。僅允許列出 .doc/, reports/, logs/ 目錄。支援檔名模式匹配。",
  inputSchema: FilesystemListInputSchema,
  handler: async (input) => {
    const validation = validatePath(input.path);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      const absolutePath = resolve(input.path);
      const entries = await readdir(absolutePath, { withFileTypes: true });

      const files = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = join(absolutePath, entry.name);
          const stats = await stat(entryPath);
          const relativePath = relative(process.cwd(), entryPath);

          return {
            name: entry.name,
            path: relativePath,
            size: stats.size,
            isDirectory: entry.isDirectory(),
            modified: stats.mtime.toISOString(),
          };
        })
      );

      // 過濾模式匹配
      let filteredFiles = files;
      if (input.pattern) {
        const pattern = input.pattern.replace(/\*/g, ".*").replace(/\?/g, ".");
        const regex = new RegExp(`^${pattern}$`);
        filteredFiles = files.filter((file) => regex.test(file.name));
      }

      return {
        files: filteredFiles,
        totalCount: filteredFiles.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to list directory: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
};
