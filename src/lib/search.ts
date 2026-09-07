import { pinyin } from "pinyin-pro";
import { COMMANDS, type Command } from "../data/commands";

function tokenize(query: string): string[] {
  return query.toLowerCase().trim().split(/[\s,，。、|;；:：]+/).filter(Boolean);
}

function norm(s: string): string {
  return s.toLowerCase();
}

/** 去掉所有空白（含空格），用于全拼 / 首字母的子串匹配。 */
function stripSpaces(s: string): string {
  return s.replace(/\s+/g, "");
}

type PinyinRec = { nonSpace: string; initials: string };

// 惰性构建的拼音索引（只随库构建一次，避免每次按键重复转换）。
let pinyinIndex: PinyinRec[] | null = null;

function buildPinyinIndex(): PinyinRec[] {
  return COMMANDS.map((c) => {
    const text = [c.cmd, c.desc, ...c.keywords].join(" ");
    const syl = pinyin(text, { toneType: "none", type: "array" });
    // 全拼（去空格）与首字母串，供子串匹配。
    return {
      nonSpace: stripSpaces(syl.join("")),
      initials: stripSpaces(syl.map((s) => s[0]).join("")),
    };
  });
}

function getPinyinIndex(): PinyinRec[] {
  if (!pinyinIndex) pinyinIndex = buildPinyinIndex();
  return pinyinIndex;
}

// 移植自源项目的模糊搜索评分逻辑：
// 精确指令名最优先，其次按 指令名包含 / 描述包含 / 关键词包含 加权，
// 并对无空格的组合中文（如“实时看cpu”）做整串匹配。
// 在原有基础上增加拼音匹配：支持输入全拼（如 chakanrizhi / cha kan ri zhi）
// 或首字母缩写（如 ckrz）也能命中对应的中文关键词。
export function searchCommands(query: string): Command[] {
  const raw = norm(query);
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  // 查询的拼音：全拼（去空格）与首字母缩写。
  const qSyl = pinyin(raw, { toneType: "none", type: "array" });
  const qNonSpace = stripSpaces(qSyl.join(""));
  const qInitials = stripSpaces(qSyl.map((s) => s[0]).join(""));
  const idx = getPinyinIndex();

  const scored: { cmd: Command; score: number }[] = [];
  COMMANDS.forEach((c, i) => {
    let score = 0;
    const name = norm(c.cmd);
    const desc = norm(c.desc);
    const kw = c.keywords.map(norm);
    const rec = idx[i];

    if (name === raw) score += 1000;

    for (const t of tokens) {
      if (name === t) score += 500;
      else if (name.includes(t)) score += 120;
      if (desc.includes(t)) score += 60;
      for (const k of kw) {
        if (k.includes(t)) score += 40;
        else if (t.includes(k) && k.length >= 2) score += 20;
      }
    }

    // 针对无空格的中文组合查询（如“实时看cpu”）
    if (tokens.length <= 2) {
      for (const k of kw) {
        if (k.length >= 2 && raw.includes(k)) score += 28;
      }
      if (desc.includes(raw)) score += 45;
      if (name && name.length >= 3 && raw.indexOf(name) >= 0) score += 60;
    }

    // 拼音匹配：全拼（去空格后）子串 / 首字母缩写子串。
    if (qNonSpace.length >= 2 && rec.nonSpace.includes(qNonSpace)) score += 90;
    if (qInitials.length >= 2 && rec.initials.includes(qInitials)) score += 50;

    if (score > 0) scored.push({ cmd: c, score });
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.cmd);
}
