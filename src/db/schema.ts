/**
 * Drizzle ORM Schema — 匹配 Neon PostgreSQL 实际表结构
 *
 * 表名: users | boyfriends | conversations | messages
 * 所有主键/外键均为 uuid（非 serial integer）
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  json,
  timestamp,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============== Enums ==============

// messages.role 字段使用了数据库自定义枚举类型（通过 direct connection 可见）
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);

// ============== users ==============

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  emailVerified: timestamp("email_verified"),
  image: varchar("image", { length: 255 }),
  password: varchar("password", { length: 255 }),
  birthday: varchar("birthday", { length: 255 }),
  hobby: text("hobby"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ============== boyfriends ==============

export const boyfriends = pgTable("boyfriends", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  identity: varchar("identity", { length: 255 }),
  personalityTags: json("personality_tags"),
  catchphrase: varchar("catchphrase", { length: 500 }),
  backgroundStory: text("background_story"),
  speakingStyle: text("speaking_style"),
  aiSystemPrompt: text("ai_system_prompt"),
  greeting: text("greeting"),
  colorTheme: varchar("color_theme", { length: 100 }),
  isActive: boolean("is_active"),
  createdAt: timestamp("created_at"),
});

// ============== conversations ==============

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  boyfriendId: uuid("boyfriend_id")
    .notNull()
    .references(() => boyfriends.id),
  title: varchar("title", { length: 255 }),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ============== messages ==============

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    aiModel: varchar("ai_model", { length: 100 }),
    tokensUsed: integer("tokens_used"),
    createdAt: timestamp("created_at"),
  },
  (table) => ({
    conversationIdx: index("messages_conversation_id_idx").on(table.conversationId),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  })
);

// ============== Relations ==============

export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
}));

export const boyfriendsRelations = relations(boyfriends, ({ many }) => ({
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  boyfriend: one(boyfriends, {
    fields: [conversations.boyfriendId],
    references: [boyfriends.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// ============== 类型导出 ==============

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Boyfriend = typeof boyfriends.$inferSelect;
export type NewBoyfriend = typeof boyfriends.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
