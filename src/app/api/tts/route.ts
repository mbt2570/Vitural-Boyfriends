import { NextRequest, NextResponse } from "next/server";
import { ttsProvider } from "@/lib/tts/provider";
import { getVoiceByCharacter, listCharacterVoices } from "@/lib/characters/voice-mapping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, voice, character_id, model, response_format, speed } = body;

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return NextResponse.json(
        { error: "input (text) is required" },
        { status: 400 }
      );
    }

    // 过滤括号内的动作/状态描写，TTS 不念
    const cleanInput = input
      .replace(/（[^）]*）/g, "") // 全角括号
      .replace(/\([^)]*\)/g, "")  // 半角括号
      .replace(/\s+/g, " ")
      .trim();

    if (cleanInput.length === 0) {
      return NextResponse.json(
        { error: "过滤括号后文本为空" },
        { status: 400 }
      );
    }

    // 声线解析优先级：显式 voice > character_id 映射 > 默认值
    let resolvedVoice: string | undefined = voice;
    if (!resolvedVoice && character_id) {
      const mapped = getVoiceByCharacter(character_id);
      if (!mapped) {
        const available = listCharacterVoices().map((c) => c.character_id).join(", ");
        return NextResponse.json(
          { error: `Unknown character_id: ${character_id}`, available_characters: available },
          { status: 400 }
        );
      }
      resolvedVoice = mapped;
    }

    const result = await ttsProvider.synthesize({
      input: cleanInput,
      voice: resolvedVoice,
      model,
      response_format,
      speed,
    });

    return new NextResponse(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Length": String(result.size),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[TTS Route] Error:", message);
    return NextResponse.json(
      { error: "TTS synthesis failed", detail: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const chars = listCharacterVoices();
  return NextResponse.json(
    {
      endpoint: "/api/tts",
      method: "POST",
      body: {
        input: "string (required) — text to synthesize",
        voice: "string (optional) — 直接指定声线，优先于 character_id",
        character_id: "string (optional) — 角色 ID，自动匹配对应声线",
        model: "string (optional) — defaults to TTS_MODEL env",
        response_format: "mp3 | pcm | wav | ogg (optional)",
        speed: "number (optional) — 0.5 to 2.0, default 1.0",
      },
      characters: chars.map((c) => ({
        id: c.character_id,
        name: c.name,
        voice: c.voice,
        description: c.description,
      })),
      returns: "Binary audio with Content-Type matching response_format",
    },
    { status: 200 }
  );
}
