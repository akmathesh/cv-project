import { useState } from "react";

/** Password input with an eye toggle to show/hide the text. */
export default function PasswordInput({ value, onChange, style, ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input type={show ? "text" : "password"} value={value ?? ""}
             onChange={(e) => onChange(e.target.value)}
             style={{ paddingRight: 42, ...style }} {...rest} />
      <button type="button" onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                       background: "none", border: "none", cursor: "pointer",
                       fontSize: "1rem", color: "var(--muted)", padding: 4, lineHeight: 1 }}>
        {show ? "🙈" : "👁"}
      </button>
    </div>
  );
}
