// Visualización de estrellas — sin estado, compatible con Server Components.

const PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

export function StarRating({
  rating,
  count,
  size = "sm",
}: {
  rating: number | null;
  count?: number;
  size?: "sm" | "md";
}) {
  if (!rating) return null;
  const filled = Math.round(rating);
  const px = size === "md" ? 18 : 14;

  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={px}
          height={px}
          viewBox="0 0 24 24"
          fill={i <= filled ? "#f59e0b" : "none"}
          stroke={i <= filled ? "#f59e0b" : "#d1d5db"}
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d={PATH} />
        </svg>
      ))}
      <span className={`ml-1 ${size === "md" ? "text-sm" : "text-xs"} font-medium text-ink`}>
        {rating.toFixed(1)}
      </span>
      {count !== undefined && (
        <span className={`${size === "md" ? "text-sm" : "text-xs"} text-ink-soft`}>
          ({count})
        </span>
      )}
    </span>
  );
}
