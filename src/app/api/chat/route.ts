import { NextRequest, NextResponse } from "next/server";
import { llmProvider } from "@/lib/llm/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model, temperature, max_tokens } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages (array) is required" },
        { status: 400 }
      );
    }

    // 简单校验每条 message
    for (const msg of messages) {
      if (!msg?.role || !msg?.content) {
        return NextResponse.json(
          { error: "Each message must have 'role' and 'content'" },
          { status: 400 }
        );
      }
      if (!["system", "user", "assistant"].includes(msg.role)) {
        return NextResponse.json(
          { error: `Invalid role: ${msg.role}. Must be system | user | assistant` },
          { status: 400 }
        );
      }
    }

    const result = await llmProvider.chat({
      messages,
      model,
      temperature,
      max_tokens,
    });

    return NextResponse.json({
      content: result.content,
      model: result.model,
      usage: result.usage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Chat Route] Error:", message);
    return NextResponse.json(
      { error: "Chat failed", detail: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      endpoint: "/api/chat",
      method: "POST",
      body: {
        messages: "Array<{role, content}> (required) — chat history",
        model: "string (optional) — defaults to LLM_MODEL env",
        temperature: "number (optional) — 0.0 to 2.0, default 0.7",
        max_tokens: "number (optional)",
      },
      returns: {
        content: "string — assistant reply text",
        model: "string — actual model used",
        usage: "{prompt_tokens, completion_tokens, total_tokens}",
      },
    },
    { status: 200 }
  );
}
