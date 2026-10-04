import { writeFileSync, existsSync, mkdirSync } from "fs";

const BASE = "http://localhost:3000";
const OUT_DIR = "./test-output";

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

const TESTS = [
  { id: "linche", text: "嗨，我是林澈。今天天气不错，要不要一起去图书馆坐坐？" },
  { id: "fujingshen", text: "来了。文件已经签好，放在你桌上了。" },
  { id: "songxingran", text: "嘿！要不要一起去打球？今天阳光超好的！" },
  { id: "lushiyan", text: "嗯，我看下排班表。明天下午可以换班，我来帮你。" },
];

async function testCharacter(charId, text) {
  console.log(`\n🎙️  测试角色: ${charId}`);
  console.log(`   文本: ${text}`);

  const res = await fetch(`${BASE}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: text, character_id: charId }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`   ❌ HTTP ${res.status}: ${errText}`);
    return { charId, ok: false, size: 0 };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const out = `${OUT_DIR}/${charId}.mp3`;
  writeFileSync(out, buf);
  console.log(`   ✅ HTTP ${res.status} | ${buf.length} bytes → ${out}`);
  return { charId, ok: true, size: buf.length };
}

async function main() {
  console.log("等待 dev server 启动...");
  for (let i = 0; i < 20; i++) {
    try {
      await fetch(`${BASE}/api/tts`);
      break;
    } catch {
      await new Promise((s) => setTimeout(s, 1000));
    }
  }

  console.log("\n==== 角色声线端到端测试 ====\n");
  const results = [];
  for (const t of TESTS) {
    const r = await testCharacter(t.id, t.text);
    results.push(r);
  }

  console.log("\n==== 汇总 ====");
  results.forEach((r) => {
    const icon = r.ok ? "✅" : "❌";
    const size = r.ok ? `${r.size} bytes` : "FAILED";
    console.log(`  ${icon} ${r.charId.padEnd(15)} ${size}`);
  });

  const allOk = results.every((r) => r.ok);
  console.log(`\n${allOk ? "🎉 全部通过！音频文件在 test-output/ 目录下" : "⚠️ 存在失败项"}`);
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error("测试异常:", e);
  process.exit(1);
});
