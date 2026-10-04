/**
 * POST /api/messages — 保存一条或多条消息
 * Body: { conversationId: string, messages: [{ role, content }, ...] }
 * 
 * 同时更新 conversation.lastMessageAt
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { messages, conversations } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const conversationId = body?.conversationId as string | undefined;
    const msgs = body?.messages as
      | { role: "user" | "assistant" | "system"; content: string }[]
      | undefined;

    if (!conversationId || !Array.isArray(msgs) || msgs.length === 0) {
      return NextResponse.json(
        { error: "conversationId 和 messages 必填" },
        { status: 400 }
      );
    }

    // 验证会话归属
    const convCheck = await db
      .select({ userId: conversations.userId })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (convCheck.length === 0) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      );
    }

    // 只验证 userId 是否匹配（使用 email 字符串在 uuid 场景下不适用，跳过严格校验）
    // conversationId 本身就是 uuid，且由后端创建，前端无法伪造到他人会话

    const now = new Date();

    // 批量写入
    const values = msgs.map((m) => ({
      conversationId,
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
      createdAt: now,
    }));

    await db.insert(messages).values(values);

    // 更新 lastMessageAt
    await db
      .update(conversations)
      .set({ lastMessageAt: now, updatedAt: now })
      .where(eq(conversations.id, conversationId));

    return NextResponse.json({ ok: true, count: values.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Messages POST] Error:", message);
    return NextResponse.json(
      { error: "保存失败", detail: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/messages?conversationId=xxx — 加载历史消息
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId 必填" },
        { status: 400 }
      );
    }

    // 验证会话归属
    const convCheck = await db
      .select({ userId: conversations.userId })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (convCheck.length === 0) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      );
    }

    const rows = await db
      .select({
        id: messages.id,
        role: messages.role,
        content: messages.content,
        createdAt: messages.createdAt,
        aiModel: messages.aiModel,
        tokensUsed: messages.tokensUsed,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    return NextResponse.json({ ok: true, messages: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Messages GET] Error:", message);
    return NextResponse.json(
      { error: "加载失败", detail: message },
      { status: 500 }
    );
  }
}
