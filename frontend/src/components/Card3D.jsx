import { useRef } from "react";

/** Glass card with a 3D tilt that follows the cursor. */
export default function Card3D({ children, className = "" }) {
  const ref = useRef(null);

  const onMove = (e) => {
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateZ(8px)`;
  };
  const onLeave = () => {
    ref.current.style.transform = "rotateY(0deg) rotateX(0deg)";
  };

  return (
    <div ref={ref} className={`glass card-3d ${className}`} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}
