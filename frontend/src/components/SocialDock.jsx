import { useState } from "react";
import { useContent } from "../context/ContentContext";

const ICONS = {
  linkedin: "in",
  instagram: "ig",
  whatsapp: "wa",
  phone: "tel",
  email: "@",
};

export default function SocialDock() {
  const { content } = useContent();
  const s = content?.social || {};
  const [open, setOpen] = useState(false);

  const href = (key) => {
    if (!s[key]) return null;
    if (key === "phone") return `tel:${String(s.phone).replace(/\s+/g, "")}`;
    if (key === "email") return `mailto:${s.email}`;
    return s[key];
  };

  const items = Object.keys(ICONS)
    .map((key) => ({ key, label: key[0].toUpperCase() + key.slice(1), href: href(key) }))
    .filter((i) => i.href);

  return (
    <div className="social-dock">
      {open &&
        items.map((item) => (
          <a key={item.key} className="social-item" href={item.href}
             target={item.key === "phone" || item.key === "email" ? undefined : "_blank"}
             rel="noreferrer" title={item.label}>
            {ICONS[item.key]}
          </a>
        ))}
      <button className="social-fab" onClick={() => setOpen((o) => !o)}
              aria-label="Contact links" title="Reach me">
        {open ? "×" : "+"}
      </button>
    </div>
  );
}
