import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useContent } from "../context/ContentContext";
import { downloadUrl } from "../lib/api";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/projects", label: "Projects" },
  { to: "/skills", label: "Skills" },
  { to: "/certifications", label: "Certifications" },
  { to: "/reach", label: "Reach Me" },
  { to: "/feedback", label: "Feedback" },
];

export default function Navbar({ theme, onToggleTheme }) {
  const { user, signOut } = useAuth();
  const { content } = useContent();
  const navigate = useNavigate();
  const name = content?.profile?.name || "Portfolio";
  const resume = content?.profile?.resume_url;

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="navbar glass">
      <div className="nav-row nav-links">
        <NavLink to="/" end className="nav-brand">
          {name.split(" ")[0]}
          <span style={{ color: "var(--accent-2)" }}>.</span>
        </NavLink>
        {LINKS.slice(1).map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "active" : "")}>
            {l.label}
          </NavLink>
        ))}
        {resume && (
          <a className="resume-nav" href={downloadUrl(resume)}
             target="_blank" rel="noreferrer" title="Download resume">
            ⬇ Resume
          </a>
        )}
      </div>
      <div className="nav-row nav-auth">
        <button type="button" className="theme-toggle" onClick={onToggleTheme}
                title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                aria-label="Toggle day/night theme">
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        {user ? (
          <a href="#!" onClick={handleLogout} title={`Signed in as ${user.email}`}
             style={{ color: "#f87171" }}>
            Logout
          </a>
        ) : (
          <>
            <NavLink to="/login" className="nav-auth-link">Login</NavLink>
            <NavLink to="/signup" className="nav-auth-link">Sign Up</NavLink>
          </>
        )}
      </div>
      {/* mobile-only floating resume button, bottom-left */}
      {resume && (
        <a className="resume-fab" href={downloadUrl(resume)}
           target="_blank" rel="noreferrer" title="Download resume">
          ⬇<span>Resume</span>
        </a>
      )}
    </nav>
  );
}
