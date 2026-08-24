// 一次性抽取脚本：从源 HTML 提取 COMMANDS 数组，生成 src/data/commands.ts
// 用法: node scripts/extract-data.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "..", "..", "linux指令查询器", "linux-command-helper.html");
const OUT = resolve(__dirname, "..", "src", "data", "commands.ts");

const html = readFileSync(SRC, "utf8");

const startIdx = html.indexOf("const COMMANDS = [");
if (startIdx < 0) throw new Error("未找到 const COMMANDS = [");
const start = html.indexOf("[", startIdx);

// 定位与该左括号匹配的右括号
let depth = 0;
let end = -1;
for (let i = start; i < html.length; i++) {
  const ch = html[i];
  if (ch === "[") depth++;
  else if (ch === "]") {
    depth--;
    if (depth === 0) { end = i; break; }
  }
}
if (end < 0) throw new Error("未找到 COMMANDS 的结束括号");

const block = html.slice(start, end + 1);
const data = eval(block); // 仅含字符串字面量数组，安全

if (!Array.isArray(data)) throw new Error("解析结果不是数组");

// 校验字段完整性
const required = ["cmd", "cat", "icon", "desc", "syntax", "options", "example", "keywords"];
for (const c of data) {
  for (const k of required) {
    if (!(k in c)) throw new Error(`指令 ${c.cmd} 缺少字段 ${k}`);
  }
}

// 分类顺序（按首次出现顺序）+ 每个分类最常见的 emoji
const catOrder = [];
const catEmoji = {};
const catCount = {};
for (const c of data) {
  if (!catOrder.includes(c.cat)) catOrder.push(c.cat);
  if (!catEmoji[c.cat]) catEmoji[c.cat] = {};
  catEmoji[c.cat][c.icon] = (catEmoji[c.cat][c.icon] || 0) + 1;
  catCount[c.cat] = (catCount[c.cat] || 0) + 1;
}
const CATEGORY_EMOJI = {};
for (const cat of catOrder) {
  const topIcon = Object.entries(catEmoji[cat]).sort((a, b) => b[1] - a[1])[0][0];
  CATEGORY_EMOJI[cat] = topIcon;
}

const esc = (s) => JSON.stringify(s);
const cmdLines = data.map((c) => {
  const options = c.options
    .map((o) => `      [${esc(o[0])}, ${esc(o[1])}],`)
    .join("\n");
  return `  {
    cmd: ${esc(c.cmd)},
    cat: ${esc(c.cat)},
    icon: ${esc(c.icon)},
    desc: ${esc(c.desc)},
    syntax: ${esc(c.syntax)},
    options: [
${options}
    ],
    example: ${esc(c.example)},
    keywords: [${c.keywords.map(esc).join(", ")}],
  },`;
});

const cats = catOrder
  .map((cat) => `  { name: ${esc(cat)}, emoji: ${esc(CATEGORY_EMOJI[cat])}, count: ${catCount[cat]} },`)
  .join("\n");

const ts = `// 本文件由脚本 scripts/extract-data.mjs 自动生成，请勿手动编辑。
export interface Command {
  cmd: string;
  cat: string;
  icon: string;
  desc: string;
  syntax: string;
  options: [string, string][];
  example: string;
  keywords: string[];
}

export interface Category {
  name: string;
  emoji: string;
  count: number;
}

export const COMMANDS: Command[] = [
${cmdLines.join("\n")}
];

export const CATEGORIES: Category[] = [
${cats}
];
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, ts, "utf8");

console.log(`抽取完成：${data.length} 条指令，${catOrder.length} 个分类`);
console.log(`输出：${OUT}`);
