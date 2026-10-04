# 🧑‍🤝‍🧑 Virtual Boyfriends

A WeChat-style AI role-playing chat app. After signing up, users can pick from several boyfriend characters with distinct personalities and chat via text, voice, and images. The AI responds in-character based on each character's profile and conversation history.

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 User System | Email sign-up / NextAuth credentials login / avatar upload |
| 💬 WeChat-Style Chat | Classic chat bubbles + emoji panel + quick replies |
| 🎭 Multiple Characters | 4 preset boyfriends with unique personas, catchphrases, and speaking styles |
| 🌐 Multimodal LLM | Powered by `z-ai/glm-5.3-flash` — understands images (send a Pokéball, he'll know what it is) |
| 🎤 STT Voice-to-Text | Browser recording → SiliconFlow SenseVoiceSmall recognition → auto-fills input |
| 🔊 TTS Text-to-Speech | OpenRouter MiniMax reads character lines, auto-strips parenthesized actions |
| 🖼️ Send Images | Tap `+` → Gallery → pick an image — local files auto-converted to base64 for the LLM |
| 📱 Animated Home | Framer Motion 3D tilt + stagger entry + avatar glow |
| 💾 Conversation Persistence | Independent session per user-character pair; messages stored in Neon PostgreSQL |
| 🖼️ Character Drawer | Basic info / personality / catchphrase / likes / dislikes / clear conversation |

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) + Turbopack |
| Language | TypeScript 7 |
| Styling | Tailwind CSS 4 |
| Motion | Framer Motion |
| Database | Neon PostgreSQL + Drizzle ORM |
| Auth | NextAuth v5 (Credentials) + bcrypt |
| LLM | OpenRouter → z-ai/glm-5.3-flash (multimodal) |
| TTS | OpenRouter → minimax/speech-2.8-turbo |
| STT | SiliconFlow → FunAudioLLM/SenseVoiceSmall |
| Image Gen | Volcengine Seedream (reserved) |
| Deploy | Vercel |

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/mbt2570/vitural-boyfriends.git
cd vitural-boyfriends
pnpm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Fill in real values following the comments in `.env.example`. Minimum required:

```bash
DATABASE_URL="postgresql://..."        # Neon / Supabase / any Postgres
AUTH_SECRET="openssl rand -base64 32"  # or https://generate-secret.vercel.app/32
LLM_API_KEY="sk-or-v1-..."             # OpenRouter or SiliconFlow
```

### 3. Initialize Database

```bash
# Create tables (if starting from a fresh DB)
pnpm drizzle-kit push
```

### 4. Run Dev Server

```bash
pnpm dev
# Open http://localhost:3000
```

### 5. Production Build

```bash
pnpm build && pnpm start
```

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                       # API routes
│   │   ├── auth/                  # NextAuth credentials login + register
│   │   ├── chat/                  # LLM conversation (supports vision blocks)
│   │   ├── conversations/         # Conversation management (per user-character pair)
│   │   ├── messages/              # Message CRUD (batch save + history load)
│   │   ├── stt/                   # Speech-to-text
│   │   ├── tts/                   # Text-to-speech (auto-strips parenthesized actions)
│   │   ├── upload/chat-image/     # Chat image upload → public/uploads/chat/
│   │   └── user/avatar/           # Avatar upload
│   ├── chat/[characterId]/        # Chat page (Server Component + Client UI)
│   ├── login/ register/ me/        # User pages
│   ├── page.tsx                   # Home (character cards)
│   └── globals.css
├── components/
│   ├── character-card.tsx         # Home character card (3D tilt + stagger animation)
│   ├── character-drawer.tsx      # Character profile drawer
│   ├── emoji-panel.tsx            # Emoji + quick reply panel
│   └── header-auth.tsx
├── db/
│   ├── schema.ts                  # Drizzle schema (users / boyfriends / conversations / messages)
│   └── index.ts                   # db instance
├── lib/
│   ├── llm/provider.ts            # LLM provider (OpenRouter, base64 vision support)
│   ├── tts/provider.ts            # TTS provider
│   ├── stt/provider.ts            # STT provider
│   ├── image/provider.ts          # Image gen provider (reserved)
│   └── characters/data.ts         # Full profiles for 4 characters + voice-mapping
└── auth.ts
public/
├── avatars/                       # Bundled character avatars (committed to Git)
└── uploads/                       # User uploads (.gitignored)
    ├── avatars/                   # User avatars
    └── chat/                      # Chat images
```

## 🗄️ Database Schema

```
users          id, name, email, image, password(bcrypt), birthday, hobby
boyfriends     id, name, avatar_url, identity, personality_tags(JSON), catchphrase,
               background_story, speaking_style, ai_system_prompt, greeting, color_theme
conversations  id, user_id(FK), boyfriend_id(FK), title, last_message_at
messages       id, conversation_id(FK), role(enum: user|assistant|system),
               content(text, plain text or JSON: {"text":"...","images":["/uploads/..."]}),
               ai_model, tokens_used
```

## 🤖 Message Format

`messages.content` stores either plain text or JSON, unified via `parseContent()`:

```typescript
// Plain text (backward compatible)
content: "hello"

// With images
content: '{"text":"this is me","images":["/uploads/chat/xxx.jpg"]}'
```

When sending to the LLM, this auto-converts to multimodal blocks. Local `/uploads/xxx` paths are read from disk and encoded as base64 data URLs.

## 🚢 Deploy to Vercel

1. `git push` to GitHub
2. Vercel Dashboard → **New Project** → pick your repo
3. Fill in these Environment Variables:

```
DATABASE_URL        = postgresql://...     # Neon Pooler URL
AUTH_URL            = https://your-project.vercel.app
AUTH_SECRET         = openssl rand -base64 32
LLM_API_KEY         = sk-or-v1-...
LLM_API_BASE        = https://openrouter.ai/api/v1
LLM_MODEL           = z-ai/glm-5.3-flash
TTS_API_KEY         = sk-or-v1-...
STT_API_KEY         = sk-wqdscrj...
IMAGE_API_KEY       = (optional)
```

4. **Deploy** → wait ~1 min → get your production URL

> ⚠️ **Note:** `public/uploads/` gets wiped on every Vercel redeploy. Fine for personal use; for production durability, use [Vercel Blob](https://vercel.com/storage/blob) or store files in Neon `bytea` columns.

## 📝 License

[MIT](./LICENSE) © 2026 mbt2570
