import { useRef, useCallback, useState, useEffect } from 'react';

const POS_KEY = 'devDebugHintPos';
const DRAG_THRESHOLD = 4; // px — movement beyond this counts as a drag

function loadPos(): { x: number; y: number } | null {
  try {
    const raw = sessionStorage.getItem(POS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export default function DevDebugHint() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const startPt = useRef({ x: 0, y: 0 });
  const offset = useRef({ x: 0, y: 0 });
  const elRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const saved = loadPos();
    setPos(saved ?? { x: 16, y: window.innerHeight - 52 });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    didDrag.current = false;
    startPt.current = { x: e.clientX, y: e.clientY };
    offset.current = { x: e.clientX - (pos?.x ?? 0), y: e.clientY - (pos?.y ?? 0) };
    elRef.current?.setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startPt.current.x;
    const dy = e.clientY - startPt.current.y;
    if (!didDrag.current && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
    didDrag.current = true;
    const nx = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - offset.current.x));
    const ny = Math.max(0, Math.min(window.innerHeight - 36, e.clientY - offset.current.y));
    setPos({ x: nx, y: ny });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    elRef.current?.releasePointerCapture(e.pointerId);
    if (didDrag.current) {
      const nx = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - offset.current.x));
      const ny = Math.max(0, Math.min(window.innerHeight - 36, e.clientY - offset.current.y));
      const final = { x: nx, y: ny };
      setPos(final);
      sessionStorage.setItem(POS_KEY, JSON.stringify(final));
    }
  }, []);

  const onClick = useCallback((e: React.MouseEvent) => {
    // If the user dragged, suppress navigation
    if (didDrag.current) {
      e.preventDefault();
    }
  }, []);

  if (!import.meta.env.DEV || !pos) return null;

  return (
    <a
      ref={elRef}
      href="/#/debug"
      className="dev-debug-fab"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
    >
      Debug
    </a>
  );
}
