interface Props {
  query: string;
  onQuery: (q: string) => void;
  onGenerate: (q: string) => void;
}

export function SearchBar({ query, onQuery, onGenerate }: Props) {
  const submit = () => {
    const q = query.trim();
    if (q) onGenerate(q);
  };
  return (
    <div className="search-wrap">
      <span className="search-icon">🔍</span>
      <input
        className="search-input"
        type="text"
        placeholder="直接描述用途，如：压缩文件、查看日志、杀死进程、git 提交 … 回车即可生成"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        autoFocus
      />
      {query && (
        <button className="search-clear" onClick={() => onQuery("")} title="清空">
          ✕
        </button>
      )}
      <button
        className="gen-btn"
        onClick={submit}
        disabled={!query.trim()}
        title="根据描述生成指令 (Enter)"
      >
        ⚡ 生成
      </button>
    </div>
  );
}
