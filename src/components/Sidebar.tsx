import { CATEGORIES } from "../data/commands";
import { ScrollArea } from "./ScrollArea";

interface Props {
  selectedCat: string;
  onSelect: (cat: string) => void;
  favCount: number;
  totalCount: number;
}

const ALL = "全部";
const FAV = "收藏";

export function Sidebar({ selectedCat, onSelect, favCount, totalCount }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-title">
        <span className="sidebar-logo">⌨️</span>
        <div>
          <div className="sidebar-name">Linux 指令速查</div>
          <div className="sidebar-sub">离线 · 154 条常用指令</div>
        </div>
      </div>
      <ScrollArea className="category-nav" wheelGain={1.8}>
        <button
          className={`nav-item ${selectedCat === ALL ? "active" : ""}`}
          onClick={() => onSelect(ALL)}
        >
          <span className="nav-emoji">📂</span>
          <span className="nav-name">全部指令</span>
          <span className="nav-num">{totalCount}</span>
        </button>
        <button
          className={`nav-item ${selectedCat === FAV ? "active" : ""}`}
          onClick={() => onSelect(FAV)}
        >
          <span className="nav-emoji">⭐</span>
          <span className="nav-name">我的收藏</span>
          <span className="nav-num">{favCount}</span>
        </button>
        <div className="nav-divider" />
        {CATEGORIES.map((cat) => (
          <button
            key={cat.name}
            className={`nav-item ${selectedCat === cat.name ? "active" : ""}`}
            onClick={() => onSelect(cat.name)}
          >
            <span className="nav-emoji">{cat.emoji}</span>
            <span className="nav-name">{cat.name}</span>
            <span className="nav-num">{cat.count}</span>
          </button>
        ))}
      </ScrollArea>
    </aside>
  );
}
