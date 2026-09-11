import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useContent } from "../context/ContentContext";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/projects", label: "Projects" },
  { to: "/skills", label: "Skills" },
  { to: "/certifications", label: "Certifications" },
  { to: "/feedback", label: "Feedback" },
];

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const { content } = useContent();
  const name = content?.profile?.name || "Portfolio";

  return (
    <nav className="navbar glass">
      <NavLink to="/" end style={{ fontWeight: 700, color: "#fff" }}>
        {name.split(" ")[0]}
        <span style={{ color: "var(--accent-2)" }}>.</span>
      </NavLink>
      {LINKS.slice(1).map((l) => (
        <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "active" : "")}>
          {l.label}
        </NavLink>
      ))}
      {user ? (
        <>
          {isAdmin && <Link to="/manage">Manage</Link>}
          <a href="#!" onClick={signOut} style={{ color: "#f87171" }}>
            Logout
          </a>
        </>
      ) : (
        <NavLink to="/login">Login</NavLink>
      )}
    </nav>
  );
}
