// The official Aman Self Drive logo, copied unmodified from amanselfdrivecars.com (150 × 100 PNG).
// Rendered at its native 3:2 ratio; never recoloured, cropped or redrawn. On dark backgrounds it sits on a light plate
// so the navy "AMAN" lettering stays legible.
export const LOGO_SRC = 'images/brand/aman-logo.png';

export default function Logo({ height = 52, plate = false, className = '' }) {
  const img = (
    <img
      src={LOGO_SRC}
      width={Math.round(height * 1.5)}
      height={height}
      alt="Aman Self Drive Car Rentals"
      className={`logo-img ${className}`}
      decoding="async"
    />
  );
  return plate ? <span className="logo-plate">{img}</span> : img;
}
