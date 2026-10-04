import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { getCharacterById } from "@/lib/characters/data";
import { conversations, messages as dbMessages, boyfriends } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ChatUI, type InitialMessage } from "./chat-ui";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ characterId: string }>;
}) {
  const { characterId } = await params;
  const session = await auth();

  // 未登录 → 跳转登录页
  if (!session) {
    redirect(`/login?callbackUrl=/chat/${characterId}`);
  }

  const character = getCharacterById(characterId);
  if (!character) {
    redirect("/");
  }

  // 在 boyfriends 表里查角色（优先 DB 中的 id）
  let bfId: string | undefined;

  // 1. 先尝试用字符 id 字段匹配
  const bfRows = await db
    .select({ id: boyfriends.id, name: boyfriends.name })
    .from(boyfriends)
    .limit(50);

  // 用名字匹配（MVP 阶段静态数据 id 和 DB uuid 对不上）
  const matchedBf = bfRows.find((b) => b.name === character.name);
  if (matchedBf) {
    bfId = matchedBf.id;
  }

  // 2. 如果 DB 里没有这个角色，先自动创建一条
  if (!bfId) {
    const inserted = await db
      .insert(boyfriends)
      .values({
        name: character.name,
        avatarUrl: character.avatar,
        identity: character.identity,
        personalityTags: character.personalityTags,
        catchphrase: character.catchphrase,
        greeting: character.greeting,
        backgroundStory: character.id, // 暂存字符 id 方便后续识别
        speakingStyle: character.systemPrompt,
        colorTheme: character.colorTheme.primary,
        isActive: true,
        createdAt: new Date(),
      })
      .returning({ id: boyfriends.id });
    bfId = inserted[0]?.id;
  }

  if (!bfId) {
    redirect("/");
  }

  // 3. 查找或创建会话
  let conversation = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, session.user.id!),
        eq(conversations.boyfriendId, bfId)
      )
    )
    .limit(1);

  let conversationRow = conversation[0];

  if (!conversationRow) {
    const now = new Date();
    const newRows = await db
      .insert(conversations)
      .values({
        userId: session.user.id!,
        boyfriendId: bfId,
        title: `${character.name} 的对话`,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    conversationRow = newRows[0];

    // 写入 greeting 作为第一条 assistant 消息
    await db.insert(dbMessages).values({
      conversationId: conversationRow.id,
      role: "assistant",
      content: character.greeting,
      createdAt: now,
    });
  }

  // 4. 加载历史消息
  const history = await db
    .select({
      id: dbMessages.id,
      role: dbMessages.role,
      content: dbMessages.content,
      createdAt: dbMessages.createdAt,
    })
    .from(dbMessages)
    .where(eq(dbMessages.conversationId, conversationRow.id))
    .orderBy(dbMessages.createdAt);

  const initialMessages: InitialMessage[] = history.map((m) => ({
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
    createdAt: m.createdAt?.getTime() ?? Date.now(),
  }));

  return (
    <ChatUI
      character={character}
      conversationId={conversationRow.id}
      initialMessages={initialMessages}
      user={{
        id: session.user.id!,
        name: session.user.name ?? null,
        image: session.user.image ?? null,
      }}
    />
  );
}
