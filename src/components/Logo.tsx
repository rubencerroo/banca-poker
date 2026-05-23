type Props = {
  size?: number;
  className?: string;
};

/**
 * Logo de la app: misma ficha que el favicon, generada como SVG inline para que
 * herede el tamaño exacto y se vea nítida en cualquier resolución.
 */
export function Logo({ size = 40, className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-label="Banca de Poker"
      className={className}
      style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.45))' }}
    >
      <defs>
        <radialGradient id="chip-bg" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="70%" stopColor="#991b1b" />
          <stop offset="100%" stopColor="#5e1010" />
        </radialGradient>
        <radialGradient id="chip-inner" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fef2f2" />
          <stop offset="100%" stopColor="#d4d4d4" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#chip-bg)" stroke="#fef2f2" strokeWidth="1.5" />
      <g fill="#fef2f2">
        <rect x="30" y="2" width="4" height="10" rx="1" />
        <rect x="30" y="52" width="4" height="10" rx="1" />
        <rect x="2" y="30" width="10" height="4" rx="1" />
        <rect x="52" y="30" width="10" height="4" rx="1" />
        <g transform="rotate(45 32 32)">
          <rect x="30" y="2" width="4" height="10" rx="1" />
          <rect x="30" y="52" width="4" height="10" rx="1" />
          <rect x="2" y="30" width="10" height="4" rx="1" />
          <rect x="52" y="30" width="10" height="4" rx="1" />
        </g>
      </g>
      <circle cx="32" cy="32" r="17" fill="url(#chip-inner)" stroke="#7f1d1d" strokeWidth="1" />
      <path
        fill="#0b3b2e"
        d="M32 19 C 28 24, 22 28, 22 34 C 22 38, 25 41, 28 41 C 30 41, 31 40, 31.5 39 L 29 46 L 35 46 L 32.5 39 C 33 40, 34 41, 36 41 C 39 41, 42 38, 42 34 C 42 28, 36 24, 32 19 Z"
      />
    </svg>
  );
}
