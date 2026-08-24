import { useCallback, useState } from "react";

const FAV_KEY = "lch-favorites";

function readFavs(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

// 收藏管理：使用 localStorage 持久化，重启后保留。
export function useFavorites() {
  const [favs, setFavs] = useState<Set<string>>(() => readFavs());

  const toggleFav = useCallback((cmd: string) => {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(cmd)) next.delete(cmd);
      else next.add(cmd);
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const isFav = useCallback((cmd: string) => favs.has(cmd), [favs]);

  return { favs, toggleFav, isFav, favCount: favs.size };
}
