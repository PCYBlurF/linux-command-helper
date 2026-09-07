import type { Command } from "../data/commands";
import { CommandCard } from "./CommandCard";

interface Props {
  list: Command[];
  isEmpty: boolean;
  emptyText: string;
  favs: Set<string>;
  onToggleFav: (cmd: string) => void;
  onOpen: (cmd: Command) => void;
  activeIndex?: number;
}

export function CommandGrid({ list, isEmpty, emptyText, favs, onToggleFav, onOpen, activeIndex }: Props) {
  if (isEmpty) {
    return <div className="empty-state">{emptyText}</div>;
  }
  return (
    <div className="grid">
      {list.map((c, i) => (
        <CommandCard
          key={c.cmd}
          command={c}
          isFav={favs.has(c.cmd)}
          onToggleFav={onToggleFav}
          onOpen={onOpen}
          index={i}
          active={i === activeIndex}
        />
      ))}
    </div>
  );
}
