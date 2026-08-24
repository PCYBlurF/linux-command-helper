import { useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

/**
 * 自定义滚动容器：隐藏原生滚动条，渲染可动画的玻璃滑块。
 * 支持滚轮/触摸滚动，滑块可拖动，hover 时放大 + 光晕「上浮」。
 */
export function ScrollArea({ children, className = "" }: Props) {
  const viewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ top: 0, height: 0, visible: false });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const view = viewRef.current;
    const content = contentRef.current;
    if (!view) return;

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = view;
      if (scrollHeight <= clientHeight + 1) {
        setThumb({ top: 0, height: 0, visible: false });
        return;
      }
      const height = Math.max((clientHeight / scrollHeight) * clientHeight, 36);
      const maxTop = clientHeight - height;
      const top = (scrollTop / (scrollHeight - clientHeight)) * maxTop;
      setThumb({ top, height, visible: true });
    };

    update();
    view.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(view);
    if (content) ro.observe(content);
    return () => {
      view.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const onTrackDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const view = viewRef.current;
    const track = trackRef.current;
    if (!view || !track) return;
    e.preventDefault();
    setDragging(true);

    const move = (ev: PointerEvent) => {
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
      view.scrollTop = ratio * (view.scrollHeight - view.clientHeight);
    };

    move(e as unknown as PointerEvent);
    const up = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className={`scroll-area ${className}`}>
      <div className="scroll-view" ref={viewRef}>
        <div className="scroll-content" ref={contentRef}>
          {children}
        </div>
      </div>
      {thumb.visible && (
        <div className="scroll-track" ref={trackRef} onPointerDown={onTrackDown}>
          <div
            className={`scroll-thumb${dragging ? " dragging" : ""}`}
            style={{ top: thumb.top, height: thumb.height }}
          />
        </div>
      )}
    </div>
  );
}
