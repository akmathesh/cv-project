import { useState } from "react";
import { useContent } from "../context/ContentContext";
import SocialIcon, { SOCIAL_COLORS } from "../components/SocialIcon";

export default function Contact() {
  const { content } = useContent();
  const s = content?.social || {};
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  // Delivered to the admin's notification email through the backend
  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await sendContactMessage(form);
      setStatus({ ok: true, msg: "Message sent ✓ — I will get back to you soon." });
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setStatus({ ok: false, msg: err.message });
    }
    setBusy(false);
  };

  const circle = [
    s.linkedin && { label: "LinkedIn", href: s.linkedin, icon: "in" },
    s.instagram && { label: "Instagram", href: s.instagram, icon: "ig" },
    s.whatsapp && {
      label: "WhatsApp",
      href: s.whatsapp.startsWith("http") ? s.whatsapp : `https://wa.me/${String(s.whatsapp).replace(/\D/g, "")}`,
      icon: "wa",
    },
    s.phone && { label: "Call", href: `tel:${String(s.phone).replace(/\s+/g, "")}`, icon: "tel" },
    s.email && { label: "Email", href: `mailto:${s.email}`, icon: "@" },
    ...(s.custom || [])
      .filter((c) => c?.label && c?.url)
      .map((c) => ({ label: c.label, href: c.url, icon: c.label.trim().slice(0, 2).toUpperCase() })),
  ].filter(Boolean);

  return (
    <section className="section">
      <h2 className="section-title">Get in Touch</h2>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 44 }}>
        {circle.length ? (
          circle.map((c) => (
            <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined}
               rel="noreferrer" className="social-item"
               style={{ width: 64, height: 64, color: SOCIAL_COLORS[c.icon] || "var(--text)" }}
               title={c.label}>
              <SocialIcon icon={c.icon} size={26} />
            </a>
          ))
        ) : (
          <p className="muted">Contact links will appear here once the site owner adds them.</p>
        )}
      </div>

      <form className="glass form-card" onSubmit={send}>
        <h2 className="section-title" style={{ fontSize: "1.4rem" }}>Mail Me</h2>
        {status && <p className={status.ok ? "ok-msg" : "error-msg"}>{status.msg}</p>}
        <div className="field">
          <label>Your name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Your email (optional, so I can reply)</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label>Message</label>
          <textarea rows={5} required value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </div>
        <button className="btn" type="submit" disabled={busy}
                style={busy ? { opacity: 0.6, cursor: "wait" } : undefined}>
          {busy ? "Sending…" : "✉ Send Message"}
        </button>
      </form>
    </section>
  );
}
