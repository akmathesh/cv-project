import { useContent } from "../context/ContentContext";
import SocialIcon, { SOCIAL_COLORS } from "./SocialIcon";

const STANDARD = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "instagram", label: "Instagram" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "phone", label: "Call me" },
  { key: "email", label: "Email me" },
];

/**
 * Bottom-right contact dock — always visible, stacked top-to-bottom,
 * on every device. No "+" button.
 */
export default function SocialDock() {
  const { content } = useContent();
  const s = content?.social || {};

  const href = (key) => {
    if (key === "phone") return `tel:${String(s.phone).replace(/\s+/g, "")}`;
    if (key === "email") return `mailto:${s.email}`;
    return s[key];
  };

  const items = STANDARD.filter((st) => s[st.key]).map((st) => ({
    key: st.key, label: st.label, icon: st.key, href: href(st.key),
  }));

  (s.custom || []).forEach((c, i) => {
    if (c?.label && c?.url) {
      items.push({
        key: `custom-${i}`, label: c.label, href: c.url,
        icon: c.label.trim().slice(0, 2).toUpperCase(),
      });
    }
  });

  if (!items.length) return null;

  return (
    <div className="social-dock">
      <div className="social-items">
        {items.map((item) => (
          <a key={item.key} className="social-item" href={item.href}
             target={item.href.startsWith("http") ? "_blank" : undefined}
             rel="noreferrer" title={item.label}
             style={SOCIAL_COLORS[item.key] ? { color: SOCIAL_COLORS[item.key] } : undefined}>
            <SocialIcon icon={item.icon} size={22} />
          </a>
        ))}
      </div>
    </div>
  );
}
