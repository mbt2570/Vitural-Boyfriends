import { NextRequest, NextResponse } from "next/server";
import { imageProvider } from "@/lib/image/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model, size, n } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "prompt (string) is required" },
        { status: 400 }
      );
    }

    const results = await imageProvider.generate({
      prompt,
      model,
      size,
      n,
    });

    return NextResponse.json({ images: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Image Route] Error:", message);
    return NextResponse.json(
      { error: "Image generation failed", detail: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      endpoint: "/api/image",
      method: "POST",
      body: {
        prompt: "string (required) — 图像描述",
        model: "string (optional) — defaults to IMAGE_MODEL env",
        size: "string (optional) — e.g. 1024x1024, 2048x2048",
        n: "number (optional) — number of images, default 1",
      },
      returns: {
        images: [
          {
            url: "string — 预签名 URL（约 24h 有效）",
            size: "string — 实际尺寸",
            model: "string — 实际使用的模型",
            usage: "{generated_images, output_tokens, total_tokens}",
          },
        ],
      },
    },
    { status: 200 }
  );
}
