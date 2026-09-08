import { useEffect, useState } from "react";
import type { Theme } from "./useTheme";

export const GLASS_KEY = "lch-glass";
export const DEFAULT_GLASS = 50;

function readGlass(): number {
  try {
    const raw = localStorage.getItem(GLASS_KEY);
    if (raw !== null) {
      const n = Number(raw);
      if (Number.isFinite(n)) return Math.min(100, Math.max(0, Math.round(n)));
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_GLASS;
}

// 玻璃强度映射表：每个主题给出「等级 0 / 50 / 100」三个锚点（等级 50 即现有默认值，
// 这样没动过滑杆的用户看到的仍是当前玻璃效果）。
type Anchor = { level: number; bg: number; strong: number; blur: number; sat: number };
const DARK: Anchor[] = [
  { level: 0, bg: 0.0, strong: 0.0, blur: 0, sat: 100 },
  { level: 50, bg: 0.05, strong: 0.09, blur: 18, sat: 150 },
  { level: 100, bg: 0.16, strong: 0.22, blur: 30, sat: 190 },
];
const LIGHT: Anchor[] = [
  { level: 0, bg: 0.3, strong: 0.4, blur: 8, sat: 110 },
  { level: 50, bg: 0.45, strong: 0.55, blur: 16, sat: 140 },
  { level: 100, bg: 0.58, strong: 0.7, blur: 26, sat: 175 },
];

// 在锚点之间按等级做线性插值，得到该等级下的一组玻璃参数。
function interpolate(anchors: Anchor[], level: number): Anchor {
  if (level <= anchors[0].level) return anchors[0];
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (level <= b.level) {
      const t = (level - a.level) / (b.level - a.level);
      const lerp = (x: number, y: number) => x + (y - x) * t;
      return {
        level,
        bg: lerp(a.bg, b.bg),
        strong: lerp(a.strong, b.strong),
        blur: lerp(a.blur, b.blur),
        sat: lerp(a.sat, b.sat),
      };
    }
  }
  return anchors[anchors.length - 1];
}

// 液态玻璃效果度：控制主玻璃面（搜索栏 / 结果面板 / 侧栏 / 按钮等）的模糊与透明度。
// 与 useTheme 类似：持久化到 localStorage，并通过内联 CSS 变量实时生效。
export function useGlass(theme: Theme) {
  const [glass, setGlassState] = useState<number>(readGlass);

  useEffect(() => {
    const s = interpolate(theme === "dark" ? DARK : LIGHT, glass);
    const root = document.documentElement;
    root.style.setProperty("--glass-level", String(glass));
    root.style.setProperty("--glass-blur", `${Math.round(s.blur)}px`);
    root.style.setProperty("--glass-saturate", `${Math.round(s.sat)}%`);
    root.style.setProperty("--glass-bg", `rgba(255, 255, 255, ${s.bg.toFixed(3)})`);
    root.style.setProperty("--glass-bg-strong", `rgba(255, 255, 255, ${s.strong.toFixed(3)})`);
    try {
      localStorage.setItem(GLASS_KEY, String(glass));
    } catch {
      /* ignore */
    }
  }, [glass, theme]);

  return { glass, setGlass: setGlassState };
}
