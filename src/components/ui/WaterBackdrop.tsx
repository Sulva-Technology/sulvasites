/** Decorative koi water: blue gradient, concentric ripple rings and a drifting koi. */
export function WaterBackdrop({ className = "", koi = false }: { className?: string; koi?: boolean }) {
  const delays = ["0s", "1.5s", "3s", "4.5s"];
  return (
    <div aria-hidden="true" className={`koi-water pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
        {delays.map((d, i) => (
          <circle
            key={d}
            className="koi-ripple"
            style={{ animationDelay: d }}
            cx="720"
            cy="228"
            r={120 + i * 70}
            fill="none"
            stroke="rgba(255,255,255,.35)"
            strokeWidth="1.5"
          />
        ))}
      </svg>
      {koi ? (
        <div className="koi-fish absolute left-0 top-0 h-full w-full opacity-80">
          <svg viewBox="0 0 120 50" className="h-[50px] w-[120px] sm:h-[70px] sm:w-[168px]">
            <path d="M18 25 C 4 12, 0 10, 2 6 C 8 12, 12 18, 22 22 Z" fill="#ff7a4f" />
            <path d="M18 25 C 4 38, 0 40, 2 44 C 8 38, 12 32, 22 28 Z" fill="#ff7a4f" />
            <ellipse cx="62" cy="25" rx="44" ry="15" fill="#ff5a2c" />
            <path d="M58 11 C 66 2, 76 4, 78 12 Z" fill="#ff7a4f" />
            <ellipse cx="74" cy="22" rx="10" ry="6" fill="#fff4ea" opacity=".85" />
            <ellipse cx="48" cy="28" rx="8" ry="5" fill="#fff4ea" opacity=".7" />
            <circle cx="98" cy="21" r="2" fill="#0a0f1f" />
          </svg>
        </div>
      ) : null}
    </div>
  );
}

export default WaterBackdrop;
