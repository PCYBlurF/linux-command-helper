interface Props {
  query: string;
  onQuery: (q: string) => void;
}

export function SearchBar({ query, onQuery }: Props) {
  return (
    <div className="search-wrap">
      <span className="search-icon">🔍</span>
      <input
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
    </div>
  );
}
