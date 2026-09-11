import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useContent } from "../context/ContentContext";

/**
 * Light gradient band with continuously scrolling skills and
 * feedback quotes — the "data stream" strip before the feedback form.
 */
export default function SkillMarquee({ quotes = [] }) {
  const { content } = useContent();
  const bandRef = useRef(null);

  const skills = content?.skills?.items || [];
  const items = [...skills.map((s) => ({ type: "skill", text: s })),
                 ...quotes.map((q) => ({ type: "quote", text: `“${(q.message || "").slice(0, 70)}” — ${q.name}` }))];
  const doubled = [...items, ...items]; // seamless loop

  useEffect(() => {
    gsap.fromTo(
      bandRef.current,
      { opacity: 0, scale: 0.96 },
      { opacity: 1, scale: 1, duration: 0.9, ease: "power2.out", scrollTrigger: null }
    );
  }, []);

  if (!doubled.length) return null;

  return (
    <div className="marquee-band" ref={bandRef}>
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span className="marquee-item" key={i}>
            {item.type === "skill" ? "⚡" : "💬"} {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
