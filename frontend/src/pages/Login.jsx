import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);
    navigate("/");
  };

  const google = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  return (
    <section className="section">
      <form className="glass form-card" onSubmit={submit}>
        <h2 className="section-title" style={{ fontSize: "1.5rem" }}>Welcome back</h2>
        {error && <p className="error-msg">{error}</p>}
        <div className="field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn" type="submit">Login</button>
        <div className="oauth-divider"><span>or</span></div>
        <button className="btn oauth-btn" type="button" onClick={google}>
          <strong style={{ color: "#4285F4" }}>G</strong> Continue with Google
        </button>
        <p className="muted" style={{ marginTop: 16, fontSize: "0.85rem" }}>
          New here? <Link to="/signup" style={{ color: "var(--accent-2)" }}>Create an account</Link>
        </p>
      </form>
    </section>
  );
}
