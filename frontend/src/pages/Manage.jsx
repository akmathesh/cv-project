import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useContent } from "../context/ContentContext";
import { saveSection, deleteSection, uploadFile, getFeedback, approveFeedback, updateAdminCredentials } from "../lib/api";
import { supabase } from "../lib/supabaseClient";

/* ---------- image cropper (drag + zoom, exports JPEG) ---------- */

function CropperModal({ src, aspect, onDone, onCancel }) {
  const W = 520;
  const H = Math.round(520 / aspect);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // top-left of image in viewport
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const dragRef = useRef(null);
  const imgElRef = useRef(null);

  // fit image so it covers the viewport at zoom = 1
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const base = Math.max(W / img.width, H / img.height);
      const w = img.width * base;
      const h = img.height * base;
      setNatural({ w: img.width, h: img.height });
      setDims({ w, h });
      setPos({ x: (W - w) / 2, y: (H - h) / 2 });
    };
    img.src = src;
  }, [src]);

  const clamp = (p, z) => {
    const base = Math.max(W / natural.w, H / natural.h);
    const w = natural.w * base * z;
    const h = natural.h * base * z;
    return {
      x: Math.min(0, Math.max(W - w, p.x)),
      y: Math.min(0, Math.max(H - h, p.y)),
    };
  };

  const onZoom = (z) => {
    // keep the centre fixed while zooming
    const cx = pos.x + dims.w / 2;
    const cy = pos.y + dims.h / 2;
    const base = Math.max(W / natural.w, H / natural.h);
    const nw = natural.w * base * z;
    const nh = natural.h * base * z;
    const p = clamp({ x: cx - nw / 2, y: cy - nh / 2 }, z);
    setZoom(z);
    setPos(p);
  };

  const onPointerDown = (e) => {
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const d = dragRef.current;
    setPos(clamp({ x: d.px + (e.clientX - d.sx), y: d.py + (e.clientY - d.sy) }, zoom));
  };
  const onPointerUp = () => { dragRef.current = null; };

  const cropAndUpload = async () => {
    const base = Math.max(W / natural.w, H / natural.h);
    const dw = natural.w * base * zoom;
    const dh = natural.h * base * zoom;
    const k = 900 / W; // export at 900px wide for quality
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(W * k);
    canvas.height = Math.round(H * k);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgElRef.current,
      (-pos.x / dw) * natural.w, (-pos.y / dh) * natural.h,
      (W / dw) * natural.w, (H / dh) * natural.h,
      0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    onDone(blob);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.75)", display: "grid", placeItems: "center", padding: 16 }}
         onClick={onCancel}>
      <div className="af-sheet" style={{ maxWidth: W + 48, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div className="af-header">
          <div className="af-title" style={{ fontSize: "1.1rem" }}>Crop image — drag to position, slide to zoom</div>
        </div>
        <div style={{ marginTop: 16, position: "relative", width: "100%", aspectRatio: `${W}/${H}`, overflow: "hidden", borderRadius: 12, border: "1px solid var(--card-border)", background: "#000", touchAction: "none" }}
             onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
          {natural.w > 0 && (
            <img src={src} alt="" draggable={false}
                 ref={imgElRef}
                 style={{ position: "absolute", left: pos.x, top: pos.y, width: dims.w, height: dims.h, maxWidth: "none", userSelect: "none", cursor: "grab" }} />
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
          <span className="muted" style={{ fontSize: "0.8rem" }}>Zoom</span>
          <input type="range" min="1" max="4" step="0.05" value={zoom} style={{ flex: 1 }}
                 onChange={(e) => onZoom(+e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="af-btn" onClick={cropAndUpload}>✓ Crop &amp; use</button>
          <button className="af-btn ghosted" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- building blocks (application-form style) ---------- */

function AfField({ label, value, onChange, type = "text", placeholder, full }) {
  return (
    <div className={`af-field ${full ? "full" : ""}`}>
      <label>{label}</label>
      <input type={type} value={value ?? ""} placeholder={placeholder}
             onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function AfArea({ label, value, onChange, rows = 3, full = true }) {
  return (
    <div className={`af-field ${full ? "full" : ""}`}>
      <label>{label}</label>
      <textarea rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function AfUpload({ label, value, onChange, token, accept = "image/*", aspect }) {
  const [busy, setBusy] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);

  const doUpload = async (file) => {
    setBusy(true);
    try {
      const { url } = await uploadFile(file, token);
      onChange(url);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    }
    setBusy(false);
  };

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (aspect && file.type.startsWith("image/")) {
      setCropSrc(URL.createObjectURL(file)); // open the crop tool
      return;
    }
    await doUpload(file);
  };

  return (
    <div className="af-field full">
      <label>{label}</label>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ flex: 1, minWidth: 200 }} value={value ?? ""}
               placeholder="https://… or upload a file →"
               onChange={(e) => onChange(e.target.value)} />
        <label className="af-upload">
          {busy ? "Uploading…" : "⬆ Upload"}
          <input type="file" accept={accept} style={{ display: "none" }} onChange={pick} />
        </label>
      </div>
      {value ? <img src={value} alt="" className="af-thumb" /> : null}
      {cropSrc && (
        <CropperModal src={cropSrc} aspect={aspect}
                      onCancel={() => setCropSrc(null)}
                      onDone={async (blob) => {
                        setCropSrc(null);
                        await doUpload(new File([blob], "cropped.jpg", { type: "image/jpeg" }));
                      }} />
      )}
    </div>
  );
}

/* section wrapper with its own save button */
function FormSection({ num, title, onSave, onClear, children }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="fs">
      <div className="fs-head">
        <span className="fs-num">{num}</span>
        <span className="fs-title">{title}</span>
        <div className="fs-actions">
          <button className="af-btn small ghosted" onClick={onClear}>Reset</button>
          <button className="af-btn small" onClick={async () => {
            await onSave();
            setSaved(true);
            setTimeout(() => setSaved(false), 1800);
          }}>{saved ? "Saved ✓" : "Save"}</button>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ---------- security: admin credentials ---------- */

function SecuritySection() {
  const { user, token } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (user) {
      const meta = user.user_metadata || {};
      setUsername(meta.username || "");
      setPhone(meta.phone || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const saveCreds = async () => {
    setMsg(null);
    if (password && password.length < 6) return setMsg({ ok: false, t: "Password must be at least 6 characters." });
    try {
      await updateAdminCredentials(
        { username: username || undefined, email: email || undefined, password: password || undefined },
        token
      );
      if (phone.trim()) await supabase.auth.updateUser({ data: { phone: phone.trim() } });
      setMsg({ ok: true, t: "Credentials updated ✓ — use them next time at /admanaccess." });
      setPassword("");
    } catch (e) {
      setMsg({ ok: false, t: e.message });
    }
  };

  return (
    <div className="fs">
      <div className="fs-head">
        <span className="fs-num">09</span>
        <span className="fs-title">Security — Admin Credentials</span>
      </div>

      <div className="af-grid">
        <AfField label="Username" value={username} onChange={setUsername} />
        <AfField label="Email (login id)" value={email} onChange={setEmail} type="email" />
        <AfField label="Phone number" value={phone} onChange={setPhone} type="tel" />
        <AfField label="New password (leave blank to keep current)" value={password} onChange={setPassword} type="password" full />
      </div>
      <button className="af-btn small" style={{ marginTop: 10 }} onClick={saveCreds}>Save credentials</button>
      {msg && <p className={msg.ok ? "ok-msg" : "error-msg"} style={{ marginTop: 8 }}>{msg.t}</p>}
    </div>
  );
}

export default function Manage() {
  const { user, token, loading, isAdmin } = useAuth();
  const { content, reload } = useContent();
  const [draft, setDraft] = useState(null);
  const [feedback, setFeedback] = useState([]);

  useEffect(() => setDraft(JSON.parse(JSON.stringify(content))), [content]);
  useEffect(() => {
    if (token) getFeedback(token).then(setFeedback).catch(() => {});
  }, [token]);

  if (loading) return <section className="appform"><p className="muted">Loading…</p></section>;

  if (!user)
    return (
      <section className="appform">
        <div className="af-sheet" style={{ textAlign: "center", padding: "60px 34px" }}>
          <h2 className="af-title">Restricted area</h2>
          <p className="muted" style={{ margin: "14px 0 22px" }}>
            Sign in with the administrator account to open the content manager.
          </p>
          <Link className="af-btn" to="/login">Go to Login</Link>
        </div>
      </section>
    );

  if (!isAdmin)
    return (
      <section className="appform">
        <div className="af-sheet" style={{ textAlign: "center", padding: "60px 34px" }}>
          <h2 className="af-title">Admins only</h2>
          <p className="muted" style={{ margin: "14px 0" }}>
            This area is restricted to the site owner. Your account
            {" "}(<strong style={{ color: "var(--text)" }}>{user.email}</strong>) is not an administrator.
          </p>
          <button className="af-btn ghosted" onClick={signOut}>Sign out</button>
        </div>
      </section>
    );

  if (!draft) return <section className="appform"><p className="muted">Loading content…</p></section>;

  const set = (section, patch) =>
    setDraft((d) => ({ ...d, [section]: { ...(d[section] || {}), ...patch } }));

  const save = async (section) => {
    try {
      await saveSection(section, draft[section] || {}, token);
      await reload();
    } catch (e) {
      alert(e.message);
    }
  };

  const clear = async (section) => {
    if (!window.confirm(`Reset the "${section}" section? The site will show placeholders until you save new content.`)) return;
    try {
      await deleteSection(section, token);
      await reload();
      setDraft((d) => ({ ...d, [section]: {} }));
    } catch (e) {
      alert(e.message);
    }
  };

  const p = draft.profile || {};
  const about = draft.about || {};
  const projects = draft.projects?.items || [];
  const skills = draft.skills?.items || [];
  const certs = draft.certifications?.items || [];
  const social = draft.social || {};
  const cta = draft.cta || {};

  return (
    <section className="appform">
      <div className="af-sheet">
        <div className="af-header">
          <div>
            <div className="af-title">Site Content Manager</div>
            <p className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
              Application form — edit every section of the public site.
            </p>
          </div>
          <div className="muted" style={{ fontSize: "0.8rem", textAlign: "right" }}>
            Signed in as<br /><strong style={{ color: "var(--text)" }}>{user.email}</strong>
          </div>
        </div>

        {/* 01 — identity */}
        <FormSection num="01" title="Personal Details" onSave={() => save("profile")} onClear={() => clear("profile")}>
          <div className="af-grid">
            <AfField label="Full name" value={p.name} onChange={(v) => set("profile", { name: v })} />
            <AfField label="Title / role" value={p.title} onChange={(v) => set("profile", { title: v })} />
            <AfField label="Tagline" value={p.tagline} onChange={(v) => set("profile", { tagline: v })} full />
            <AfUpload label="Profile image (square crop)" value={p.profile_image_url} token={token} aspect={1}
                      onChange={(v) => set("profile", { profile_image_url: v })} />
            <AfUpload label="Banner image (wide crop)" value={p.banner_image_url} token={token} aspect={16 / 6}
                      onChange={(v) => set("profile", { banner_image_url: v })} />
            <AfUpload label="Resume (PDF)" value={p.resume_url} token={token} accept="application/pdf,.pdf"
                      onChange={(v) => set("profile", { resume_url: v })} />
          </div>
        </FormSection>

        {/* 02 — about */}
        <FormSection num="02" title="About" onSave={() => save("about")} onClear={() => clear("about")}>
          <div className="af-grid">
            <AfField label="Heading" value={about.heading} onChange={(v) => set("about", { heading: v })} />
          </div>
          {(about.paragraphs || []).map((para, i) => (
            <AfArea key={i} label={`Paragraph ${i + 1}`} value={para}
                    onChange={(v) => set("about", { paragraphs: (about.paragraphs || []).map((x, j) => (j === i ? v : x)) })} />
          ))}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button className="af-btn small ghosted" onClick={() => set("about", { paragraphs: [...(about.paragraphs || []), ""] })}>+ Add paragraph</button>
            {(about.paragraphs || []).length > 0 && (
              <button className="af-btn small ghosted" onClick={() => set("about", { paragraphs: about.paragraphs.slice(0, -1) })}>− Remove last</button>
            )}
          </div>
        </FormSection>

        {/* 03 — projects */}
        <FormSection num="03" title="Projects" onSave={() => save("projects")} onClear={() => clear("projects")}>
          {projects.map((item, i) => (
            <div className="af-item" key={i}>
              <div className="af-grid">
                <AfField label="Title" value={item.title} onChange={(v) => set("projects", { items: projects.map((x, j) => j === i ? { ...x, title: v } : x) })} />
                <AfField label="Live link" value={item.link} onChange={(v) => set("projects", { items: projects.map((x, j) => j === i ? { ...x, link: v } : x) })} />
                <AfArea label="Description" value={item.description}
                        onChange={(v) => set("projects", { items: projects.map((x, j) => j === i ? { ...x, description: v } : x) })} />
                <AfField label="Tech (comma separated)" value={(item.tech || []).join(", ")} full
                         onChange={(v) => set("projects", { items: projects.map((x, j) => j === i ? { ...x, tech: v.split(",").map((s) => s.trim()).filter(Boolean) } : x) })} />
                <AfUpload label="Project image (16:10 crop)" value={item.image_url} token={token} aspect={16 / 10} full
                          onChange={(v) => set("projects", { items: projects.map((x, j) => j === i ? { ...x, image_url: v } : x) })} />
              </div>
              <button className="af-btn small ghosted" style={{ marginTop: 10 }}
                      onClick={() => set("projects", { items: projects.filter((_, j) => j !== i) })}>
                ✕ Remove project
              </button>
            </div>
          ))}
          <button className="af-btn small" onClick={() => set("projects", { items: [...projects, { title: "", description: "", tech: [], link: "", image_url: "" }] })}>
            + Add project
          </button>
        </FormSection>

        {/* 04 — skills */}
        <FormSection num="04" title="Skills" onSave={() => save("skills")} onClear={() => clear("skills")}>
          <div className="af-grid">
            <AfField label="Skills (comma separated)" value={skills.join(", ")} full
                     onChange={(v) => set("skills", { items: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </div>
        </FormSection>

        {/* 05 — certifications */}
        <FormSection num="05" title="Certifications" onSave={() => save("certifications")} onClear={() => clear("certifications")}>
          {certs.map((item, i) => (
            <div className="af-item" key={i}>
              <div className="af-grid">
                <AfField label="Title" value={item.title} onChange={(v) => set("certifications", { items: certs.map((x, j) => j === i ? { ...x, title: v } : x) })} />
                <AfField label="Issuer" value={item.issuer} onChange={(v) => set("certifications", { items: certs.map((x, j) => j === i ? { ...x, issuer: v } : x) })} />
                <AfField label="Year" value={item.year} onChange={(v) => set("certifications", { items: certs.map((x, j) => j === i ? { ...x, year: v } : x) })} />
                <AfField label="Certificate link" value={item.link} onChange={(v) => set("certifications", { items: certs.map((x, j) => j === i ? { ...x, link: v } : x) })} />
              </div>
              <button className="af-btn small ghosted" style={{ marginTop: 10 }}
                      onClick={() => set("certifications", { items: certs.filter((_, j) => j !== i) })}>
                ✕ Remove certification
              </button>
            </div>
          ))}
          <button className="af-btn small" onClick={() => set("certifications", { items: [...certs, { title: "", issuer: "", year: "", link: "" }] })}>
            + Add certification
          </button>
        </FormSection>

        {/* 06 — social (all optional + dynamic custom links) */}
        <FormSection num="06" title="Reach Me — Social Links (all optional)" onSave={() => save("social")} onClear={() => clear("social")}>
          <p className="muted" style={{ fontSize: "0.8rem", marginBottom: 14 }}>
            Every field is optional — anything left empty is hidden from the public site automatically.
            Use “Add another link” for anything else (GitHub, X/Twitter, Discord, Blog…).
          </p>
          <div className="af-grid">
            <AfField label="LinkedIn URL" value={social.linkedin} onChange={(v) => set("social", { linkedin: v })}
                     placeholder="https://linkedin.com/in/…" />
            <AfField label="Instagram URL" value={social.instagram} onChange={(v) => set("social", { instagram: v })}
                     placeholder="https://instagram.com/…" />
            <AfField label="WhatsApp (number or https://wa.me/…)" value={social.whatsapp} onChange={(v) => set("social", { whatsapp: v })}
                     placeholder="+91 98765 43210" />
            <AfField label="Mobile number (optional)" value={social.phone} onChange={(v) => set("social", { phone: v })}
                     placeholder="+91 98765 43210" />
            <AfField label="Email address" value={social.email} onChange={(v) => set("social", { email: v })}
                     placeholder="you@example.com" full />
          </div>

          <div className="af-grid" style={{ marginTop: 18 }}>
            <div className="af-field full">
              <label>Additional links — shown to visitors as labelled buttons</label>
            </div>
            {(social.custom || []).map((c, i) => (
              <div className="af-item" key={i} style={{ width: "100%", display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div className="af-field" style={{ flex: "1 1 160px" }}>
                  <label>Label (e.g. GitHub)</label>
                  <input value={c.label ?? ""}
                         onChange={(e) => set("social", { custom: (social.custom || []).map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                </div>
                <div className="af-field" style={{ flex: "2 1 240px" }}>
                  <label>URL</label>
                  <input value={c.url ?? ""} placeholder="https://…"
                         onChange={(e) => set("social", { custom: (social.custom || []).map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
                </div>
                <button className="af-btn small ghosted" style={{ marginBottom: 6 }}
                        onClick={() => set("social", { custom: (social.custom || []).filter((_, j) => j !== i) })}>
                  ✕
                </button>
              </div>
            ))}
            <button className="af-btn small" onClick={() => set("social", { custom: [...(social.custom || []), { label: "", url: "" }] })}>
              + Add another link
            </button>
          </div>
        </FormSection>

        {/* 07 — cta */}
        <FormSection num="07" title="Call to Action" onSave={() => save("cta")} onClear={() => clear("cta")}>
          <div className="af-grid">
            <AfField label="Heading" value={cta.heading} onChange={(v) => set("cta", { heading: v })} full />
            <AfField label="Text" value={cta.text} onChange={(v) => set("cta", { text: v })} full />
            <AfField label="Button label" value={cta.button_label} onChange={(v) => set("cta", { button_label: v })} />
            <AfField label="Button link (e.g. /contact)" value={cta.button_link} onChange={(v) => set("cta", { button_link: v })} />
          </div>
        </FormSection>

        {/* 08 — feedback */}
        <div className="fs">
          <div className="fs-head">
            <span className="fs-num">08</span>
            <span className="fs-title">Feedback Moderation</span>
          </div>
          {!feedback.length && <p className="muted" style={{ marginBottom: 10 }}>No feedback submitted yet.</p>}
          {feedback.map((f) => (
            <div className="af-item" key={f.id}>
              <strong>{f.name}</strong> {f.role ? <span className="muted">({f.role})</span> : null} — {"⭐".repeat(f.rating || 5)}
              <p className="muted" style={{ margin: "6px 0 10px" }}>{f.message}</p>
              <button className="af-btn small"
                      onClick={() => approveFeedback(f.id, !f.approved, token)
                        .then(() => setFeedback(feedback.map((x) => (x.id === f.id ? { ...x, approved: !x.approved } : x))))
                        .catch((e) => alert(e.message))}>
                {f.approved ? "Unapprove" : "Approve"}
              </button>
            </div>
          ))}
        </div>

        {/* 09 — security */}
        <SecuritySection />

        <div className="af-sign">
          <span>Applicant signature: <em style={{ color: "var(--text)" }}>{user.email}</em></span>
          <span>Date: {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </section>
  );
}
