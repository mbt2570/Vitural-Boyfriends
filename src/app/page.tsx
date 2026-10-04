import { auth } from "@/auth";
import { CHARACTERS } from "@/lib/characters/data";
import { HeaderAuth } from "@/components/header-auth";
import { CharacterGrid } from "@/components/character-card";

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-[#F7F7F8]">
      {/* Header */}
      <header className="px-6 pt-10 pb-8 max-w-7xl mx-auto">
        <HeaderAuth session={session} />

        {/* Hero */}
        <div className="mt-14 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#18181B]">
            纸片人男友
          </h1>
          <p className="mt-3 text-[15px] text-[#71717A]">
            挑一个，开始对话。
          </p>
        </div>

        {/* Character Grid — framer-motion client component */}
        <CharacterGrid characters={CHARACTERS} />
      </header>

      {/* Footer */}
      <footer className="pb-10 text-center text-xs text-[#A1A1AA]">
        © 纸片人男友
      </footer>
    </main>
  );
}
