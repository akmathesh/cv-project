import { Link } from "react-router-dom";
import { useContent } from "../context/ContentContext";

export default function Footer() {
  const { content } = useContent();
  const name = content?.profile?.name || "Portfolio";
  return (
    <footer className="footer">
      © {new Date().getFullYear()} {name} · Built with React, FastAPI & Supabase ·{" "}
      <Link to="/feedback" style={{ color: "var(--accent-2)" }}>
        Leave feedback
      </Link>
    </footer>
  );
}
