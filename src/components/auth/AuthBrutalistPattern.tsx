/** Neo-brutalist geometric panel — flat solids, no gradients (reference: split signup art). */
export function AuthBrutalistPattern() {
  return (
    <svg
      className="h-full w-full"
      viewBox="0 0 400 820"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="400" height="820" fill="#fef3c7" />
      {/* Sky band */}
      <rect x="0" y="0" width="400" height="120" fill="#7dd3fc" />
      <rect x="0" y="120" width="400" height="16" fill="#0f172a" />
      {/* Teal blocks */}
      <rect x="0" y="136" width="180" height="200" fill="#0d9488" />
      <rect x="180" y="136" width="220" height="90" fill="#134e4a" />
      <circle cx="310" cy="200" r="70" fill="#fbbf24" stroke="#0f172a" strokeWidth="4" />
      <polygon points="40,400 120,320 120,480" fill="#14532d" stroke="#0f172a" strokeWidth="3" />
      <rect x="130" y="340" width="140" height="140" fill="#0d9488" stroke="#0f172a" strokeWidth="3" />
      {/* Stripes block */}
      <rect x="280" y="230" width="120" height="180" fill="#fef08a" />
      <g stroke="#0f172a" strokeWidth="2" opacity="0.35">
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1={280 + i * 10} y1="230" x2={280 + i * 10} y2="410" />
        ))}
      </g>
      {/* Semicircle */}
      <path d="M 200 520 A 100 100 0 0 1 200 720" fill="#7dd3fc" stroke="#0f172a" strokeWidth="4" />
      <rect x="0" y="560" width="400" height="260" fill="#14532d" />
      <circle cx="80" cy="650" r="45" fill="#fbbf24" stroke="#0f172a" strokeWidth="3" />
      <rect
        x="160"
        y="600"
        width="100"
        height="100"
        fill="#fef3c7"
        stroke="#0f172a"
        strokeWidth="4"
        transform="rotate(8 210 650)"
      />
      <polygon points="300,620 360,580 360,700" fill="#0d9488" stroke="#0f172a" strokeWidth="3" />
      {/* Stars */}
      <polygon
        points="340,480 348,500 370,500 352,512 360,532 340,518 320,532 328,512 310,500 332,500"
        fill="#fbbf24"
        stroke="#0f172a"
        strokeWidth="2"
      />
      <polygon
        points="60,720 66,734 82,734 70,742 76,758 60,748 44,758 50,742 38,734 54,734"
        fill="#fef08a"
        stroke="#0f172a"
        strokeWidth="2"
      />
      {/* Leaf-ish */}
      <ellipse cx="200" cy="760" rx="90" ry="40" fill="#22c55e" stroke="#0f172a" strokeWidth="3" />
      <rect x="0" y="0" width="400" height="820" fill="none" stroke="#0f172a" strokeWidth="6" />
    </svg>
  );
}
