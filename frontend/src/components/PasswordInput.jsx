import { useState } from "react";

export function passwordStrength(pw = "") {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (pw.length < 6) score = 1;
  const labels = ["Very Weak", "Very Weak", "Weak", "Medium", "Strong", "Strong"];
  const colors = ["#ef4444", "#ef4444", "#f97316", "#eab308", "#22c55e", "#22c55e"];
  return { label: labels[score], color: colors[score], pct: Math.max(12, score * 20) };
}

/** Password input with an eye toggle and an optional strength meter. */
export default function PasswordInput({ value, onChange, showStrength, style, ...rest }) {
  const [show, setShow] = useState(false);
  const st = showStrength ? passwordStrength(value) : null;
  return (
    <div>
      <div style={{ position: "relative" }}>
        <input type={show ? "text" : "password"} value={value ?? ""}
               onChange={(e) => onChange(e.target.value)}
               style={{ paddingRight: 42, width: "100%", boxSizing: "border-box", ...style }} {...rest} />
        <button type="button" onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                         background: "none", border: "none", cursor: "pointer",
                         fontSize: "1rem", color: "var(--muted)", padding: 4, lineHeight: 1 }}>
          {show ? "🙈" : "👁"}
        </button>
      </div>
      {st && (
        <div style={{ marginTop: 6 }}>
          <div style={{ height: 4, borderRadius: 4, background: "rgba(128,128,128,0.25)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${st.pct}%`, background: st.color, transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: "0.72rem", color: st.color, marginTop: 3, fontWeight: 600 }}>{st.label}</div>
        </div>
      )}
    </div>
  );
}
