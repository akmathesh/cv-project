import { useContent } from "../context/ContentContext";
import Card3D from "../components/Card3D";

export default function Skills() {
  const { content } = useContent();
  const items = content?.skills?.items || [];

  return (
    <section className="section">
      <h2 className="section-title">My Skills</h2>
      <div className="cards-grid">
        {items.map((s, i) => (
          <Card3D key={i} className="gsap-reveal" >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--grad)", display: "grid", placeItems: "center", fontSize: "1.1rem" }}>
                ⚡
              </div>
              <h3 style={{ fontSize: "1.05rem" }}>{s}</h3>
            </div>
          </Card3D>
        ))}
      </div>
      {!items.length && <p className="muted">No skills yet. Add them from the Admin page.</p>}
    </section>
  );
}
