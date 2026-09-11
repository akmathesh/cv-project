import { useState } from "react";
import { useContent } from "../context/ContentContext";

const STANDARD = [
  { key: "linkedin", label: "LinkedIn", icon: "in" },
  { key: "instagram", label: "Instagram", icon: "ig" },
  { key: "whatsapp", label: "WhatsApp", icon: "wa" },
  { key: "phone", label: "Call me", icon: "tel" },
  { key: "email", label: "Email me", icon: "@" },
];

/**
 * Floating "+" dock with every contact route the admin has filled in.
 * Standard links are optional — empty ones never render. The admin can
 * also add any number of custom labelled links (social.custom).
 */
export default function SocialDock() {
  const { content } = useContent();
  const s = content?.social || {};
  const [open, setOpen] = useState(false);

  const href = (key) => {
    if (key === "phone") return `tel:${String(s.phone).replace(/\s+/g, "")}`;
    if (key === "email") return `mailto:${s.email}`;
    return s[key];
  };

  const items = STANDARD.filter((st) => s[st.key])
    .map((st) => ({ ...st, href: href(st.key) }));

  (s.custom || []).forEach((c, i) => {
    if (c?.label && c?.url) {
      items.push({
        key: `custom-${i}`,
        label: c.label,
        href: c.url,
        icon: c.label.trim().slice(0, 2).toUpperCase(),
      });
    }
  });

  if (!items.length) return null;

  return (
    <div className="social-dock">
      {open &&
        items.map((item) => (
          <a key={item.key} className="social-item" href={item.href}
             target={item.href.startsWith("http") ? "_blank" : undefined}
             rel="noreferrer" title={item.label}>
            {item.icon}
          </a>
        ))}
      <button
        className={`social-fab ${open ? "" : "pulse"}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Contact links"
        title={open ? "Close" : "Reach me"}
      >
        {open ? "×" : "+"}
      </button>
    </div>
  );
}
