import { useState } from "react";
import { useContent } from "../context/ContentContext";
import Card3D from "../components/Card3D";

// Map skill names to Devicon (MIT-licensed icon portal) slugs
const SLUG_MAP = {
  "c++": "cplusplus", "c#": "csharp", "node.js": "nodejs", "nodejs": "nodejs",
  "next.js": "nextjs", "nextjs": "nextjs", "three.js": "threejs", "threejs": "threejs",
  "html": "html5", "css": "css3", "postgres": "postgresql", "postgresql": "postgresql",
  "aws": "amazonwebservices", "google cloud": "googlecloud", "gcp": "googlecloud",
  "express": "express", "objectivec": "objectivec", "object pascal": "objectpascal",
};

function techSlug(name) {
  const n = (name || "").toLowerCase().trim();
  return SLUG_MAP[n] || n.replace(/[^a-z0-9]/g, "");
}

/** Tech logo from the Devicon portal with graceful letter fallback. */
function TechIcon({ name, size = 46 }) {
  const [stage, setStage] = useState(0); // 0 = original, 1 = plain, 2 = fallback
  const slug = techSlug(name);
  const base = `https://cdn.jsdelivr.net/gh/devicon/devicon@latest/icons/${slug}/${slug}`;
  if (stage >= 2) {
    return (
      <div style={{ width: size, height: size, borderRadius: 12, background: "var(--grad)",
                    display: "grid", placeItems: "center", color: "#fff",
                    fontWeight: 800, fontSize: size * 0.38 }}>
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img src={`${base}-${stage === 0 ? "original" : "plain"}.svg`} alt={name}
         width={size} height={size} loading="lazy"
         style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.35))" }}
         onError={() => setStage((s) => s + 1)} />
  );
}

export default function Skills() {
  const { content } = useContent();
  const items = content?.skills?.items || [];

  return (
    <section className="section">
      <h2 className="section-title">My Skills</h2>
      <div className="cards-grid">
        {items.map((s, i) => (
          <Card3D key={i} className="gsap-reveal">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <TechIcon name={s} size={46} />
              <h3 style={{ fontSize: "1.05rem" }}>{s}</h3>
            </div>
          </Card3D>
        ))}
      </div>
      {!items.length && <p className="muted">No skills yet. Add them from the Admin page.</p>}
    </section>
  );
}
