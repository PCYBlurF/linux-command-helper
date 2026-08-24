import { useEffect, useState } from "react";
import type { Command } from "../data/commands";

interface Props {
  command: Command;
  isFav: boolean;
  onToggleFav: (cmd: string) => void;
  onClose: () => void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={`copy-btn ${copied ? "ok" : ""}`}
      onClick={async () => {
        const ok = await copyText(text);
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }
      }}
    >
      {copied ? "已复制" : "复制"}
    </button>
  );
}

export function CommandDetail({ command, isFav, onToggleFav, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            <span className="card-icon">{command.icon}</span>
            <div>
              <div className="modal-cmd">{command.cmd}</div>
              <div className="modal-cat">{command.cat}</div>
            </div>
          </div>
          <div className="modal-actions">
            <button
              className={`fav-star ${isFav ? "active" : ""}`}
              title={isFav ? "取消收藏" : "收藏"}
              onClick={() => onToggleFav(command.cmd)}
            >
              {isFav ? "★" : "☆"}
            </button>
            <button className="modal-close" onClick={onClose} title="关闭">
              ✕
            </button>
          </div>
        </div>

        <div className="modal-body">
          <p className="detail-desc">{command.desc}</p>

          <div className="detail-section">
            <div className="detail-label">语法</div>
            <div className="detail-syntax">{command.syntax}</div>
          </div>

          {command.options.length > 0 && (
            <div className="detail-section">
              <div className="detail-label">参数说明</div>
              <table className="options-table">
                <tbody>
                  {command.options.map(([flag, note], i) => (
                    <tr key={i}>
                      <td className="opt-flag">{flag}</td>
                      <td className="opt-note">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="detail-section">
            <div className="detail-label">示例</div>
            <div className="detail-example">
              <code>{command.example}</code>
              <CopyButton text={command.example} />
            </div>
          </div>

          {command.keywords.length > 0 && (
            <div className="detail-section">
              <div className="detail-label">搜索关键词</div>
              <div className="keyword-list">
                {command.keywords.map((k) => (
                  <span key={k} className="keyword-tag">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
