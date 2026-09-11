import { useContent } from "../context/ContentContext";
import Card3D from "../components/Card3D";

export default function Certifications() {
  const { content } = useContent();
  const items = content?.certifications?.items || [];

  return (
    <section className="section">
      <h2 className="section-title">Certifications</h2>
      <div className="cards-grid">
        {items.map((c, i) => (
          <Card3D key={i} className="gsap-reveal">
            <h3>🏅 {c.title}</h3>
            <p className="muted" style={{ margin: "6px 0" }}>
              {c.issuer} {c.year ? `· ${c.year}` : ""}
            </p>
            {c.link ? (
              <a href={c.link} target="_blank" rel="noreferrer" style={{ color: "var(--accent-2)" }}>
                View certificate →
              </a>
            ) : null}
          </Card3D>
        ))}
      </div>
      {!items.length && <p className="muted">No certifications yet.</p>}
    </section>
  );
}
