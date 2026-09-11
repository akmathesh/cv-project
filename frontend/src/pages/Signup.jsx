import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return setError(error.message);
    navigate("/admin");
  };

  return (
    <section className="section">
      <form className="glass form-card" onSubmit={submit}>
        <h2 className="section-title" style={{ fontSize: "1.5rem" }}>Create your account</h2>
        {error && <p className="error-msg">{error}</p>}
        <div className="field">
          <label>Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password (min 6 characters)</label>
          <input type="password" required minLength={6} value={password}
                 onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn" type="submit">Sign Up</button>
        <p className="muted" style={{ marginTop: 16, fontSize: "0.85rem" }}>
          Already registered? <Link to="/login" style={{ color: "var(--accent-2)" }}>Login</Link>
        </p>
        <p className="muted" style={{ marginTop: 10, fontSize: "0.75rem" }}>
          Note: editing the site requires admin rights — see backend/supabase_schema.sql step 6.
        </p>
      </form>
    </section>
  );
}
