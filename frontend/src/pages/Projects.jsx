import { useContent } from "../context/ContentContext";
import Card3D from "../components/Card3D";

export default function Projects() {
  const { content } = useContent();
  const items = content?.projects?.items || [];

  return (
    <section className="section">
      <h2 className="section-title">Projects</h2>
      <div className="cards-grid">
        {items.map((p, i) => (
          <Card3D key={i} className="gsap-reveal">
            {p.image_url ? (
              <img src={p.image_url} alt={p.title}
                   style={{ width: "100%", borderRadius: 12, marginBottom: 14, objectFit: "cover", maxHeight: 160 }} />
            ) : null}
            <h3>{p.title}</h3>
            <p className="muted" style={{ marginBottom: 10, lineHeight: 1.6 }}>{p.description}</p>
            <div>
              {(p.tech || []).map((t) => (
                <span key={t} className="tech-chip">{t}</span>
              ))}
            </div>
            {p.link ? (
              <a href={p.link} target="_blank" rel="noreferrer"
                 style={{ display: "inline-block", marginTop: 14, color: "var(--accent-2)" }}>
                View project →
              </a>
            ) : null}
          </Card3D>
        ))}
      </div>
      {!items.length && <p className="muted">No projects yet. Add them from the Admin page.</p>}
    </section>
  );
}
