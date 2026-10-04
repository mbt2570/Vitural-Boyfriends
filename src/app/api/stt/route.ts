import { NextRequest, NextResponse } from "next/server";
import { sttProvider } from "@/lib/stt/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "file (audio) is required as multipart/form-data field" },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "audio file is empty" },
        { status: 400 }
      );
    }

    // 硅基流动限制 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "audio file too large (max 50MB)" },
        { status: 413 }
      );
    }

    const model = (formData.get("model") as string) || undefined;
    const language = (formData.get("language") as string) || undefined;

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await sttProvider.transcribe({
      audio: buffer,
      filename: file.name || "recording.webm",
      model,
      language,
    });

    return NextResponse.json({
      text: result.text,
      duration: result.duration,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[STT Route] Error:", message);
    return NextResponse.json(
      { error: "STT transcription failed", detail: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      endpoint: "/api/stt",
      method: "POST",
      content_type: "multipart/form-data",
      body: {
        file: "(required) — audio file (wav/mp3/webm/ogg, ≤50MB)",
        model: "(optional) — STT model, defaults to STT_MODEL env",
        language: "(optional) — language hint",
      },
      returns: {
        text: "transcribed text",
        duration: "audio duration in seconds (if available)",
      },
    },
    { status: 200 }
  );
}
