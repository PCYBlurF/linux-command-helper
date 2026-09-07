import type { Command } from "../data/commands";

interface Props {
  command: Command;
  isFav: boolean;
  onToggleFav: (cmd: string) => void;
  onOpen: (cmd: Command) => void;
  index?: number;
  active?: boolean;
}

export function CommandCard({ command, isFav, onToggleFav, onOpen, index, active }: Props) {
  return (
    <button
      className={`card${active ? " active" : ""}`}
      data-cmd-index={index}
      onClick={() => onOpen(command)}
    >
      <div className="card-head">
        <span className="card-icon">{command.icon}</span>
        <span className="card-cmd">{command.cmd}</span>
        <span
          className={`fav-star ${isFav ? "active" : ""}`}
          role="button"
          title={isFav ? "取消收藏" : "收藏"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav(command.cmd);
          }}
        >
          {isFav ? "★" : "☆"}
        </span>
      </div>
      <p className="card-desc">{command.desc}</p>
      <div className="card-foot">
        <span className="card-cat">{command.cat}</span>
        <span className="card-example">{command.example}</span>
      </div>
    </button>
  );
}
