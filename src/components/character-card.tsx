"use client";

import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import { useState } from "react";
import type { Character } from "@/lib/characters/data";

// ============== Framer Motion Variants ==============

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.22, 0.61, 0.36, 1], // easeOutExpo-like
    },
  },
};

// ============== Container — 负责 stagger ==============

export function CharacterGrid({
  characters,
}: {
  characters: Character[];
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={containerVariants}
      initial={shouldReduceMotion ? undefined : "hidden"}
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
    >
      {characters.map((char) => (
        <CharacterCard key={char.id} character={char} />
      ))}
    </motion.div>
  );
}

// ============== Individual Card ==============

function CharacterCard({ character }: { character: Character }) {
  const accent = character.colorTheme.primary;
  const bg = character.colorTheme.bg;
  const shouldReduceMotion = useReducedMotion();

  const [isHovered, setIsHovered] = useState(false);

  // 鼠标追踪 — 3D 倾斜
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(
    useTransform(mouseY, [-0.5, 0.5], [5, -5]),
    { stiffness: 220, damping: 22 }
  );
  const rotateY = useSpring(
    useTransform(mouseX, [-0.5, 0.5], [-5, 5]),
    { stiffness: 220, damping: 22 }
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const x = (e.clientX - rect.left - w / 2) / (w / 2);
    const y = (e.clientY - rect.top - h / 2) / (h / 2);
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  return (
    <motion.div variants={cardVariants} className="perspective-1000">
      <Link href={`/chat/${character.id}`} className="block">
        <motion.div
          style={{
            rotateX: shouldReduceMotion ? 0 : rotateX,
            rotateY: shouldReduceMotion ? 0 : rotateY,
            transformStyle: "preserve-3d",
          }}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          className="group relative flex flex-col bg-white rounded-lg overflow-hidden border border-[#E4E4E7] hover:border-[#D4D4D8] transition-colors"
        >
          {/* 顶部 4px 色条 */}
          <div className="h-1 shrink-0" style={{ backgroundColor: accent }} />

          {/* 头像区 */}
          <div
            className="relative h-44 flex items-center justify-center overflow-hidden"
            style={{
              background: `linear-gradient(180deg, ${bg} 0%, #FFFFFF 100%)`,
            }}
          >
            {/* 背景浮动光斑 */}
            <motion.div
              className="absolute -right-6 -top-6 w-20 h-20 rounded-full blur-xl"
              style={{ backgroundColor: accent }}
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      scale: [1, 1.3, 1],
                      opacity: [0.08, 0.18, 0.08],
                    }
              }
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "linear",
              }}
            />

            {/* 头像 + 光晕 */}
            <motion.div
              className="relative"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
              transition={{ type: "spring", stiffness: 280, damping: 18 }}
            >
              {/* hover 光晕 — 旋转扩散 */}
              <motion.div
                className="absolute -inset-3 rounded-full opacity-0 blur-lg"
                style={{
                  background: `conic-gradient(from 0deg, ${accent}, transparent 60%)`,
                }}
                animate={
                  isHovered && !shouldReduceMotion
                    ? {
                        rotate: 360,
                        scale: [1, 1.12, 1],
                        opacity: [0, 0.9, 0],
                      }
                    : { rotate: 0, scale: 1, opacity: 0 }
                }
                transition={
                  isHovered && !shouldReduceMotion
                    ? {
                        rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                        scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                        opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                      }
                    : { duration: 0.3 }
                }
              />

              {/* 圆形头像 */}
              <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-white shadow-sm">
                <Image
                  src={character.avatar}
                  alt={character.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            </motion.div>
          </div>

          {/* hairline divider */}
          <div className="border-t border-[#E4E4E7]" />

          {/* 文字区 */}
          <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-[#18181B]">
              {character.name}
            </h2>

            <p className="text-[13px] text-[#71717A] leading-relaxed">
              {character.identity.split(" · ")[0]}
              <span className="mx-1.5 text-[#D4D4D8]">·</span>
              {character.personalityTags.slice(0, 2).join(" · ")}
            </p>

            <p className="text-[13px] text-[#52525B] line-clamp-2 leading-relaxed">
              {character.catchphrase}
            </p>

            {/* CTA — hover 时微微上移 */}
            <div className="flex justify-end pt-1">
              <motion.span
                className="text-sm font-medium"
                style={{ color: accent }}
                animate={
                  isHovered && !shouldReduceMotion
                    ? { x: 3 }
                    : { x: 0 }
                }
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                进入对话
              </motion.span>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
