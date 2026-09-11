import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useContent } from "../context/ContentContext";
import { saveSection, uploadFile, getFeedback, approveFeedback } from "../lib/api";

/* ---------------- small helpers ---------------- */

function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value ?? ""} placeholder={placeholder}
             onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ImageField({ label, value, onChange, token, accept = "image/*" }) {
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await uploadFile(file, token);
      onChange(url);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    }
    setBusy(false);
  };
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ flex: 1 }} value={value ?? ""} placeholder="https://… or upload →"
               onChange={(e) => onChange(e.target.value)} />
        <label className="btn ghost" style={{ cursor: "pointer", padding: "8px 14px", fontSize: "0.8rem" }}>
          {busy ? "Uploading…" : "⬆ Upload"}
          <input type="file" accept={accept} style={{ display: "none" }} onChange={pick} />
        </label>
      </div>
      {value ? <img src={value} alt="" style={{ marginTop: 8, maxHeight: 90, borderRadius: 8 }} /> : null}
    </div>
  );
}

function ListEditor({ items, setItems, renderRow, blank }) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="admin-row glass" style={{ padding: 12, marginBottom: 10 }}>
          {renderRow(item, (patch) =>
            setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)))
          )}
          <button type="button" className="btn ghost" style={{ padding: "5px 12px", fontSize: "0.75rem", color: "#f87171", marginTop: 8 }}
                  onClick={() => setItems(items.filter((_, j) => j !== i))}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn ghost" onClick={() => setItems([...items, blank()])}>
        + Add
      </button>
    </div>
  );
}

function SectionCard({ title, onSave, children }) {
  const [status, setStatus] = useState(null);
  return (
    <div className="glass admin-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 className="section-title" style={{ fontSize: "1.2rem", marginBottom: 0 }}>{title}</h3>
        <button className="btn" style={{ padding: "8px 18px", fontSize: "0.82rem" }}
                onClick={async () => { await onSave(); setStatus("Saved ✓"); setTimeout(() => setStatus(null), 2000); }}>
          Save
        </button>
      </div>
      {status && <p className="ok-msg">{status}</p>}
      {children}
    </div>
  );
}

/* ---------------- the admin page ---------------- */

