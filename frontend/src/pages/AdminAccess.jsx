import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

/**
 * Secret admin entry point (/admanaccess).
 * username + email + password, then — if Google Authenticator MFA is
 * enrolled — a 6-digit code step. On success opens the content manager.
 */
export default function AdminAccess() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const checkAndEnter = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const API = import.meta.env.VITE_API_URL || "";
    const res = await fetch(`${API}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = res.ok ? await res.json() : { is_admin: false };

    if (!me.is_admin) {
      await supabase.auth.signOut();
      throw new Error("This account is not an administrator.");
    }
    if (me.username && username.trim().toLowerCase() !== me.username.toLowerCase()) {
      await supabase.auth.signOut();
      throw new Error("Username does not match the administrator account.");
    }
    navigate("/manage");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // If MFA is enrolled, require the authenticator code before entering
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
        const { data: mfa } = await supabase.auth.mfa.listFactors();
        const factor = mfa?.totp?.[0];
        if (factor) {
          setFactorId(factor.id);
          setBusy(false);
          return; // show the code step
        }
      }
      await checkAndEnter();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data: challenge, error: chErr } =
        await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error: verErr } = await supabase.auth.mfa.verify({
        challengeId: challenge.id,
        code: code.trim().replace(/\s+/g, ""),
      });
      if (verErr) throw verErr;
      await checkAndEnter();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <section className="section">
      <form className="glass form-card" onSubmit={factorId ? verifyCode : submit}>
        <h2 className="section-title" style={{ fontSize: "1.4rem" }}>
          {factorId ? "Two-Factor Verification" : "Admin Access"}
        </h2>
        {factorId ? (
          <>
            <p className="muted" style={{ marginBottom: 16, fontSize: "0.85rem" }}>
              Open <strong style={{ color: "var(--text)" }}>Google Authenticator</strong> on
              your mobile and enter the 6-digit code for this site.
            </p>
            <div className="field">
              <label>Authenticator code</label>
              <input inputMode="numeric" pattern="[0-9 ]*" maxLength={7} required value={code}
                     autoFocus style={{ letterSpacing: "0.4em", fontSize: "1.2rem", textAlign: "center" }}
                     onChange={(e) => setCode(e.target.value)} />
            </div>
          </>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: 16, fontSize: "0.85rem" }}>
              Administrator sign-in only — this opens the full content manager.
            </p>
            <div className="field">
              <label>Username</label>
              <input required value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </>
        )}
        {error && <p className="error-msg">{error}</p>}
        <button className="btn" type="submit" disabled={busy}
                style={busy ? { opacity: 0.6, cursor: "wait" } : undefined}>
          {busy ? "Checking…" : factorId ? "✓ Verify & Unlock" : "🔒 Unlock Content Manager"}
        </button>
      </form>
    </section>
  );
}
