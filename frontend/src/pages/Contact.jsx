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
    { label: "LinkedIn", href: s.linkedin, icon: "in" },
    { label: "Instagram", href: s.instagram, icon: "ig" },
    { label: "WhatsApp", href: s.whatsapp ? `https://wa.me/${String(s.whatsapp).split("/").pop().replace(/\D/g, "")}` : null, icon: "wa" },
    { label: "Call", href: s.phone ? `tel:${String(s.phone).replace(/\s+/g, "")}` : null, icon: "tel" },
    { label: "Email", href: s.email ? `mailto:${s.email}` : null, icon: "@" },
  ].filter((c) => c.href);

  return (
    <section className="section">
      <h2 className="section-title">Get in Touch</h2>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 44 }}>
        {circle.map((c) => (
          <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined}
             rel="noreferrer" className="social-item" style={{ width: 64, height: 64, fontSize: "1.3rem" }}
             title={c.label}>
            {c.icon}
          </a>
        ))}
      </div>

      <form className="glass form-card" onSubmit={send}>
        <h2 className="section-title" style={{ fontSize: "1.4rem" }}>Mail Me</h2>
        <div className="field">
          <label>Your name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Message</label>
          <textarea rows={5} required value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </div>
        <button className="btn" type="submit">✉ Send Email</button>
      </form>
    </section>
  );
}
