import type { RefObject } from "react";

interface Props {
  query: string;
  onQuery: (q: string) => void;
  inputRef?: RefObject<HTMLInputElement>;
}

export function SearchBar({ query, onQuery, inputRef }: Props) {
  return (
    <div className="search-wrap">
      <span className="search-icon">🔍</span>
      <input
        ref={inputRef}
        className="search-input"
        type="text"
        placeholder="直接描述用途，如：压缩文件、查看日志、杀死进程、git 提交 …"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        autoFocus
      />
      {query && (
        <button className="search-clear" onClick={() => onQuery("")} title="清空">
          ✕
        </button>
      )}
      <span className="search-kb">
        <kbd>Ctrl</kbd>
        <kbd>K</kbd>
      </span>
    </div>
  );
}
