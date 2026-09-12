import { Link } from "react-router-dom";
import ThreeHero from "../components/ThreeHero";
import { useContent } from "../context/ContentContext";
import { downloadUrl } from "../lib/api";

export default function Home() {
  const { content } = useContent();
  const profile = content?.profile || {};
  const cta = content?.cta || {};
  const about = content?.about || {};

  return (
    <>
      {profile.banner_image_url && (
        <div style={{ position: "fixed", inset: 0, zIndex: -3, opacity: 0.25 }}>
          <img src={profile.banner_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      <section className="section">
        <div className="hero">
          <div>
            <h1>
              Hi, I&apos;m <span className="grad-text">{profile.name || "Your Name"}</span>
            </h1>
            <p style={{ fontSize: "1.25rem", margin: "12px 0 6px", color: "var(--accent-2)" }}>
              {profile.title || "Developer"}
            </p>
            <p className="muted" style={{ fontSize: "1.05rem", marginBottom: 28 }}>
              {profile.tagline || "Welcome to my portfolio."}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {profile.resume_url ? (
                <a className="btn" href={downloadUrl(profile.resume_url)} download target="_blank" rel="noreferrer">
                  ⬇ Download Resume
                </a>
              ) : null}
              <Link className="btn ghost" to="/projects">
                View Projects
              </Link>
            </div>
          </div>
          <div className="hero-canvas-wrap glass">
            {profile.profile_image_url ? (
              <img src={profile.profile_image_url} alt={profile.name}
                   style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <ThreeHero />
            )}
          </div>
        </div>
      </section>

      {about.paragraphs?.length ? (
        <section className="section" style={{ minHeight: "50vh", paddingTop: 40 }}>
          <h2 className="section-title">{about.heading || "About"}</h2>
          {about.paragraphs.map((p, i) => (
            <p key={i} className="muted gsap-reveal" style={{ marginBottom: 14, lineHeight: 1.7 }}>
              {p}
            </p>
          ))}
          <Link to="/about" className="btn ghost" style={{ alignSelf: "flex-start", marginTop: 8 }}>
            More about me →
          </Link>
        </section>
      ) : null}

      <section className="section" style={{ minHeight: "50vh" }}>
        <div className="glass" style={{ padding: "48px 32px", textAlign: "center" }}>
          <h2 className="section-title">{cta.heading || "Let's build something together"}</h2>
          <p className="muted" style={{ marginBottom: 24 }}>{cta.text || ""}</p>
          <Link className="btn" to={cta.button_link || "/contact"}>
            {cta.button_label || "Contact Me"}
          </Link>
        </div>
      </section>

      {/* admin-defined extra sections */}
      {(content?.extras?.items || [])
        .filter((e) => e.heading || e.text || e.image_url)
        .map((e, i) => (
          <section className="section" key={i} style={{ minHeight: "auto", paddingTop: 48 }}>
            {e.heading ? <h2 className="section-title">{e.heading}</h2> : null}
            {e.image_url ? (
              <img src={e.image_url} alt={e.heading || "section image"}
                   style={{ width: "100%", maxWidth: 640, borderRadius: 16, marginBottom: 20, display: "block", boxShadow: "0 15px 50px rgba(0,0,0,0.4)" }} />
            ) : null}
            {(e.text || "").split("\n").filter((t) => t.trim()).map((p, j) => (
              <p key={j} className="muted gsap-reveal" style={{ marginBottom: 14, lineHeight: 1.8 }}>{p}</p>
            ))}
          </section>
        ))}
    </>
  );
}
