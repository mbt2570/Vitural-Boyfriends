/**
 * STT Provider — 封装硅基流动 SiliconFlow / OpenAI 兼容的 audio/transcriptions API
 * 模型：FunAudioLLM/SenseVoiceSmall（中/粤/英/日/韩）
 */

export interface STTOptions {
  audio: ArrayBuffer | ArrayBufferView | Buffer;
  filename?: string;
  model?: string;
  language?: string;
}

export interface STTResult {
  text: string;
  duration?: number;
}

export class STTProvider {
  private apiKey: string;
  private apiBase: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.STT_API_KEY ?? "";
    this.apiBase = process.env.STT_API_BASE ?? "https://api.siliconflow.cn/v1";
    this.defaultModel = process.env.STT_MODEL ?? "FunAudioLLM/SenseVoiceSmall";

    if (!this.apiKey) {
      console.warn("[STT] STT_API_KEY is not set");
    }
  }

  async transcribe(options: STTOptions): Promise<STTResult> {
    const {
      audio,
      filename = "recording.webm",
      model = this.defaultModel,
      language,
    } = options;

    if (!this.apiKey) {
      throw new Error("STT_API_KEY is not configured");
    }

    // 构造 FormData
    const formData = new FormData();
    // new Uint8Array() 绕开 Node Buffer 新泛型与 BlobPart 的类型不兼容
    const view = audio instanceof ArrayBuffer ? new Uint8Array(audio) : new Uint8Array(audio.buffer as ArrayBuffer, audio.byteOffset, audio.byteLength);
    formData.append("file", new Blob([view as BlobPart]), filename);
    formData.append("model", model);
    if (language) formData.append("language", language);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.apiBase}/audio/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
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
          `STT API error: ${response.status} ${response.statusText} — ${errorDetail || "(no response body)"}`
        );
      }

      const data = (await response.json()) as { text?: string; duration?: number };

      return {
        text: (data.text ?? "").trim(),
        duration: data.duration,
      };
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        throw new Error("STT request timed out (30s)");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const sttProvider = new STTProvider();
