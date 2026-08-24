import { useEffect, useState } from "react";

// 背景预设。css 为应用到 body 的 background 值；"default" 使用主题默认底色。
export const BACKGROUNDS = {
  default: { label: "默认", preview: "#0f1115", css: "" },
  aurora1: { label: "极光 · 紫", preview: "linear-gradient(135deg,#0f172a,#312e81 45%,#7c3aed)", css: "linear-gradient(135deg,#0f172a,#312e81 45%,#7c3aed)" },
  aurora2: { label: "深海 · 蓝", preview: "linear-gradient(135deg,#020617,#0c4a6e 50%,#0f766e)", css: "linear-gradient(135deg,#020617,#0c4a6e 50%,#0f766e)" },
  aurora3: { label: "落日 · 暖", preview: "linear-gradient(135deg,#1c1917,#7c2d12 55%,#b45309)", css: "linear-gradient(135deg,#1c1917,#7c2d12 55%,#b45309)" },
  dusk: { label: "暮色", preview: "linear-gradient(140deg,#18181b,#3b0764 60%,#831843)", css: "linear-gradient(140deg,#18181b,#3b0764 60%,#831843)" },
  rose: { label: "玫瑰", preview: "linear-gradient(130deg,#1e1b4b,#9d174d 55%,#6d28d9)", css: "linear-gradient(130deg,#1e1b4b,#9d174d 55%,#6d28d9)" },
} as const;

export type BackgroundKey = keyof typeof BACKGROUNDS;

const BG_KEY = "lch-bg";

function readBackground(): BackgroundKey {
  try {
    const b = localStorage.getItem(BG_KEY);
    if (b && b in BACKGROUNDS) return b as BackgroundKey;
  } catch {
    /* ignore */
  }
  return "default";
}

// 背景管理：选择预设背景并持久化；同时把选择写到 <html data-bg="...">。
export function useBackground() {
  const [bg, setBgState] = useState<BackgroundKey>(readBackground);

  useEffect(() => {
    document.documentElement.dataset.bg = bg;
    try {
      localStorage.setItem(BG_KEY, bg);
    } catch {
      /* ignore */
    }
  }, [bg]);

  return { bg, setBackground: setBgState };
}
