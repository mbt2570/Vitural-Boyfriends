"use client";

import { useState } from "react";

// 精选常用 emoji（60 个），分两排展示
const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "🥰", "😘", "😗", "😙",
  "🙂", "🤗", "🤩", "😏", "😌", "😔", "😪", "🤤", "😴", "😷",
  "🤒", "🤑", "🤠", "🙄", "😒", "😞", "😢", "😭", "😤", "😡",
  "🥺", "😳", "🥵", "🥶", "😱", "😨", "😰", "🤔", "🤫", "🥳",
  "👍", "👎", "👌", "🤌", "👊", "✊", "🤛", "🤜", "👏", "🙌",
  "❤️", "💔", "💖", "💕", "💗", "💓", "💞", "💝", "💌", "⭐",
];

export function EmojiPanel({
  quickReplies,
  onInsertEmoji,
  onSendQuickReply,
}: {
  quickReplies: string[];
  onInsertEmoji: (emoji: string) => void;
  onSendQuickReply: (text: string) => void;
}) {
  const [tab, setTab] = useState<"emoji" | "quick">("emoji");

  return (
    <div
      className="shrink-0 border-t overflow-hidden"
      style={{ borderColor: "#D6D6D6", backgroundColor: "#F7F7F7" }}
    >
      {/* Tab 切换 */}
      <div className="flex gap-1 px-3 pt-2">
        <TabBtn active={tab === "emoji"} onClick={() => setTab("emoji")}>
          表情
        </TabBtn>
        <TabBtn active={tab === "quick"} onClick={() => setTab("quick")}>
          快捷回复
        </TabBtn>
      </div>

      <div className="px-3 pb-3 pt-2">
        {tab === "emoji" ? (
          <div className="grid grid-cols-10 gap-1">
            {EMOJIS.map((e, i) => (
              <button
                key={i}
                onClick={() => onInsertEmoji(e)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 transition-colors text-lg leading-none"
              >
                {e}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((q) => (
              <button
                key={q}
                onClick={() => onSendQuickReply(q)}
                className="px-3 py-1.5 rounded-md border text-[13px] text-gray-700 bg-white hover:bg-[#95EC69]/20 hover:text-gray-900 transition-colors"
                style={{ borderColor: "#D6D6D6" }}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[13px] px-2.5 py-1 rounded-md transition-colors ${
        active
          ? "text-[#07C160] bg-white font-medium"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}
