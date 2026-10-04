/**
 * LLM Provider — 封装 OpenRouter /chat/completions API
 * 默认模型: z-ai/glm-5.3-flash（支持 vision）
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ImageBlock {
  type: "image_url";
  image_url: { url: string };
}

export type ContentBlock = TextBlock | ImageBlock;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentBlock[];
}

export interface ChatOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResult {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LLMProvider {
  private apiKey: string;
  private apiBase: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.LLM_API_KEY ?? "";
    this.apiBase = process.env.LLM_API_BASE ?? "https://openrouter.ai/api/v1";
    this.defaultModel = process.env.LLM_MODEL ?? "z-ai/glm-5.3-flash";

    if (!this.apiKey) {
      console.warn("[LLM] LLM_API_KEY is not set");
    }
  }

  /** 把相对路径 /uploads/xxx 或 localhost URL 转成 LLM 可访问的格式
   *  - 公网 URL → 原样返回
   *  - localhost/本地路径 → 读文件转 base64 data URL（OpenRouter 不能 fetch localhost）
   */
  private async resolveImageUrl(url: string): Promise<string> {
    if (!url) return url;

    // 已经是 data URL → 原样
    if (url.startsWith("data:")) return url;

    // 公网 https URL → 原样返回
    if (url.startsWith("https://")) return url;

    // 本地路径 /uploads/xxx → 直接读文件
    let relPath = url;
    if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) {
      try {
        const u = new URL(url);
        relPath = u.pathname;
      } catch {
        // 不是有效 URL 就当相对路径处理
      }
    }

    if (relPath.startsWith("/uploads/")) {
      const physicalPath = path.join(
        process.cwd(),
        "public",
        relPath.startsWith("/") ? relPath.slice(1) : relPath
      );
      try {
        const buf = await readFile(physicalPath);
        // 从扩展名猜 mime type
        const ext = path.extname(physicalPath).toLowerCase();
        const mimeMap: Record<string, string> = {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".webp": "image/webp",
          ".gif": "image/gif",
          ".bmp": "image/bmp",
        };
        const mime = mimeMap[ext] || "image/jpeg";
        const b64 = buf.toString("base64");
        return `data:${mime};base64,${b64}`;
      } catch (e) {
        console.warn("[LLM] 读本地图片失败:", physicalPath, e);
      }
    }

    // 最后兜底 → 返回原始（可能会被 OpenRouter 拒绝，但试试看）
    const host = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    if (!url.startsWith("http")) return `${host}${url}`;
    return url;
  }

  /** 把 ChatMessage 归一化成 API 可接受的格式（异步，因为要读文件转 base64） */
  private async normalizeMessage(
    msg: ChatMessage
  ): Promise<ChatMessage> {
    if (typeof msg.content === "string") {
      return msg;
    }
    const normalized = await Promise.all(
      msg.content.map(async (block) => {
        if (block.type === "image_url") {
          const resolved = await this.resolveImageUrl(block.image_url.url);
          return {
            ...block,
            image_url: { url: resolved },
          };
        }
        return block;
      })
    );
    return { ...msg, content: normalized };
  }

  async chat(options: ChatOptions): Promise<ChatResult> {
    const {
      messages,
      model = this.defaultModel,
      temperature = 0.7,
      max_tokens,
    } = options;

    if (!this.apiKey) {
      throw new Error("LLM_API_KEY is not configured");
    }

    if (!messages || messages.length === 0) {
      throw new Error("messages array is required");
    }

    // 归一化所有 message（处理相对路径图片 → base64 data URL）
    const normalizedMessages = await Promise.all(
      messages.map((m) => this.normalizeMessage(m))
    );

    const body: Record<string, unknown> = {
      model,
      messages: normalizedMessages,
      temperature,
    };
    if (max_tokens) body.max_tokens = max_tokens;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${this.apiBase}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorDetail = "";
        try {
          const errorJson = await response.json();
          errorDetail = JSON.stringify(errorJson);
        } catch {
          errorDetail = await response.text().catch(() => "");
        }
        throw new Error(
          `LLM API error: ${response.status} ${response.statusText} — ${errorDetail || "(no response body)"}`
        );
      }

      const data = await response.json();
      const content: string = data?.choices?.[0]?.message?.content ?? "";
      const usage = data?.usage;

      return {
        content,
        model: data?.model ?? model,
        usage: usage
          ? {
              prompt_tokens: usage.prompt_tokens,
              completion_tokens: usage.completion_tokens,
              total_tokens: usage.total_tokens,
            }
          : undefined,
      };
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        throw new Error("LLM request timed out (60s)");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const llmProvider = new LLMProvider();
