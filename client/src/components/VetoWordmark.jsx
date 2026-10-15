// VetoWordmark.jsx
const SIZE_CLASSES = {
    sm: "text-lg",
    lg: "text-7xl",
};

// Shared brand wordmark ("Ve" + "to"), styled once and reused wherever the
// logo appears. `onDark` swaps the "Ve" color for legibility against dark
// vs. light backgrounds; the yellow "to" accent stays constant.
export const VetoWordmark = ({ size = "sm", onDark = true, className = "" }) => (
    <span className={`inline-flex items-baseline font-extrabold italic tracking-tight drop-shadow-sm pr-[0.15em] ${SIZE_CLASSES[size]} ${className}`}>
        <span className={onDark ? "text-white" : "text-brand-ink"}>Ve</span>
        <span className="text-gold">to</span>
    </span>
);
