import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

/**
 * Secret admin entry point (/admanaccess).
 * Step 1: username + email + password (+ phone number saved to the account).
 * Step 2: a verification code is emailed to the admin; entering it unlocks
 *         the content manager. Everything here is admin-only server-side.
 */
export default function AdminAccess() {
  const [step, setStep] = useState("credentials"); // credentials | code
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const checkAndEnter = async (skipUsername = false) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error("Session expired — please sign in again.");
    const API = import.meta.env.VITE_API_URL || "";
    const res = await fetch(`${API}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = res.ok ? await res.json() : { is_admin: false };

    if (!me.is_admin) {
      await supabase.auth.signOut();
      throw new Error("This account is not an administrator.");
    }
    if (!skipUsername && me.username &&
        username.trim().toLowerCase() !== me.username.toLowerCase()) {
      await supabase.auth.signOut();
      throw new Error("Username does not match the administrator account.");
    }
    navigate("/manage");
  };

  // If the admin clicked the emailed link instead of typing the code,
  // the session may already be valid when this page loads.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        try {
          await checkAndEnter(true);
        } catch {
          /* stay on the login form */
        }
      }
    });
  }, []); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Save the phone number on the account (editable here anytime)
      if (phone.trim()) {
        await supabase.auth.updateUser({ data: { phone: phone.trim() } });
      }

      // Email the verification code (second step)
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (otpErr) throw otpErr;
      setStep("code");
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const verify = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim().replace(/\s+/g, ""),
        type: "email",
      });
      if (error) throw error;
      await checkAndEnter(true);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <section className="section">
      <form className="glass form-card" onSubmit={step === "credentials" ? submit : verify}>
        <h2 className="section-title" style={{ fontSize: "1.4rem" }}>
          {step === "code" ? "Verification Code" : "Admin Access"}
        </h2>

        {step === "credentials" ? (
          <>
            <p className="muted" style={{ marginBottom: 16, fontSize: "0.85rem" }}>
              Administrator sign-in only — after your password you&apos;ll receive a
              verification code to enter before the content manager opens.
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
            <div className="field">
              <label>Phone number (saved to your admin account)</label>
              <input type="tel" value={phone} placeholder="+91 …"
                     onChange={(e) => setPhone(e.target.value)} />
            </div>
          </>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: 16, fontSize: "0.85rem" }}>
              We sent a verification code to <strong style={{ color: "var(--text)" }}>{email}</strong>.
              Enter it below (or click the link inside the email) to open the content manager.
            </p>
            <div className="field">
              <label>Verification code</label>
              <input inputMode="numeric" maxLength={7} required value={code} autoFocus
                     style={{ letterSpacing: "0.4em", fontSize: "1.2rem", textAlign: "center" }}
                     onChange={(e) => setCode(e.target.value)} />
            </div>
            <button type="button" className="muted" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", textDecoration: "underline", padding: 0, marginBottom: 14 }}
                    onClick={submit} disabled={busy}>
              Resend code
            </button>
          </>
        )}

        {error && <p className="error-msg">{error}</p>}
        <button className="btn" type="submit" disabled={busy}
                style={busy ? { opacity: 0.6, cursor: "wait" } : undefined}>
          {busy ? "Checking…" : step === "code" ? "✓ Verify & Unlock" : "🔒 Send Verification Code"}
        </button>
      </form>
    </section>
  );
}
