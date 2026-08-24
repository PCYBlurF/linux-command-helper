import { useMemo, useState } from "react";
import { COMMANDS, type Command } from "./data/commands";
import { searchCommands } from "./lib/search";
import { useFavorites } from "./hooks/useFavorites";
import { useTheme, ACCENTS, type AccentKey } from "./hooks/useTheme";
import { Sidebar } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { CommandGrid } from "./components/CommandGrid";
import { CommandDetail } from "./components/CommandDetail";

const ALL = "全部";
const FAV = "收藏";

export default function App() {
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>(ALL);
  const [selectedCmd, setSelectedCmd] = useState<Command | null>(null);
  const { favs, toggleFav, isFav, favCount } = useFavorites();
  const { theme, setTheme, accent, setAccent } = useTheme();

  const handleSelectCat = (cat: string) => {
    setSelectedCat(cat);
    setQuery("");
  };

  const { list, title, emptyText } = useMemo(() => {
    const q = query.trim();
    if (q) {
      return {
        list: searchCommands(q),
        title: `搜索“${q}” · ${searchCommands(q).length} 条`,
        emptyText: "没有找到匹配的指令，换个更直白的说法试试。",
      };
    }
    if (selectedCat === ALL) {
      return { list: COMMANDS, title: "浏览全部指令", emptyText: "暂无指令。" };
    }
    if (selectedCat === FAV) {
      return {
        list: COMMANDS.filter((c) => favs.has(c.cmd)),
        title: "我的收藏 · 点击卡片查看详情",
        emptyText: "还没有收藏任何指令。在卡片右上角点 ☆ 即可收藏。",
      };
    }
    return {
      list: COMMANDS.filter((c) => c.cat === selectedCat),
      title: `${selectedCat} · 点击卡片查看详情`,
      emptyText: "该分类下暂无指令。",
    };
  }, [query, selectedCat, favs]);

  return (
    <div className="app">
      <Sidebar
        selectedCat={selectedCat}
        onSelect={handleSelectCat}
        favCount={favCount}
        totalCount={COMMANDS.length}
      />

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="app-title">Linux 指令速查助手</h1>
            <span className="app-sub">{title}</span>
          </div>
          <div className="topbar-controls">
            <button
              className="ctrl-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="切换深浅色"
            >
              {theme === "dark" ? "🌙" : "☀️"}
            </button>
            <div className="accent-picker" title="主题色">
              {(Object.keys(ACCENTS) as AccentKey[]).map((key) => (
                <button
                  key={key}
                  className={`accent-dot ${accent === key ? "active" : ""}`}
                  style={{ background: ACCENTS[key] }}
                  onClick={() => setAccent(key)}
                  aria-label={`主题色 ${key}`}
                />
              ))}
            </div>
          </div>
        </header>

        <SearchBar query={query} onQuery={setQuery} />

        <section className="results">
          <CommandGrid
            list={list}
            isEmpty={list.length === 0}
            emptyText={emptyText}
            favs={favs}
            onToggleFav={toggleFav}
            onOpen={setSelectedCmd}
          />
        </section>
      </main>

      {selectedCmd && (
        <CommandDetail
          command={selectedCmd}
          isFav={isFav(selectedCmd.cmd)}
          onToggleFav={toggleFav}
          onClose={() => setSelectedCmd(null)}
        />
      )}
    </div>
  );
}
