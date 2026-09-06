import { useEffect, useState } from "react";
import type { GeneratedCommand } from "../lib/generate";
import { copyText } from "../lib/clipboard";
import type { Command } from "../data/commands";

interface Props {
  generated: GeneratedCommand;
  onClose: () => void;
  onOpenRef: (cmd: string) => void;
  disableEscape?: boolean;
}

function GenCopyButton({ text }: { text: string }) {
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

function RefChip({ cmd, onClick }: { cmd: Command; onClick: () => void }) {
  return (
    <button className="gen-ref-chip" onClick={onClick}>
      <span className="card-icon">{cmd.icon}</span>
      <span className="gen-ref-cmd">{cmd.cmd}</span>
    </button>
  );
}

export function CommandGenerator({ generated, onClose, onOpenRef, disableEscape }: Props) {
  useEffect(() => {
    if (disableEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, disableEscape]);

  return (
    <div className="gen-card">
      <div className="gen-head">
        <span className="gen-head-title">
          <span className="gen-spark">⚡</span> 已生成 · {generated.builtFrom}
        </span>
        <button className="gen-close" onClick={onClose} title="关闭">
          ✕
        </button>
      </div>

      {generated.cmd && (
        <div className="gen-command">
          <code>{generated.cmd}</code>
          <GenCopyButton text={generated.cmd} />
        </div>
      )}

      <p className="gen-desc">{generated.explanation}</p>

      {generated.danger && (
        <div className="gen-danger">
          ⚠️ 该命令会直接修改或删除数据，执行前请确认路径与目标。
        </div>
      )}

      {generated.tips && generated.tips.length > 0 && (
        <div className="gen-tips">
          {generated.tips.map((t, i) => (
            <div key={i} className="gen-tip">
              <span className="gen-tip-dot">•</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      )}

      {generated.refs.length > 0 && (
        <div className="gen-refs">
          <div className="gen-refs-label">相关指令</div>
          <div className="gen-refs-list">
            {generated.refs.map((r) => (
              <RefChip key={r.cmd} cmd={r} onClick={() => onOpenRef(r.cmd)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
