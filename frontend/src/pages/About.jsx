import { useContent } from "../context/ContentContext";
import Card3D from "../components/Card3D";

export default function About() {
  const { content } = useContent();
  const profile = content?.profile || {};
  const about = content?.about || {};

  return (
    <section className="section">
      <h2 className="section-title">{about.heading || "About Me"}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 32, alignItems: "start" }}>
        {profile.profile_image_url ? (
          <img src={profile.profile_image_url} alt={profile.name}
               style={{ width: 180, height: 180, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--accent)" }} />
        ) : (
          <div style={{ width: 180, height: 180, borderRadius: "50%", background: "var(--grad)", opacity: 0.4 }} />
        )}
        <div>
          {(about.paragraphs || ["Nothing here yet — the admin can add text from the Admin page."]).map((p, i) => (
            <p key={i} className="muted gsap-reveal" style={{ marginBottom: 14, lineHeight: 1.8 }}>
              {p}
            </p>
          ))}
          {profile.resume_url ? (
            <a className="btn" href={profile.resume_url} download target="_blank" rel="noreferrer" style={{ marginTop: 10 }}>
              ⬇ Download Resume
            </a>
          ) : null}
        </div>
      </div>

      <Card3D className="gsap-reveal" >
        <h3 style={{ marginBottom: 8 }}>Quick facts</h3>
        <p className="muted">
          <strong>Role:</strong> {profile.title || "—"}<br />
          <strong>Email:</strong> {content?.social?.email || "—"}
        </p>
      </Card3D>
    </section>
  );
}
