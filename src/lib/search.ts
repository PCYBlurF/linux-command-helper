import { COMMANDS, type Command } from "../data/commands";

function tokenize(query: string): string[] {
  return query.toLowerCase().trim().split(/[\s,，。、|;；:：]+/).filter(Boolean);
}

function norm(s: string): string {
  return s.toLowerCase();
}

// 移植自源项目的模糊搜索评分逻辑：
// 精确指令名最优先，其次按 指令名包含 / 描述包含 / 关键词包含 加权，
// 并对无空格的组合中文（如“实时看cpu”）做整串匹配。
export function searchCommands(query: string): Command[] {
  const raw = norm(query);
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const scored: { cmd: Command; score: number }[] = [];
  COMMANDS.forEach((c) => {
    let score = 0;
    const name = norm(c.cmd);
    const desc = norm(c.desc);
    const kw = c.keywords.map(norm);

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

    if (score > 0) scored.push({ cmd: c, score });
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.cmd);
}
