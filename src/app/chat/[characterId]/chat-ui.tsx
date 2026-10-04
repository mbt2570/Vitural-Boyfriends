"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Character } from "@/lib/characters/data";
import { CharacterDrawer } from "@/components/character-drawer";
import { EmojiPanel } from "@/components/emoji-panel";

// ========== 微信主题色 ==========
const WX = {
  green: "#07C160",        // 导航栏 + 用户气泡
  greenDark: "#06AD56",
  bg: "#EDEDED",           // 聊天背景
  bubbleMe: "#95EC69",     // 用户气泡（微信经典浅绿）
  bubbleOther: "#FFFFFF",  // 对方气泡（白色）
  textDark: "#111111",
  textGray: "#888888",
  navText: "#FFFFFF",
  inputBg: "#F7F7F7",
  inputBorder: "#D6D6D6",
};

export interface InitialMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

/** 解析 DB 里存的 content —— 可能是纯 text 或 JSON */
export function parseContent(raw: string): { text: string; images: string[] } {
  if (!raw) return { text: "", images: [] };
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object" && (obj.images || obj.text)) {
      return {
        text: (obj.text as string) ?? "",
        images: Array.isArray(obj.images) ? obj.images : [],
      };
    }
  } catch {
    // 不是 JSON → 纯 text
  }
  return { text: raw, images: [] };
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string; // DB 存的原始内容（text 或 JSON string）
  createdAt: number;
}

/** 把 ChatMessage 转成 LLM 用的 content blocks（text + vision） */
function toLLMContent(msg: ChatMessage): string | Array<
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
> {
  const parsed = parseContent(msg.content);
  if (!parsed.images.length) return parsed.text;
  const blocks: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [];
  if (parsed.text) blocks.push({ type: "text", text: parsed.text });
  for (const url of parsed.images) {
    blocks.push({ type: "image_url", image_url: { url } });
  }
  return blocks;
}

