import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { COMMANDS, type Command } from "./data/commands";
import { searchCommands } from "./lib/search";
import { useFavorites } from "./hooks/useFavorites";
import { useTheme } from "./hooks/useTheme";
import { useGlass } from "./hooks/useGlass";
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const [version, setVersion] = useState("");
  const { favs, toggleFav, isFav, favCount } = useFavorites();
  const { theme, setTheme, accent, setAccent } = useTheme();
  const { glass, setGlass } = useGlass(theme);
  const {
    bg,
    setBackground,
    images,
    activeImageId,
    uploadImage,
    selectImage,
    removeImage,
    clearImage,
  } = useBackground();
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

  // 结果列表变化（切分类 / 搜索 / 收藏变化）时重置键盘焦点索引。
  useEffect(() => {
    setActiveIndex(-1);
  }, [query, selectedCat, favs]);

  // 让当前高亮的卡片滚动到可视区。
  useEffect(() => {
    if (activeIndex < 0) return;
    document
      .querySelector(`[data-cmd-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // 读取应用版本号，并同步到窗口标题栏，方便识别某个安装是哪个版本。
  useEffect(() => {
    let alive = true;
    getVersion()
      .then((v) => {
        if (!alive) return;
        setVersion(v);
        getCurrentWindow()
          .setTitle(`Linux 指令速查助手 v${v}`)
          .catch(() => {});
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 全局键盘导航：Ctrl/Cmd+K 聚焦搜索；搜索框内 ↑↓ 移动高亮、Enter 打开、Esc 失焦。
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    // 有弹窗打开时交给弹窗自己的键盘处理。
    if (selectedCmd || genOpen || settingsOpen) return;

    const k = e.key;
    const mod = e.ctrlKey || e.metaKey;

    if (mod && k.toLowerCase() === "k") {
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
      setActiveIndex(list.length ? 0 : -1);
      return;
    }

    if (document.activeElement !== searchRef.current) return;

    if (k === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev >= list.length - 1 ? 0 : prev + 1));
    } else if (k === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? list.length - 1 : prev - 1));
    } else if (k === "Enter") {
      const target = activeIndex >= 0 ? activeIndex : 0;
      const c = list[target];
      if (c) {
        e.preventDefault();
        setSelectedCmd(c);
      }
    } else if (k === "Escape") {
      searchRef.current?.blur();
      setActiveIndex(-1);
    }
  };

  return (
    <div className="app" onMouseMove={handleGlassMove} onKeyDown={handleKeyDown}>
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
            {version && <span className="app-version">v{version}</span>}
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

        <SearchBar query={query} onQuery={setQuery} inputRef={searchRef} />

        <p className="kb-hint">
          <kbd>Ctrl</kbd>+<kbd>K</kbd> 聚焦搜索 · <kbd>↑</kbd>
          <kbd>↓</kbd> 选择 · <kbd>Enter</kbd> 打开 · <kbd>Esc</kbd> 返回
        </p>

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
          glass={glass}
          setGlass={setGlass}
          bg={bg}
          setBackground={setBackground}
          images={images}
          activeImageId={activeImageId}
          onUploadImage={uploadImage}
          onSelectImage={selectImage}
          onRemoveImage={removeImage}
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
