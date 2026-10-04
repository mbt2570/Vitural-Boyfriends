/**
 * TTS Provider — 封装 OpenRouter audio/speech API
 * 参考: https://openrouter.ai/api/v1/audio/speech
 */

export interface TTSOptions {
  input: string;
  voice?: string;
  model?: string;
  response_format?: "mp3" | "pcm" | "wav" | "ogg";
  speed?: number;
}

export interface TTSResult {
  audio: Buffer;
  contentType: string;
  size: number;
}

export class TTSProvider {
  private apiKey: string;
  private apiBase: string;
  private defaultModel: string;
  private defaultFormat: string;

  constructor() {
    this.apiKey = process.env.TTS_API_KEY ?? "";
    this.apiBase = process.env.TTS_API_BASE ?? "https://openrouter.ai/api/v1";
    this.defaultModel = process.env.TTS_MODEL ?? "minimax/speech-2.8-turbo";
    this.defaultFormat = process.env.TTS_RESPONSE_FORMAT ?? "mp3";

    if (!this.apiKey) {
      console.warn("[TTS] TTS_API_KEY is not set");
    }
  }

  /**
   * 调用 OpenRouter /api/v1/audio/speech 接口
   */
  async synthesize(options: TTSOptions): Promise<TTSResult> {
    const {
      input,
      voice = "English_expressive_narrator",
      model = this.defaultModel,
      response_format = this.defaultFormat as TTSOptions["response_format"],
      speed = 1.0,
    } = options;

    if (!this.apiKey) {
      throw new Error("TTS_API_KEY is not configured");
    }

    if (!input || input.trim().length === 0) {
      throw new Error("input text is required");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(`${this.apiBase}/audio/speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          input,
          voice,
          response_format,
          speed,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // 读取错误响应体以获得可读的错误信息
        let errorDetail = "";
        try {
          const errorJson = await response.json();
          errorDetail = JSON.stringify(errorJson);
        } catch {
          errorDetail = await response.text().catch(() => "");
        }
        throw new Error(
          `TTS API error: ${response.status} ${response.statusText} — ${errorDetail || "(no response body)"}`
        );
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("Content-Type") ?? "audio/mpeg";

      return {
        audio: audioBuffer,
        contentType,
        size: audioBuffer.length,
      };
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        throw new Error("TTS request timed out (30s)");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// 单例导出
export const ttsProvider = new TTSProvider();
