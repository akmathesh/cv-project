import { useEffect, useRef, useState } from "react";

/**
 * Custom cursor: a gradient dot that tracks the mouse instantly plus a
 * trailing ring that eases behind it and expands over interactive elements.
 * Only active on devices with a fine pointer (mouse) — never on touch.
 */
export default function CursorFX() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);
    document.body.classList.add("cursorfx");

    const pos = { x: -100, y: -100 };
    const ring = { x: -100, y: -100 };
    let raf;

    const onMove = (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform =
          `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
      }
      const t = e.target;
      const interactive =
        t.closest && t.closest("a,button,input,textarea,select,label,[role='button']");
      if (ringRef.current) ringRef.current.classList.toggle("hover", !!interactive);
    };

    const loop = () => {
      ring.x += (pos.x - ring.x) * 0.16;
      ring.y += (pos.y - ring.y) * 0.16;
      if (ringRef.current) {
        ringRef.current.style.transform =
          `translate(${ring.x}px, ${ring.y}px) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      document.body.classList.remove("cursorfx");
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;
  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  );
}
