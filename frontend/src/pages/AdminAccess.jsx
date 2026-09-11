import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

/**
 * Secret admin entry point (/admanaccess).
 * Signs the admin in and verifies the admin allow-list before opening
 * the content manager. Regular visitors use /login instead.
 */
export default function AdminAccess() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const token = data.session?.access_token;
      const API = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${API}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const me = res.ok ? await res.json() : { is_admin: false };

      if (!me.is_admin) {
        await supabase.auth.signOut();
        throw new Error("This account is not an administrator.");
      }
      navigate("/manage");
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <section className="section">
      <form className="glass form-card" onSubmit={submit}>
        <h2 className="section-title" style={{ fontSize: "1.4rem" }}>Admin Access</h2>
        <p className="muted" style={{ marginBottom: 16, fontSize: "0.85rem" }}>
          Administrator sign-in only — this opens the full content manager.
        </p>
        {error && <p className="error-msg">{error}</p>}
        <div className="field">
          <label>Admin email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn" type="submit" disabled={busy}
                style={busy ? { opacity: 0.6, cursor: "wait" } : undefined}>
          {busy ? "Checking…" : "🔒 Unlock Content Manager"}
        </button>
      </form>
    </section>
  );
}
