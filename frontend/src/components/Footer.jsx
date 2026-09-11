import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      © 2026 k_mathesh · Built with React, FastAPI & Supabase ·{" "}
      <Link to="/feedback" style={{ color: "var(--accent-2)" }}>
        Leave feedback
      </Link>
    </footer>
  );
}
