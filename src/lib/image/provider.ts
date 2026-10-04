/**
 * Image Provider — 封装火山方舟 Seedream 图生图 API
 * 默认模型: doubao-seedream-5-0-260128
 * 
 * 响应: data[0].url — TOS 预签名 URL（约 24h 有效）
 */

export interface ImageOptions {
  prompt: string;
  model?: string;
  size?: string; // e.g. "1024x1024", "2048x2048"
  n?: number;    // 生成数量
}

export interface ImageResult {
  url: string;
  size: string;
  model: string;
  usage?: {
    generated_images: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export class ImageProvider {
  private apiKey: string;
  private apiBase: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.IMAGE_API_KEY ?? "";
    this.apiBase = process.env.IMAGE_API_BASE ?? "https://ark.cn-beijing.volces.com/api/v3";
    this.defaultModel = process.env.IMAGE_MODEL ?? "doubao-seedream-5-0-260128";

    if (!this.apiKey) {
      console.warn("[Image] IMAGE_API_KEY is not set");
    }
  }

  async generate(options: ImageOptions): Promise<ImageResult[]> {
    const {
      prompt,
      model = this.defaultModel,
      size = "2048x2048",
      n = 1,
    } = options;

    if (!this.apiKey) {
      throw new Error("IMAGE_API_KEY is not configured");
    }

    if (!prompt || prompt.trim().length === 0) {
      throw new Error("prompt is required");
    }

    const body: Record<string, unknown> = {
      model,
      prompt: prompt.trim(),
      size,
      n,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s for image gen

    try {
      const response = await fetch(`${this.apiBase}/images/generations`, {
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
          `Image API error: ${response.status} ${response.statusText} — ${errorDetail || "(no response body)"}`
        );
      }

      const data = await response.json();
      const items = (data?.data ?? []).map((item: { url: string; size: string }) => ({
        url: item.url,
        size: item.size ?? size,
        model: data?.model ?? model,
        usage: data?.usage
          ? {
              generated_images: data.usage.generated_images,
              output_tokens: data.usage.output_tokens,
              total_tokens: data.usage.total_tokens,
            }
          : undefined,
      }));

      return items;
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        throw new Error("Image request timed out (120s)");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const imageProvider = new ImageProvider();