export default function Admin() {
  const { user, token, loading, isAdmin } = useAuth();
  const { content, reload } = useContent();
  const [draft, setDraft] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => setDraft(JSON.parse(JSON.stringify(content))), [content]);

  useEffect(() => {
    if (token) getFeedback(token).then(setFeedback).catch(() => {});
  }, [token]);

  if (loading) return <section className="section"><p className="muted">Loading…</p></section>;
  if (!isAdmin)
    return (
      <section className="section">
        <div className="glass form-card">
          <h2 className="section-title" style={{ fontSize: "1.4rem" }}>Admins only</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            {user
              ? `Your account (${user.email}) is not an administrator. Ask the site owner to promote it.`
              : "You need to log in with an administrator account to edit the site."}
          </p>
          {user ? (
            <button className="btn ghost" onClick={signOut}>Sign out</button>
          ) : (
            <Link className="btn" to="/login">Go to Login</Link>
          )}
        </div>
      </section>
    );

  if (!draft) return <section className="section"><p className="muted">Loading content…</p></section>;

  const set = (section, patch) =>
    setDraft((d) => ({ ...d, [section]: { ...(d[section] || {}), ...patch } }));

  const save = (section) => saveSection(section, draft[section] || {}, token).then(reload).catch((e) => alert(e.message));

  const p = draft.profile || {};
  const projects = draft.projects?.items || [];
  const skills = draft.skills?.items || [];
  const certs = draft.certifications?.items || [];
  const about = draft.about || {};
  const social = draft.social || {};
  const cta = draft.cta || {};

  return (
    <section className="section" style={{ maxWidth: 860 }}>
      <h2 className="section-title">Admin — Edit Everything</h2>
      {error && <p className="error-msg">{error}</p>}

      <div className="admin-grid">
        {/* Profile */}
        <SectionCard title="Profile & Images" onSave={() => save("profile")}>
          <Field label="Name" value={p.name} onChange={(v) => set("profile", { name: v })} />
          <Field label="Title / Role" value={p.title} onChange={(v) => set("profile", { title: v })} />
          <Field label="Tagline" value={p.tagline} onChange={(v) => set("profile", { tagline: v })} />
          <ImageField label="Profile Image" value={p.profile_image_url} token={token}
                      onChange={(v) => set("profile", { profile_image_url: v })} />
          <ImageField label="Banner Image (home background)" value={p.banner_image_url} token={token}
                      onChange={(v) => set("profile", { banner_image_url: v })} />
          <ImageField label="Resume (PDF)" value={p.resume_url} token={token} accept="application/pdf,.pdf"
                      onChange={(v) => set("profile", { resume_url: v })} />
        </SectionCard>

        {/* About */}
        <SectionCard title="About" onSave={() => save("about")}>
          <Field label="Heading" value={about.heading} onChange={(v) => set("about", { heading: v })} />
          {(about.paragraphs || []).map((para, i) => (
            <div className="field" key={i}>
              <label>Paragraph {i + 1}</label>
              <textarea rows={3} value={para}
                        onChange={(e) => set("about", { paragraphs: (about.paragraphs || []).map((x, j) => (j === i ? e.target.value : x)) })} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost" onClick={() => set("about", { paragraphs: [...(about.paragraphs || []), ""] })}>+ Paragraph</button>
            {(about.paragraphs || []).length > 0 && (
              <button className="btn ghost" onClick={() => set("about", { paragraphs: about.paragraphs.slice(0, -1) })}>− Remove last</button>
            )}
          </div>
        </SectionCard>

        {/* Projects */}
        <SectionCard title="Projects" onSave={() => save("projects")}>
          <ListEditor
            items={projects}
            blank={() => ({ title: "", description: "", tech: [], link: "", image_url: "" })}
            setItems={(items) => set("projects", { items })}
            renderRow={(item, patch) => (
              <>
                <Field label="Title" value={item.title} onChange={(v) => patch({ title: v })} />
                <div className="field">
                  <label>Description</label>
                  <textarea rows={2} value={item.description} onChange={(e) => patch({ description: e.target.value })} />
                </div>
                <Field label="Tech (comma separated)" value={(item.tech || []).join(", ")}
                       onChange={(v) => patch({ tech: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
                <Field label="Link" value={item.link} onChange={(v) => patch({ link: v })} />
                <ImageField label="Image" value={item.image_url} token={token} onChange={(v) => patch({ image_url: v })} />
              </>
            )}
          />
        </SectionCard>

        {/* Skills */}
        <SectionCard title="Skills" onSave={() => save("skills")}>
          <Field label="Skills (comma separated)" value={skills.join(", ")}
                 onChange={(v) => set("skills", { items: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
        </SectionCard>

        {/* Certifications */}
        <SectionCard title="Certifications" onSave={() => save("certifications")}>
          <ListEditor
            items={certs}
            blank={() => ({ title: "", issuer: "", year: "", link: "" })}
            setItems={(items) => set("certifications", { items })}
            renderRow={(item, patch) => (
              <>
                <Field label="Title" value={item.title} onChange={(v) => patch({ title: v })} />
                <Field label="Issuer" value={item.issuer} onChange={(v) => patch({ issuer: v })} />
                <Field label="Year" value={item.year} onChange={(v) => patch({ year: v })} />
                <Field label="Link" value={item.link} onChange={(v) => patch({ link: v })} />
              </>
            )}
          />
        </SectionCard>

        {/* Social */}
        <SectionCard title="Social Links" onSave={() => save("social")}>
          <Field label="LinkedIn URL" value={social.linkedin} onChange={(v) => set("social", { linkedin: v })} />
          <Field label="Instagram URL" value={social.instagram} onChange={(v) => set("social", { instagram: v })} />
          <Field label="WhatsApp (https://wa.me/…)" value={social.whatsapp} onChange={(v) => set("social", { whatsapp: v })} />
          <Field label="Mobile Number" value={social.phone} onChange={(v) => set("social", { phone: v })} />
          <Field label="Email Address" value={social.email} onChange={(v) => set("social", { email: v })} />
        </SectionCard>

        {/* CTA */}
        <SectionCard title="Call to Action" onSave={() => save("cta")}>
          <Field label="Heading" value={cta.heading} onChange={(v) => set("cta", { heading: v })} />
          <Field label="Text" value={cta.text} onChange={(v) => set("cta", { text: v })} />
          <Field label="Button Label" value={cta.button_label} onChange={(v) => set("cta", { button_label: v })} />
          <Field label="Button Link (e.g. /contact)" value={cta.button_link} onChange={(v) => set("cta", { button_link: v })} />
        </SectionCard>

        {/* Feedback moderation */}
        <div className="glass admin-card">
          <h3 className="section-title" style={{ fontSize: "1.2rem" }}>Feedback Moderation</h3>
          {!feedback.length && <p className="muted">No feedback yet.</p>}
          {feedback.map((f) => (
            <div key={f.id} className="admin-row glass" style={{ padding: 12, marginBottom: 10 }}>
              <strong>{f.name}</strong> {f.role ? <span className="muted">({f.role})</span> : null} — {"⭐".repeat(f.rating || 5)}
              <p className="muted">{f.message}</p>
              <button className="btn ghost" style={{ padding: "5px 12px", fontSize: "0.75rem", marginTop: 6 }}
                      onClick={() => approveFeedback(f.id, !f.approved, token)
                        .then(() => setFeedback(feedback.map((x) => (x.id === f.id ? { ...x, approved: !x.approved } : x))))
                        .catch((e) => alert(e.message))}>
                {f.approved ? "Unapprove" : "Approve"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
