import { useState } from "react";
import { useContent } from "../context/ContentContext";

export default function Contact() {
  const { content } = useContent();
  const s = content?.social || {};
  const [form, setForm] = useState({ name: "", message: "" });

  const send = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Portfolio contact from ${form.name}`);
    const body = encodeURIComponent(form.message);
    window.location.href = `mailto:${s.email || ""}?subject=${subject}&body=${body}`;
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
               rel="noreferrer" className="social-item" style={{ width: 64, height: 64, fontSize: "1.3rem" }}
               title={c.label}>
              {c.icon}
            </a>
          ))
        ) : (
          <p className="muted">Contact links will appear here once the site owner adds them.</p>
        )}
      </div>

      <form className="glass form-card" onSubmit={send}>
        <h2 className="section-title" style={{ fontSize: "1.4rem" }}>Mail Me</h2>
        {!s.email && (
          <p className="muted" style={{ marginBottom: 14, fontSize: "0.85rem" }}>
            Email is not configured yet — use the contact circles above or check back soon.
          </p>
        )}
        <div className="field">
          <label>Your name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Message</label>
          <textarea rows={5} required value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </div>
        <button className="btn" type="submit" disabled={!s.email}
                style={!s.email ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>
          ✉ Send Email
        </button>
      </form>
    </section>
  );
}
