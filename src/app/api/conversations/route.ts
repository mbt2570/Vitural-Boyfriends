/**
 * POST /api/conversations — 创建或获取会话
 * Body: { boyfriendId: string, title?: string }
 * 
 * 如果当前用户 + boyfriendId 已存在会话 → 返回现有会话
 * 否则创建新会话 + 写入 greeting 作为第一条 assistant 消息
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { conversations, messages, boyfriends } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCharacterById } from "@/lib/characters/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/conversations — 清空某个会话的所有消息
 * Body: { conversationId: string }
 * 
 * 只删 messages，保留 conversation 记录（下次访问会写入新的 greeting）
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const conversationId = body?.conversationId as string | undefined;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId 必填" },
        { status: 400 }
      );
    }

    // 验证这个会话属于当前用户
    const convs = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId as any),
          eq(conversations.userId, session.user.id)
        )
      )
      .limit(1);

    if (convs.length === 0) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    // 删所有消息
    await db
      .delete(messages)
      .where(eq(messages.conversationId, conversationId as any));

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Conversations DELETE] Error:", message);
    return NextResponse.json(
      { error: "操作失败", detail: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const boyfriendId = body?.boyfriendId as string | undefined;
    const title = (body?.title as string | undefined) ?? undefined;

    if (!boyfriendId) {
      return NextResponse.json({ error: "boyfriendId 必填" }, { status: 400 });
    }

    // 1. 先在 boyfriends 表里查这个角色（验证合法性）
    const bfResult = await db
      .select()
      .from(boyfriends)
      .where(eq(boyfriends.id, boyfriendId))
      .limit(1);

    let bfRow = bfResult[0];

    // 如果数据库里没有这个角色，用前端静态数据兜底（MVP 阶段 DB 可能还没种子数据）
    if (!bfRow) {
      const char = getCharacterById(boyfriendId);
      if (!char) {
        return NextResponse.json(
          { error: "角色不存在" },
          { status: 404 }
        );
      }

      // 尝试写入数据库（如果表结构存在但没数据）
      const inserted = await db
        .insert(boyfriends)
        .values({
          id: boyfriendId as any, // 静态数据用的是字符串 id，DB 是 uuid
          name: char.name,
          avatarUrl: char.avatar,
          identity: char.identity,
          personalityTags: char.personalityTags,
          catchphrase: char.catchphrase,
          greeting: char.greeting,
          colorTheme: char.colorTheme.primary,
          isActive: true,
          createdAt: new Date(),
        })
        .returning();

      bfRow = inserted[0];
    }

    // 2. 查找现有会话
    const existing = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, session.user.id),
          eq(conversations.boyfriendId, bfRow.id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ ok: true, conversation: existing[0] });
    }

    // 3. 创建新会话
    const now = new Date();
    const newConvs = await db
      .insert(conversations)
      .values({
        userId: session.user.id,
        boyfriendId: bfRow.id,
        title: title ?? `${bfRow.name} 的对话`,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const conv = newConvs[0];

    // 4. 写入 greeting 作为第一条 assistant 消息
    if (bfRow.greeting) {
      await db.insert(messages).values({
        conversationId: conv.id,
        role: "assistant",
        content: bfRow.greeting,
        createdAt: now,
      });
    }

    return NextResponse.json(
      { ok: true, conversation: conv },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Conversations] Error:", message);
    return NextResponse.json(
      { error: "操作失败", detail: message },
      { status: 500 }
    );
  }
}
