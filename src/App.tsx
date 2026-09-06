import { useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { COMMANDS, type Command } from "./data/commands";
import { searchCommands } from "./lib/search";
import { useFavorites } from "./hooks/useFavorites";
import { useTheme } from "./hooks/useTheme";
import { useBackground } from "./hooks/useBackground";
import { useAutostart } from "./hooks/useAutostart";
import { Sidebar } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { CommandGrid } from "./components/CommandGrid";
import { CommandDetail } from "./components/CommandDetail";
import { GenerateModal } from "./components/GenerateModal";
import { SettingsModal } from "./components/SettingsModal";
import { ScrollArea } from "./components/ScrollArea";

const ALL = "全部";
const FAV = "收藏";

export default function App() {
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>(ALL);
  const [selectedCmd, setSelectedCmd] = useState<Command | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { favs, toggleFav, isFav, favCount } = useFavorites();
  const { theme, setTheme, accent, setAccent } = useTheme();
  const { bg, setBackground, imageUrl, uploadImage, clearImage } = useBackground();
  const { enabled: autoEnabled, ready: autoReady, toggle: toggleAutostart } = useAutostart();

  // 液态玻璃「高光随鼠标」：把鼠标在玻璃表面上的位置写为 CSS 变量用于高光定位。
  const handleGlassMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    const surface = el.closest<HTMLElement>(".card, .sidebar, .search-wrap");
    if (!surface) return;
    const r = surface.getBoundingClientRect();
    surface.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    surface.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const handleSelectCat = (cat: string) => {
    setSelectedCat(cat);
    setQuery("");
  };

  const handleOpenRef = (cmd: string) => {
    const c = COMMANDS.find((x) => x.cmd === cmd);
    if (c) setSelectedCmd(c);
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
    <div className="app" onMouseMove={handleGlassMove}>
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
              className="gen-open-btn"
              onClick={() => setGenOpen(true)}
              title="根据描述生成指令"
              aria-label="生成指令"
            >
              🧠 生成
            </button>
            <button
              className="ctrl-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="切换深浅色"
              aria-label="切换深浅色"
            >
              {theme === "dark" ? "🌙" : "☀️"}
            </button>
            <button
              className="ctrl-btn"
              onClick={() => setSettingsOpen(true)}
              title="设置"
              aria-label="设置"
            >
              ⚙️
            </button>
          </div>
        </header>

        <SearchBar query={query} onQuery={setQuery} />

        <section className="results">
          <ScrollArea className="results-scroll">
            <CommandGrid
              list={list}
              isEmpty={list.length === 0}
              emptyText={emptyText}
              favs={favs}
              onToggleFav={toggleFav}
              onOpen={setSelectedCmd}
            />
          </ScrollArea>
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

      {genOpen && (
        <GenerateModal onClose={() => setGenOpen(false)} onOpenRef={handleOpenRef} />
      )}

      {settingsOpen && (
        <SettingsModal
          theme={theme}
          setTheme={setTheme}
          accent={accent}
          setAccent={setAccent}
          bg={bg}
          setBackground={setBackground}
          imageUrl={imageUrl}
          onUploadImage={uploadImage}
          onClearImage={clearImage}
          autostartEnabled={autoEnabled}
          autostartReady={autoReady}
          onToggleAutostart={toggleAutostart}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
