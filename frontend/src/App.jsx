import { Component, useEffect, useRef, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import gsap from "gsap";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import SocialDock from "./components/SocialDock";
import ParticlesBackground from "./components/ParticlesBackground";

import Home from "./pages/Home";
import About from "./pages/About";
import Projects from "./pages/Projects";
import Skills from "./pages/Skills";
import Certifications from "./pages/Certifications";
import Contact from "./pages/Contact";
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

export default function App() {
  const location = useLocation();
  const pageRef = useRef(null);
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitioning, setTransitioning] = useState(false);

  // Full-page GSAP transition whenever the route changes
  useEffect(() => {
    if (location.pathname === displayLocation.pathname) return;
    setTransitioning(true);
    const tl = gsap.timeline({
      onComplete: () => {
        setDisplayLocation(location);
        setTransitioning(false);
        window.scrollTo(0, 0);
      },
    });
    tl.to(pageRef.current, {
      opacity: 0,
      y: -36,
      rotateX: 6,
      duration: 0.32,
      ease: "power2.in",
    });
  }, [location, displayLocation]);

  // Animate the new page in after the route swaps
  useEffect(() => {
    if (!pageRef.current) return;
    gsap.fromTo(
      pageRef.current,
      { opacity: 0, y: 44, rotateX: -6 },
      { opacity: 1, y: 0, rotateX: 0, duration: 0.5, ease: "power3.out" }
    );
    // stagger-reveal anything marked .gsap-reveal
    gsap.utils.toArray(".gsap-reveal").forEach((el, i) =>
      gsap.to(el, { opacity: 1, y: 0, duration: 0.6, delay: 0.25 + i * 0.08, ease: "power2.out" })
    );
  }, [displayLocation]);

  return (
    <>
      <div className="gradient-backdrop" />
      {displayLocation.pathname !== "/manage" && <ParticlesBackground />}
      <Navbar />
      <main ref={pageRef} className="page-fade" key={displayLocation.pathname}>
        <ErrorBoundary>
          <Routes location={displayLocation}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/certifications" element={<Certifications />} />
            <Route path="/contact" element={<Contact />} />
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
      {transitioning && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "var(--grad)",
            transform: "scaleY(0)",
          }}
          ref={(el) => el && gsap.fromTo(el, { scaleY: 0, transformOrigin: "bottom" }, { scaleY: 1, duration: 0.3, ease: "power2.in" })}
        />
      )}
    </>
  );
}
