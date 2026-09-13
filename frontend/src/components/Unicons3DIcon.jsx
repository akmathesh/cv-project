import { useEffect, useState } from "react";
import SocialIcon, { SOCIAL_COLORS } from "./SocialIcon";

// Iconscout Unicons CDN (iconscout.com's official free icon library)
const UIC = "https://unicons.iconscout.com/release/v4.0.8/svg";

// map our social keys to Unicons assets on their CDN
const UINAMES = {
  linkedin: `${UIC}/monochrome/linkedin.svg`,
  instagram: `${UIC}/monochrome/instagram.svg`,
  whatsapp: `${UIC}/monochrome/whatsapp.svg`,
  phone: `${UIC}/line/phone.svg`,
  email: `${UIC}/line/envelope.svg`,
};

// brand gradients give the mask its dimensional, glossy 3D fill
const GRADIENTS = {
  linkedin: "linear-gradient(145deg, #6ea9ff 0%, #0A66C2 55%, #063e75 100%)",
  instagram: "linear-gradient(145deg, #ffd76e 0%, #E1306C 55%, #7c2a8f 100%)",
  whatsapp: "linear-gradient(145deg, #8af0a8 0%, #25D366 55%, #0f7a3d 100%)",
  phone: "linear-gradient(145deg, #b79bff 0%, #8b5cf6 55%, #4c1d95 100%)",
  email: "linear-gradient(145deg, #7de7ff 0%, #06b6d4 55%, #0b5570 100%)",
};

/**
 * 3D social icon sourced from iconscout.com (Unicons CDN).
 * The monochrome SVG is recolored through a CSS mask with a glossy
 * brand gradient, plus layered drop-shadows for the 3D depth.
 * Falls back to the built-in vector if the CDN asset fails.
 */
export default function Unicons3DIcon({ icon, size = 44 }) {
  const [failed, setFailed] = useState(false);
  const src = UINAMES[icon];

  useEffect(() => {
    setFailed(false);
    if (!src) return;
    const img = new Image();
    img.onerror = () => setFailed(true);
    img.src = src;
  }, [src]);

  if (!src || failed) return <SocialIcon icon={icon} size={size} />;

  const mask = `url("${src}") center/contain no-repeat`;
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        background: GRADIENTS[icon] || `linear-gradient(145deg, #c9c9ff, ${SOCIAL_COLORS[icon] || "#7c3aed"} 60%, #1a1a3a)`,
        WebkitMaskImage: mask,
        maskImage: mask,
        filter:
          "drop-shadow(0 5px 8px rgba(0,0,0,0.55)) drop-shadow(0 1px 1px rgba(255,255,255,0.35) inset)",
        transition: "transform 0.25s ease",
      }}
      aria-hidden="true"
    />
  );
}
