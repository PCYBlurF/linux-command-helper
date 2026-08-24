import { useEffect, useState } from "react";

export const ACCENTS = {
  green: "#4ade80",
  blue: "#38bdf8",
  purple: "#a78bfa",
  teal: "#2dd4bf",
  orange: "#fb923c",
  red: "#f87171",
} as const;

export type AccentKey = keyof typeof ACCENTS;
export type Theme = "dark" | "light";

const THEME_KEY = "lch-theme";
const ACCENT_KEY = "lch-accent";

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function readAccent(): AccentKey {
  try {
    const a = localStorage.getItem(ACCENT_KEY);
    if (a && a in ACCENTS) return a as AccentKey;
  } catch {
    /* ignore */
  }
  return "green";
}

// 主题（深浅）与主题色管理，同样持久化到 localStorage。
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [accent, setAccentState] = useState<AccentKey>(readAccent);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    try {
      localStorage.setItem(ACCENT_KEY, accent);
    } catch {
      /* ignore */
    }
  }, [accent]);

  return {
    theme,
    setTheme: setThemeState,
    accent,
    setAccent: setAccentState,
  };
}
