"use client";
// Bottom sheet you can drag by its handle: half height -> full height, or down to close.
// `startDrag` lets an outside handle (the map's "around here" bar) hand off a drag already in progress.
import { useEffect, useRef, useState, type ReactNode } from "react";

type Snap = "half" | "full";
const HEIGHT: Record<Snap, number> = { half: 0.6, full: 0.92 };

export default function DragSheet({ open, onClose, children, startY }: { open: boolean; onClose: () => void; children: ReactNode; startY?: number | null }) {
  const [snap, setSnap] = useState<Snap>("half");
  const [dy, setDy] = useState(0);
  const drag = useRef<{ y: number; active: boolean }>({ y: 0, active: false });

  useEffect(() => { if (open) { setSnap("half"); setDy(0); } }, [open]);

  // Continue a drag that started on the outside handle.
  useEffect(() => {
    if (!open || startY == null) return;
    drag.current = { y: startY, active: true };
    const move = (e: PointerEvent) => onMove(e.clientY);
    const up = () => onEnd();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [open, startY]); // eslint-disable-line react-hooks/exhaustive-deps

  function onStart(y: number) { drag.current = { y, active: true }; }
  function onMove(y: number) { if (drag.current.active) setDy(y - drag.current.y); }
  function onEnd() {
    if (!drag.current.active) return;
    drag.current.active = false;
    const h = window.innerHeight;
    setDy((d) => {
      if (d < -h * 0.12) setSnap("full");
      else if (d > h * 0.12) { if (snap === "full") setSnap("half"); else onClose(); }
      return 0;
    });
  }

  if (!open) return null;
  const base = HEIGHT[snap] * (typeof window !== "undefined" ? window.innerHeight : 800);
  const height = Math.max(120, Math.min(base - dy, (typeof window !== "undefined" ? window.innerHeight : 800) * 0.96));

  return (
    <div className="backdrop" onClick={onClose}>
      <div
        className="bottom-sheet drag-sheet"
        style={{ height, transition: drag.current.active ? "none" : "height .25s ease" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="drag-handle"
          onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture(e.pointerId); onStart(e.clientY); }}
          onPointerMove={(e) => onMove(e.clientY)}
          onPointerUp={onEnd}
          onPointerCancel={onEnd}
        >
          <span className="grip" />
        </div>
        <div className="drag-body">{children}</div>
      </div>
    </div>
  );
}
