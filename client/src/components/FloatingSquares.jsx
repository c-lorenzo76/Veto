import "./FloatingSquares.css";

// Same left (%) / size (px) / delay (s) / duration (s) idea as the landing page's
// floating squares, but small and faint so it reads as a quiet backdrop inside a
// card. Squares sit on the right side and the mask fades them out towards the left,
// keeping the content on the left clear.
const SQUARES = [
    { left: 94, size: 22, delay: 0, duration: 11 },
    { left: 86, size: 14, delay: 3, duration: 9 },
    { left: 78, size: 30, delay: 6, duration: 14 },
    { left: 70, size: 12, delay: 1, duration: 10 },
    { left: 62, size: 20, delay: 8, duration: 13 },
    { left: 98, size: 12, delay: 5, duration: 8 },
];

export const FloatingSquares = ({ className = "" }) => (
    <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_left,black,transparent_70%)] ${className}`}
    >
        <ul className="floating-squares absolute inset-0">
            {SQUARES.map((s, i) => (
                <li
                    key={i}
                    style={{
                        left: `${s.left}%`,
                        width: s.size,
                        height: s.size,
                        animationDelay: `${s.delay}s`,
                        animationDuration: `${s.duration}s`,
                    }}
                />
            ))}
        </ul>
    </div>
);
