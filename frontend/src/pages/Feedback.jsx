import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import SkillMarquee from "../components/SkillMarquee";
import { submitFeedback } from "../lib/api";

export default function Feedback() {
  const [quotes, setQuotes] = useState([]);
  const [form, setForm] = useState({ name: "", role: "", message: "", rating: 5 });
  const [status, setStatus] = useState(null);

  useEffect(() => {
    // Approved feedback is publicly readable via RLS
    supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setQuotes(data || []));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await submitFeedback(form);
      setStatus({ ok: true, msg: "Thanks! Your feedback will appear once approved." });
      setForm({ name: "", role: "", message: "", rating: 5 });
    } catch (err) {
      setStatus({ ok: false, msg: err.message });
    }
  };

  return (
    <section className="section">
      <h2 className="section-title">Feedback</h2>

      {/* animated skills + reviews stream */}
      <SkillMarquee quotes={quotes} />

      {quotes.length ? (
        <div className="cards-grid" style={{ marginBottom: 40 }}>
          {quotes.map((q) => (
            <div key={q.id} className="glass card-3d gsap-reveal" style={{ padding: 20 }}>
              <p style={{ lineHeight: 1.6, marginBottom: 12 }}>“{q.message}”</p>
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                — {q.name}{q.role ? `, ${q.role}` : ""} {"⭐".repeat(q.rating || 5)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <form className="glass form-card" onSubmit={submit}>
        <h2 className="section-title" style={{ fontSize: "1.4rem" }}>Leave a review</h2>
        {status && <p className={status.ok ? "ok-msg" : "error-msg"}>{status.msg}</p>}
        <div className="field">
          <label>Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Role / Company (optional)</label>
          <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </div>
        <div className="field">
          <label>Rating</label>
          <select value={form.rating} onChange={(e) => setForm({ ...form, rating: +e.target.value })}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"⭐".repeat(n)}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Message</label>
          <textarea rows={4} required value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </div>
        <button className="btn" type="submit">Submit Feedback</button>
      </form>
    </section>
  );
}
