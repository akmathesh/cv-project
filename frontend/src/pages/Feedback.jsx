import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import SkillMarquee from "../components/SkillMarquee";
import { submitFeedback } from "../lib/api";

export default function Feedback() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [form, setForm] = useState({
    name: "",
    role: "",
    message: "",
    rating: 5,
  });
  const [status, setStatus] = useState(null);

  // If the visitor is signed in (including via Google), prefill their name
  useEffect(() => {
    if (user && !form.name) {
      const meta = user.user_metadata || {};
      setForm((f) => ({
        ...f,
        name: meta.full_name || meta.name || user.email?.split("@")[0] || "",
      }));
    }
  }, [user]); // eslint-disable-line

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
      setStatus({
        ok: true,
        msg: "Thanks! Your feedback will appear once approved.",
      });
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
        <div className="cards-grid" style={{ marginBottom: 20 }}>
          {quotes.map((q) => (
            <div
              key={q.id}
              className="glass card-3d gsap-reveal"
              style={{ padding: 20 }}
            >
              <p style={{ lineHeight: 1.6, marginBottom: 12 }}>“{q.message}”</p>
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                — {q.name}
                {q.role ? `, ${q.role}` : ""} {"⭐".repeat(q.rating || 5)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <form className="glass form-card" onSubmit={submit}>
        <h2 className="section-title" style={{ fontSize: "1.4rem" }}>
          Leave a review
        </h2>
        <div className="feedback_input_container">
          {user && (
            <p
              className="muted"
              style={{ marginBottom: 12, fontSize: "0.8rem" }}
            >
              Signed in as{" "}
              <strong style={{ color: "var(--text)" }}>{user.email}</strong> —
              feedback still saves to the site owner's Supabase.
            </p>
          )}
          {status && (
            <p className={status.ok ? "ok-msg" : "error-msg"}>{status.msg}</p>
          )}
          <div className="review_inputs_container feedback_name_input">
            <div className="field">
              <label>Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          <div className="review_inputs_container company_role_container">
            <div className="field">
              <label>Role / Company (optional)</label>
              <input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </div>
          </div>

          <div className="review_inputs_container rating-field-div">
            <div className="field">
              <label>Rating</label>
              <select
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: +e.target.value })}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {"⭐".repeat(n)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="review_inputs_container visitors-review-textarea">
            <div className="field">
              <label>Message</label>
              <textarea
                rows={6}
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
          </div>

          <div className="review_inputs_container review-submit-button-align">
            <button className="btn submit_btn_align" type="submit">
              Submit Feedback
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
