/**
 * 角色 → 声线映射
 * 
 * minimax/speech-2.8-turbo 在 OpenRouter 上可用的男声 voice：
 *   Deep_Voice_Man    - 低沉磁性，成熟稳重
 *   Elegant_Man       - 优雅磁性，略带距离感
 *   Casual_Guy        - 随性阳光，年轻开朗
 *   Decent_Boy        - 正派温柔，青涩青年
 *   Young_Knight      - 年轻活力，少年感
 *   Patient_Man       - 耐心温和，可靠暖男
 *   Determined_Man    - 果断坚定，有主见
 *   Imposing_Manner   - 气场十足，有压迫感
 *   male-qn-qingse    - 青涩青年（minimax 原生 voice_id）
 *   male-qn-jingying  - 精英青年（minimax 原生 voice_id）
 */

export interface CharacterVoice {
  character_id: string;
  name: string;
  voice: string;
  description: string;
}

export const CHARACTER_VOICES: Record<string, CharacterVoice> = {
  linche: {
    character_id: "linche",
    name: "林澈",
    voice: "Decent_Boy",
    description: "大学学长，温柔感性，正派温暖的青年音",
  },
  fujingshen: {
    character_id: "fujingshen",
    name: "傅景深",
    voice: "Elegant_Man",
    description: "年轻总裁，外冷内热，优雅磁性略带距离感",
  },
  songxingran: {
    character_id: "songxingran",
    name: "宋星燃",
    voice: "Young_Knight",
    description: "校外挚友，阳光治愈，充满活力的少年音",
  },
  lushiyan: {
    character_id: "lushiyan",
    name: "陆时衍",
    voice: "Deep_Voice_Man",
    description: "兼职搭档，成熟稳重，低沉可靠的低音",
  },
};

/**
 * 根据 character_id 查找对应声线
 * @param characterId 角色 ID（linche | fujingshen | songxingran | lushiyan）
 * @returns voice 名称，找不到则返回 null
 */
export function getVoiceByCharacter(characterId: string): string | null {
  const char = CHARACTER_VOICES[characterId.toLowerCase()];
  return char?.voice ?? null;
}

/**
 * 列出所有已配置的角色声线
 */
export function listCharacterVoices(): CharacterVoice[] {
  return Object.values(CHARACTER_VOICES);
}
