import type { Command } from "../data/commands";

interface Props {
  command: Command;
  isFav: boolean;
  onToggleFav: (cmd: string) => void;
  onOpen: (cmd: Command) => void;
}

export function CommandCard({ command, isFav, onToggleFav, onOpen }: Props) {
  return (
    <button className="card" onClick={() => onOpen(command)}>
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
