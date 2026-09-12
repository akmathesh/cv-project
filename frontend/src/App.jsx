import { Component, useEffect, useRef, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import gsap from "gsap";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import SocialDock from "./components/SocialDock";
import ParticlesBackground from "./components/ParticlesBackground";
import CursorFX from "./components/CursorFX";

import Home from "./pages/Home";
import About from "./pages/About";
import Projects from "./pages/Projects";
import Skills from "./pages/Skills";
import Certifications from "./pages/Certifications";
import Contact from "./pages/Contact";
import Reach from "./pages/Reach";
import Feedback from "./pages/Feedback";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Admin from "./pages/Admin";
import Manage from "./pages/Manage";
import AdminAccess from "./pages/AdminAccess";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <section className="section">
          <div className="glass form-card">
            <h2 className="section-title" style={{ fontSize: "1.3rem" }}>Page error</h2>
            <pre style={{ whiteSpace: "pre-wrap", color: "#f87171", fontSize: "0.8rem", marginBottom: 16 }}>
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button className="btn" onClick={() => window.location.reload()}>Reload page</button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}

// route order decides slide direction; auth/admin pages slide vertically
const ROUTE_ORDER = ["/", "/about", "/projects", "/skills", "/certifications",
  "/reach", "/contact", "/feedback", "/login", "/signup", "/admin", "/manage", "/admanaccess"];
const VERTICAL = ["/login", "/signup", "/admin", "/manage", "/admanaccess"];

export default function App() {
  const location = useLocation();
  const pageRef = useRef(null);
  const animRef = useRef(null);
  const [displayLocation, setDisplayLocation] = useState(location);
  const [theme, setTheme] = useState(() => localStorage.getItem("pf-theme") || "dark");

  // Apply and remember the chosen theme across pages and visits
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pf-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // Slide the current page out, then swap the route
  useEffect(() => {
    if (location.pathname === displayLocation.pathname) return;
    const from = ROUTE_ORDER.indexOf(displayLocation.pathname);
    const to = ROUTE_ORDER.indexOf(location.pathname);
    const dir = to >= from ? 1 : -1;
    const vertical = VERTICAL.includes(location.pathname) ||
                     VERTICAL.includes(displayLocation.pathname);
    animRef.current = { dir, vertical };
    const tl = gsap.timeline({
      onComplete: () => {
        setDisplayLocation(location);
        window.scrollTo(0, 0);
      },
    });
    tl.to(pageRef.current,
      vertical
        ? { y: -70, opacity: 0, duration: 0.28, ease: "power2.in" }
        : { x: -90 * dir, opacity: 0, duration: 0.28, ease: "power2.in" });
  }, [location, displayLocation]);

  // Slide the new page in from the opposite side
  useEffect(() => {
    if (!pageRef.current) return;
    const { dir = 1, vertical = false } = animRef.current || {};
    gsap.fromTo(pageRef.current,
      vertical ? { y: 70, opacity: 0 } : { x: 90 * dir, opacity: 0 },
      { x: 0, y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
    gsap.utils.toArray(".gsap-reveal").forEach((el, i) =>
      gsap.to(el, { opacity: 1, y: 0, duration: 0.6, delay: 0.25 + i * 0.08, ease: "power2.out" }));
  }, [displayLocation]);

  return (
    <>
      <div className="gradient-backdrop" />
      {displayLocation.pathname !== "/manage" && <ParticlesBackground />}
      <CursorFX />
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <main ref={pageRef} className="page-fade" key={displayLocation.pathname}>
        <ErrorBoundary>
          <Routes location={displayLocation}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/certifications" element={<Certifications />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/reach" element={<Reach />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/manage" element={<Manage />} />
            <Route path="/admanaccess" element={<AdminAccess />} />
          </Routes>
        </ErrorBoundary>
        <Footer />
      </main>
      <SocialDock />
    </>
  );
}
