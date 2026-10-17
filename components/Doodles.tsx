// Original hand-drawn decorations for the "album cover" look: outlined squiggles,
// sparkles, paper grain and a halftone dot field. All inline SVG, no images.

/** A thick mint stroke with a black outline: draw the path twice, wide black under narrow fill. */
export function Squiggle({ d, color = "var(--mint)", w = 14, className }: { d: string; color?: string; w?: number; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 300" fill="none" aria-hidden>
      <path d={d} stroke="#111" strokeWidth={w + 5} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const SQUIGGLE_A = "M20 70 C 80 10, 120 120, 60 160 S 40 260, 140 250 S 260 170, 200 120 C 160 90, 150 160, 190 165";
export const SQUIGGLE_B = "M30 230 C 70 190, 120 260, 160 220 S 230 150, 270 200";
export const SPIRAL = "M150 150 m -10 0 a 10 10 0 1 1 20 0 a 22 22 0 1 1 -44 0 a 36 36 0 1 1 72 0 a 52 52 0 1 1 -104 0";

export function Sparkle({ className, size = 44 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 50 50" aria-hidden>
      <path d="M25 2 C27 18, 32 23, 48 25 C32 27, 27 32, 25 48 C23 32, 18 27, 2 25 C18 23, 23 18, 25 2Z"
        fill="#fff" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function Burst({ className, size = 70 }: { className?: string; size?: number }) {
  const rays = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    const r = i % 2 ? 18 : 32;
    return `M35 35 L${(35 + Math.cos(a) * r).toFixed(1)} ${(35 + Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 70 70" aria-hidden>
      <path d={rays} stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d={rays} stroke="#111" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity=".9" />
    </svg>
  );
}

export function Star({ className, size = 54 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 60 60" aria-hidden>
      <path d="M30 4 L37 22 L56 23 L41 35 L46 54 L30 43 L13 55 L19 35 L4 24 L23 22 Z"
        fill="#fff" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" transform="rotate(-8 30 30)" />
    </svg>
  );
}

/** Chopsticks + bowl, the Seoul-table mascot mark. */
export function BowlMark({ className, size = 64 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M40 6 L22 30 M48 9 L28 31" stroke="#111" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M8 32 H56 C56 46, 46 56, 32 56 C18 56, 8 46, 8 32 Z" fill="var(--peri)" stroke="#111" strokeWidth="2" />
      <path d="M14 38 C22 42, 42 42, 50 38" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Paper grain + halftone dots, laid over a block as decoration. */
export function Grain() {
  return (
    <svg className="grain" aria-hidden>
      <filter id="grain-f">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain-f)" />
    </svg>
  );
}
