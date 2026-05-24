import { useEffect, useRef, useState, type ReactNode } from "react";

type Pos = { x: number; y: number };

interface Props {
  storageKey: string;
  defaultRight: number; // px from right
  defaultBottom: number; // px from bottom
  size: number; // approx button size for clamping
  zIndex?: number;
  children: (api: { dragging: boolean; onClickGuard: (fn: () => void) => (e: React.MouseEvent) => void }) => ReactNode;
}

export function DraggableFab({ storageKey, defaultRight, defaultBottom, size, zIndex = 40, children }: Props) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);
  const movedRef = useRef(false);
  const startRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // initialize position from storage or defaults
  useEffect(() => {
    if (typeof window === "undefined") return;
    const compute = (): Pos => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const p = JSON.parse(raw) as Pos;
          return clamp(p, size);
        }
      } catch {}
      return {
        x: window.innerWidth - defaultRight - size,
        y: window.innerHeight - defaultBottom - size,
      };
    };
    setPos(compute());
    const onResize = () => setPos((p) => (p ? clamp(p, size) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [storageKey, defaultRight, defaultBottom, size]);

  function clamp(p: Pos, sz: number): Pos {
    if (typeof window === "undefined") return p;
    const maxX = window.innerWidth - sz - 4;
    const maxY = window.innerHeight - sz - 4;
    return { x: Math.max(4, Math.min(p.x, maxX)), y: Math.max(4, Math.min(p.y, maxY)) };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!pos) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    movedRef.current = false;
    startRef.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
    setDragging(true);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.px;
    const dy = e.clientY - startRef.current.py;
    if (!movedRef.current && Math.hypot(dx, dy) > 5) movedRef.current = true;
    if (movedRef.current) {
      e.preventDefault();
      const next = clamp({ x: startRef.current.ox + dx, y: startRef.current.oy + dy }, size);
      setPos(next);
    }
  }
  function onPointerUp() {
    if (movedRef.current && pos) {
      try { localStorage.setItem(storageKey, JSON.stringify(pos)); } catch {}
    }
    startRef.current = null;
    setDragging(false);
  }

  function onClickGuard(fn: () => void) {
    return (e: React.MouseEvent) => {
      if (movedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        movedRef.current = false;
        return;
      }
      fn();
    };
  }

  if (!pos) return null;

  return (
    <div
      ref={ref}
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex, touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children({ dragging, onClickGuard })}
    </div>
  );
}
