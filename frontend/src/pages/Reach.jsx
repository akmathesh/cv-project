import { useContent } from "../context/ContentContext";
import SocialIcon, { SOCIAL_COLORS } from "../components/SocialIcon";

const STANDARD = [
  { key: "linkedin", label: "LinkedIn", icon: "in" },
  { key: "instagram", label: "Instagram", icon: "ig" },
  { key: "whatsapp", label: "WhatsApp", icon: "wa" },
  { key: "phone", label: "Call me", icon: "tel" },
  { key: "email", label: "Email me", icon: "@" },
];

/** Dedicated "Reach Me" page — every contact route, big and tappable. */
export default function Reach() {
  const { content } = useContent();
  const s = content?.social || {};

  const items = STANDARD.filter((st) => s[st.key]).map((st) => ({
    ...st,
    href: st.key === "phone"
      ? `tel:${String(s.phone).replace(/\s+/g, "")}`
      : st.key === "email" ? `mailto:${s.email}` : s[st.key],
  }));

  (s.custom || []).forEach((c, i) => {
    if (c?.label && c?.url) {
      items.push({
        key: `custom-${i}`, label: c.label, href: c.url,
        icon: c.label.trim().slice(0, 2).toUpperCase(),
      });
    }
  });

  return (
    <section className="section">
      <h2 className="section-title">Reach Me</h2>
      <p className="muted" style={{ marginBottom: 34, maxWidth: 560 }}>
        Every way to get in touch — tap whichever you prefer. I usually reply
        within a day.
      </p>

      <div style={{ display: "flex", gap: 26, flexWrap: "wrap" }}>
        {items.map((c) => (
          <a key={c.key} href={c.href}
             target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
             className="social-item gsap-reveal"
             style={{ width: 116, height: 116, display: "flex", flexDirection: "column", gap: 6, fontSize: "2rem",
                      color: SOCIAL_COLORS[c.key] || "var(--text)" }}
             title={c.label}>
            <SocialIcon icon={c.icon} size={44} />
            <span style={{ fontSize: "0.72rem", fontWeight: 600 }}>{c.label}</span>
          </a>
        ))}
      </div>

      {!items.length && (
        <p className="muted">Contact links will appear here once the site owner adds them.</p>
      )}

      {s.email ? (
        <div className="glass" style={{ marginTop: 44, padding: 28, maxWidth: 480 }}>
          <h3 style={{ marginBottom: 6 }}>Prefer email?</h3>
          <p className="muted" style={{ marginBottom: 16 }}>{s.email}</p>
          <a className="btn" href={`mailto:${s.email}`}>✉ Write to me</a>
        </div>
      ) : null}
    </section>
  );
}
