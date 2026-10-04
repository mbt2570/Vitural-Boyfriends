"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { Character } from "@/lib/characters/data";

interface CharacterDrawerProps {
  character: Character;
  open: boolean;
  onClose: () => void;
  conversationId: string;
  onCleared: () => void;
}

export function CharacterDrawer({
  character,
  open,
  onClose,
  conversationId,
  onCleared,
}: CharacterDrawerProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      if (!res.ok) {
        throw new Error("清空失败");
      }
      onCleared();
      setConfirmOpen(false);
      onClose();
    } catch {
      alert("清空失败，请重试");
    } finally {
      setClearing(false);
    }
  };

  const accent = character.colorTheme.primary;

  return (
    <>
      {/* 背景遮罩 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />
        )}
      </AnimatePresence>

      {/* 右侧抽屉 */}
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: open ? 0 : "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed top-0 right-0 bottom-0 w-[85%] sm:w-[420px] bg-white shadow-2xl z-50 flex flex-col"
      >
        {/* 抽屉头部 */}
        <div
          className="relative pt-8 pb-6 px-6 text-center"
          style={{
            background: `linear-gradient(180deg, ${character.colorTheme.bg} 0%, #FFFFFF 100%)`,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-md hover:bg-black/5 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 圆形头像 */}
          <div className="relative w-28 h-28 mx-auto rounded-full overflow-hidden ring-4 ring-white shadow-md">
            <Image
              src={character.avatar}
              alt={character.name}
              fill
              sizes="112px"
              className="object-cover"
              unoptimized
            />
          </div>

          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            {character.name}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{character.identity}</p>

          {/* 顶部细条 */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: accent }}
          />
        </div>

        {/* 内容滚动区 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* 基本信息 */}
          <Section title="基本信息" accent={accent}>
            <InfoRow label="年龄" value={character.age} />
            <InfoRow label="身份" value={character.occupation} />
          </Section>

          {/* 性格标签 */}
          <Section title="性格" accent={accent}>
            <div className="flex flex-wrap gap-2">
              {character.personalityTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full border"
                  style={{
                    borderColor: accent,
                    color: accent,
                    backgroundColor: `${accent}10`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </Section>

          {/* 口头禅 */}
          <Section title="口头禅" accent={accent}>
            <p className="text-sm text-gray-700 italic leading-relaxed">
              "{character.catchphrase}"
            </p>
          </Section>

          {/* 背景故事 */}
          <Section title="关于他" accent={accent}>
            <p className="text-sm text-gray-700 leading-relaxed">
              {character.backgroundStory}
            </p>
          </Section>

          {/* 喜欢 / 讨厌 */}
          <div className="grid grid-cols-2 gap-4">
            <Section title="喜欢" accent="#10B981">
              <ul className="space-y-1.5">
                {character.likes.map((l) => (
                  <li key={l} className="text-sm text-gray-700 flex items-center gap-1.5">
                    <span className="text-[#10B981]">♥</span> {l}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="讨厌" accent="#EF4444">
              <ul className="space-y-1.5">
                {character.dislikes.map((d) => (
                  <li key={d} className="text-sm text-gray-700 flex items-center gap-1.5">
                    <span className="text-[#EF4444]">×</span> {d}
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        </div>

        {/* 底部操作区 */}
        <div className="border-t border-gray-100 px-6 py-4 bg-white">
          <button
            onClick={() => setConfirmOpen(true)}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border border-red-200"
          >
            清空此对话
          </button>
        </div>
      </motion.aside>

      {/* 确认弹窗 */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-6"
            onClick={() => !clearing && setConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-gray-900">确认清空？</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                你和 {character.name} 的所有聊天记录都会被删除，且无法恢复。
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => !clearing && setConfirmOpen(false)}
                  disabled={clearing}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleClear}
                  disabled={clearing}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {clearing ? "清空中..." : "确认清空"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ========== 子组件 ==========

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="w-1 h-3.5 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="pl-3.5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value}</span>
    </div>
  );
}