export function ChatUI({
  character,
  conversationId,
  initialMessages,
  user,
}: {
  character: Character;
  conversationId: string;
  initialMessages: InitialMessage[];
  user: { id: string; name: string | null; image: string | null };
}) {
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (initialMessages.length > 0) {
      return initialMessages as ChatMessage[];
    }
    return [
      {
        id: `init-${Date.now()}`,
        role: "assistant" as const,
        content: character.greeting,
        createdAt: Date.now(),
      },
    ];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  const doSend = useCallback(
    async (text: string, images: string[] = []) => {
      const trimmed = text.trim();
      if (!trimmed && images.length === 0) return;
      if (isLoading) return;

      // content 存 JSON：有图片就带 images 字段
      const dbContent =
        images.length > 0
          ? JSON.stringify({ text: trimmed, images })
          : trimmed;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: dbContent,
        createdAt: Date.now(),
      };

      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setPlusOpen(false);
      if (inputRef.current) inputRef.current.style.height = "auto";
      setIsLoading(true);

      try {
        const MAX_HISTORY = 20;
        const trimmedMessages =
          newMessages.length > MAX_HISTORY
            ? newMessages.slice(-MAX_HISTORY)
            : newMessages;

        const apiMessages = [
          { role: "system" as const, content: character.systemPrompt },
          ...trimmedMessages.map((m) => ({
            role: m.role,
            content: toLLMContent(m),
          })),
        ];

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `请求失败 (${res.status})`);
        }

        const data = await res.json();

        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.content || "（他似乎没说什么...）",
          createdAt: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        void fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            messages: [
              { role: "user", content: dbContent },
              { role: "assistant", content: data.content || "（他似乎没说什么...）" },
            ],
          }),
        }).catch(() => { /* 存库失败不影响对话 */ });
      } catch (err) {
        const message = err instanceof Error ? err.message : "未知错误";
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `（抱歉，出错了：${message}）`,
            createdAt: Date.now(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, character.systemPrompt, conversationId]
  );

  const sendMessage = useCallback(() => {
    void doSend(input);
  }, [doSend, input]);

  /** 选图 → 上传 → 自动发送（带可选文字） */
  const handleImageSelected = useCallback(
    async (file: File) => {
      setPlusOpen(false);
      if (!file) return;

      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        alert("仅支持 jpg / png / webp / gif");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert("图片不能超过 10MB");
        return;
      }

      setIsUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload/chat-image", {
          method: "POST",
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
          throw new Error(data.error || "上传失败");
        }
        // 上传成功 → 自动发送（文字部分为空，图片单独发）
        void doSend(input, [data.url]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "上传失败";
        alert(message);
      } finally {
        setIsUploadingImage(false);
      }
    },
    [doSend, input]
  );

  const toggleTTS = useCallback(
    async (msgId: string, text: string) => {
      if (playingId === msgId) {
        audioRef.current?.pause();
        audioRef.current = null;
        setPlayingId(null);
        return;
      }

      audioRef.current?.pause();
      audioRef.current = null;

      try {
        setPlayingId(msgId);

        // 过滤括号内的动作/状态描写，TTS 不念
        const cleanText = text
          .replace(/（[^）]*）/g, "") // 全角括号
          .replace(/\([^)]*\)/g, "")  // 半角括号
          .replace(/\s+/g, " ")       // 多空格合并
          .trim();

        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: cleanText,
            character_id: character.id,
          }),
        });

        if (!res.ok) throw new Error("TTS 请求失败");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setPlayingId(null);
          URL.revokeObjectURL(url);
          urlRef.current = null;
        };
        audio.onerror = () => {
          setPlayingId(null);
          URL.revokeObjectURL(url);
          urlRef.current = null;
        };

        await audio.play();
      } catch {
        setPlayingId(null);
      }
    },
    [playingId, character.id]
  );

  // ========== STT 录音相关 ==========
  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("当前浏览器不支持录音，请使用 Chrome 或 Edge");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 选 MediaRecorder 支持的格式
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        // 录音过短（< 0.5s）不发 STT
        if (blob.size < 500) {
          console.log("[STT] Recording too short, skipping");
          return;
        }

        await transcribeAudio(blob, mimeType);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[STT] 录音启动失败:", message);
      alert("无法访问麦克风：" + message);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const transcribeAudio = useCallback(
    async (blob: Blob, mimeType: string) => {
      setIsTranscribing(true);
      try {
        const ext = mimeType.includes("mp4")
          ? "mp4"
          : mimeType.includes("ogg")
          ? "ogg"
          : "webm";
        const filename = `recording.${ext}`;

        const formData = new FormData();
        formData.append("file", blob, filename);

        const res = await fetch("/api/stt", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `STT 请求失败 (${res.status})`);
        }

        const data = await res.json();
        const text = (data.text || "").trim();

        if (text) {
          // 自动填入输入框，用户可以编辑后发送
          setInput((prev) => (prev ? prev + text : text));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "未知错误";
        console.error("[STT] 转写失败:", message);
        alert("语音转写失败：" + message);
      } finally {
        setIsTranscribing(false);
      }
    },
    []
  );

  const toggleRecording = useCallback(() => {
    if (isTranscribing) return;
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  }, [isRecording, isTranscribing, startRecording, stopRecording]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: WX.bg }}>
      {/* ======== 微信风格顶部导航栏 ======== */}
      <header
        className="flex items-center h-12 px-3 shrink-0 select-none"
        style={{ backgroundColor: WX.green }}
      >
        <button
          onClick={() => router.push("/")}
          className="p-1 rounded-md hover:bg-black/10 transition-colors"
          aria-label="返回"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke={WX.navText}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div className="flex-1 text-center">
          <h1 className="text-base font-medium leading-none" style={{ color: WX.navText }}>
            {character.name}
          </h1>
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="p-1 rounded-md hover:bg-black/10 transition-colors"
          aria-label="更多"
        >
          <svg
            className="w-5 h-5"
            fill={WX.navText}
            viewBox="0 0 24 24"
          >
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      </header>

      {/* ======== 消息区 ======== */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {/* 日期/时间分隔（用系统时间戳占位） */}
          {messages.length > 0 && (
            <div className="flex justify-center">
              <span className="text-[11px] text-gray-400 bg-gray-300/50 px-2 py-0.5 rounded">
                {formatTime(messages[0].createdAt)}
              </span>
            </div>
          )}

          {messages.map((msg) => (
            <WxMessageBubble
              key={msg.id}
              message={msg}
              character={character}
              userImage={user.image}
              isPlaying={playingId === msg.id}
              onToggleTTS={() => toggleTTS(msg.id, parseContent(msg.content).text)}
              onPreviewImage={(url) => setPreviewImage(url)}
            />
          ))}

          {/* 加载中 */}
          {isLoading && (
            <div className="flex gap-2 items-end">
              <WxAvatar character={character} isUser={false} />
              <div
                className="px-3 py-2.5 text-[15px] leading-relaxed max-w-[70%]"
                style={{
                  backgroundColor: WX.bubbleOther,
                  color: WX.textDark,
                  borderRadius: "6px",
                  position: "relative",
                }}
              >
                {/* 小三角 */}
                <span
                  className="absolute top-3 -left-1.5 w-3 h-3 rotate-45"
                  style={{ backgroundColor: WX.bubbleOther }}
                />
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======== 微信风格输入区 ======== */}
      <div
        className="shrink-0 border-t"
        style={{ borderColor: WX.inputBorder, backgroundColor: WX.inputBg }}
      >
        {/* 顶部工具条：语音 + 表情 + + */}
        <div className="flex items-center gap-2 px-2 py-1.5">
          {/* 语音按钮 */}
          <button
            onClick={toggleRecording}
            disabled={isTranscribing}
            className={`p-1.5 rounded transition-colors relative ${
              isRecording
                ? "bg-red-500/20 hover:bg-red-500/30 text-red-500"
                : isTranscribing
                ? "text-gray-400 cursor-not-allowed"
                : "hover:bg-gray-200/60"
            }`}
            aria-label={isRecording ? "停止录音" : "开始录音"}
            title={
              isRecording
                ? `录音中 (${recordingDuration}s)，点击停止`
                : isTranscribing
                ? "转写中..."
                : "点击开始录音"
            }
          >
            {isTranscribing ? (
              <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke={WX.textGray}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            ) : isRecording ? (
              <>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] text-red-500 whitespace-nowrap">
                  ● {recordingDuration}s
                </span>
              </>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={WX.textGray}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {/* 输入框 */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const el = e.target;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder=""
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none rounded-md border px-3 py-2 text-[15px] leading-relaxed focus:outline-none disabled:opacity-50"
            style={{
              borderColor: WX.inputBorder,
              backgroundColor: "#FFFFFF",
              minHeight: "36px",
              maxHeight: "120px",
              color: WX.textDark,
            }}
          />

          {/* 表情按钮 */}
          <button
            onClick={() => setEmojiOpen((v) => !v)}
            className={`p-1.5 rounded transition-colors ${
              emojiOpen ? "bg-gray-200/80" : "hover:bg-gray-200/60"
            }`}
            aria-label="表情"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={WX.textGray}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* 发送/添加按钮 */}
          {input.trim() ? (
            <button
              onClick={sendMessage}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-md text-white text-sm font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: WX.green }}
            >
              {isLoading ? "..." : "发送"}
            </button>
          ) : (
            <button
              onClick={() => {
                setEmojiOpen(false);
                setPlusOpen((v) => !v);
              }}
              disabled={isLoading || isUploadingImage}
              className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
                plusOpen ? "bg-gray-200/80" : "hover:bg-gray-200/60"
              }`}
              aria-label="更多"
            >
              {isUploadingImage ? (
                <svg className="w-6 h-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={WX.textGray}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* 加号弹出菜单（宫格） */}
        {plusOpen && (
          <div
            className="px-3 pb-3 pt-1"
            style={{ backgroundColor: WX.inputBg }}
          >
            <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto">
              <PlusMenuItem
                label="相册"
                onClick={() => fileInputRef.current?.click()}
                icon={
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke={WX.textGray}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>
          </div>
        )}

        {/* 隐藏的文件选择器 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImageSelected(file);
            // 清空以便能重复选同一张图
            e.target.value = "";
          }}
        />
      </div>

      {/* Emoji / 快捷回复 面板 */}
      {emojiOpen && (
        <EmojiPanel
          quickReplies={character.quickReplies}
          onInsertEmoji={(emoji) =>
            setInput((prev) => prev + emoji)
          }
          onSendQuickReply={(text) => {
            setEmojiOpen(false);
            setInput("");
            void doSend(text);
          }}
        />
      )}

      {/* 角色档案抽屉 */}
      <CharacterDrawer
        character={character}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        conversationId={conversationId}
        onCleared={() => {
          setMessages([
            {
              id: `fresh-${Date.now()}`,
              role: "assistant" as const,
              content: character.greeting,
              createdAt: Date.now(),
            },
          ]);
        }}
      />

      {/* 图片预览遮罩 */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center cursor-zoom-out select-none"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="预览"
            className="max-w-[95vw] max-h-[90vh] object-contain"
            style={{ borderRadius: "6px" }}
          />
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ========== 头像（微信方形圆角风格） ==========
function WxAvatar({
  character,
  isUser,
  userImage,
}: {
  character: Character;
  isUser: boolean;
  userImage?: string | null;
}) {
  return (
    <div
      className="w-10 h-10 overflow-hidden shrink-0"
      style={{
        borderRadius: "3px", // 微信方形圆角
        backgroundColor: isUser ? "#CFCFCF" : "transparent",
      }}
    >
      {isUser ? (
        userImage ? (
          <Image
            src={userImage}
            alt="我"
            width={40}
            height={40}
            className="object-cover w-full h-full"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-[13px] font-medium">
            我
          </div>
        )
      ) : (
        <Image
          src={character.avatar}
          alt={character.name}
          width={40}
          height={40}
          className="object-cover w-full h-full"
        />
      )}
    </div>
  );
}

// ========== 微信风格消息气泡 ==========
function WxMessageBubble({
  message,
  character,
  userImage,
  isPlaying,
  onToggleTTS,
  onPreviewImage,
}: {
  message: ChatMessage;
  character: Character;
  userImage?: string | null;
  isPlaying: boolean;
  onToggleTTS: () => void;
  onPreviewImage: (url: string) => void;
}) {
  const isUser = message.role === "user";
  const { text, images } = parseContent(message.content);

  return (
    <div className={`flex gap-2 items-start ${isUser ? "flex-row-reverse" : ""}`}>
      {/* 头像 */}
      <WxAvatar character={character} isUser={isUser} userImage={userImage} />

      {/* 气泡 + 操作 */}
      <div
        className={`flex flex-col gap-1 max-w-[70%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {/* 图片气泡（可能带文字也可能不带） */}
        {images.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => onPreviewImage(url)}
                className="block rounded-md overflow-hidden bg-gray-100 shrink-0"
                style={{
                  maxWidth: 200,
                  maxHeight: 200,
                  borderRadius: "6px",
                  cursor: "zoom-in",
                }}
              >
                <Image
                  src={url}
                  alt="图片"
                  width={200}
                  height={200}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}

        {/* 文字气泡 */}
        {text && (
          <div
            className="px-3 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words"
            style={{
              backgroundColor: isUser ? WX.bubbleMe : WX.bubbleOther,
              color: WX.textDark,
              borderRadius: "6px",
              position: "relative",
            }}
          >
            {/* 微信小三角尾巴 */}
            <span
              className="absolute top-3 w-3 h-3 rotate-45"
              style={{
                backgroundColor: isUser ? WX.bubbleMe : WX.bubbleOther,
                ...(isUser
                  ? { right: -6 }
                  : { left: -6 }),
              }}
            />
            {text}
          </div>
        )}

        {/* AI 消息 — 播放按钮 */}
        {!isUser && text && (
          <button
            onClick={onToggleTTS}
            className="flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-gray-500 transition-colors pr-1"
          >
            {isPlaying ? (
              <>
                <svg className="w-3 h-3 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 9v6m4-6v6M4 12h16" />
                </svg>
                停止
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                播放
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ========== 加号菜单项 ==========
function PlusMenuItem({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-white/60 active:bg-white/80 transition-colors"
    >
      <div
        className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm border border-gray-100"
      >
        {icon}
      </div>
      <span className="text-[11px] text-gray-600">{label}</span>
    </button>
  );
}

// ========== 辅助函数 ==========
function formatTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");

  if (sameDay(d, today)) return `${hh}:${mm}`;
  if (sameDay(d, yest)) return `昨天 ${hh}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}
