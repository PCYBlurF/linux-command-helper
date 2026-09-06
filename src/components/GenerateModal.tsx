import { useState } from "react";
import { generateCommand, type GeneratedCommand } from "../lib/generate";
import { CommandGenerator } from "./CommandGenerator";

interface Props {
  onClose: () => void;
  onOpenRef: (cmd: string) => void;
}

export function GenerateModal({ onClose, onOpenRef }: Props) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<GeneratedCommand | null>(null);

  const run = () => {
    const q = input.trim();
    if (q) setResult(generateCommand(q));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal gen-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            <span className="settings-head-icon">🧠</span>
            <div>
              <div className="settings-title">生成指令</div>
              <div className="gen-modal-sub">描述你的需求，自动生成可运行的 Linux 命令</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} title="关闭">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="gen-input-row">
            <input
              className="gen-input"
              type="text"
              placeholder="如：杀掉端口 8080 的进程 / 压缩 /home 目录 / 查看 30 天没改的日志…"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setResult(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  run();
                }
              }}
              autoFocus
            />
            <button className="gen-run" onClick={run} disabled={!input.trim()}>
              ⚡ 生成
            </button>
          </div>

          {result ? (
            <CommandGenerator
              generated={result}
              onClose={() => setResult(null)}
              onOpenRef={onOpenRef}
              disableEscape
            />
          ) : (
            <p className="gen-empty-hint">
              {input.trim()
                ? "点「⚡ 生成」或按回车，获取对应命令。"
                : "输入需求后点「⚡ 生成」，例如：找出并删除 /tmp 下 30 天没改过的日志。"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
