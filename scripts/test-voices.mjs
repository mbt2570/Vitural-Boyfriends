import { config } from "dotenv";
config({ path: ".env.local" });

const API_KEY = process.env.TTS_API_KEY;
const API_BASE = process.env.TTS_API_BASE ?? "https://openrouter.ai/api/v1";
const MODEL = process.env.TTS_MODEL ?? "minimax/speech-2.8-turbo";

if (!API_KEY) {
  console.error("TTS_API_KEY not found in .env.local");
  process.exit(1);
}

const CANDIDATE_VOICES = [
  // preset_general_ 前缀
  "preset_general_decent_boy",
  "preset_general_patient_man",
  "preset_general_elegant_man",
  "preset_general_deep_voice_man",
  "preset_general_casual_guy",
  "preset_general_young_knight",
  "preset_general_determined_man",
  "preset_general_imposing_manner",
  "preset_general_wise_woman",
  "preset_general_calm_woman",
  "preset_general_friendly_person",
  "preset_general_inspirational_girl",
  "preset_general_lovely_girl",
  "preset_general_lively_girl",
  "preset_general_sweet_girl_2",
  "preset_general_exuberant_girl",
  // 无前缀
  "Deep_Voice_Man",
  "Casual_Guy",
  "Young_Knight",
  "Elegant_Man",
  "Decent_Boy",
  "Patient_Man",
  "Determined_Man",
  "Imposing_Manner",
  // minimax 原始 voice_id
  "male-qn-qingse",
  "male-qn-jingying",
  // 中文名
  "青涩青年-男",
  "精英青年-男",
];

async function testVoice(voice) {
  try {
    const r = await fetch(`${API_BASE}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: "你好，很高兴认识你。",
        voice,
        response_format: "mp3",
      }),
    });
    if (r.ok) {
      return { ok: true, size: r.headers.get("content-length") ?? "?" };
    } else {
      let detail = "";
      try {
        const j = await r.json();
        detail = j?.error?.message ?? j?.message ?? JSON.stringify(j).slice(0, 100);
      } catch {
        detail = (await r.text()).slice(0, 100);
      }
      return { ok: false, error: `${r.status} ${detail}` };
    }
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  console.log(`Testing ${CANDIDATE_VOICES.length} voices on ${MODEL}\n`);
  const results = [];

  for (const v of CANDIDATE_VOICES) {
    const res = await testVoice(v);
    results.push({ voice: v, ...res });
    const icon = res.ok ? "✅" : "❌";
    const info = res.ok ? `size=${res.size}` : res.error;
    console.log(`${icon} ${v.padEnd(40)} ${info}`);
    // 稍微间隔一下避免被限流
    await new Promise((s) => setTimeout(s, 300));
  }

  console.log("\n==== 可用声线汇总 ====");
  const ok = results.filter((r) => r.ok);
  if (ok.length === 0) {
    console.log("没有可用声线，请检查模型或 API Key");
  } else {
    ok.forEach((r) => console.log(`  ✓ ${r.voice} (size=${r.size})`));
  }
}

main().catch(console.error);
