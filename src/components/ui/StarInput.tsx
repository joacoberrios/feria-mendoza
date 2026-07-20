"use client";

import { useState } from "react";

const PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

export function StarInput({
  name = "rating",
  defaultValue = 0,
}: {
  name?: string;
  defaultValue?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Calificación">
      <input type="hidden" name={name} value={value} />
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => setValue(i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`${i} estrella${i > 1 ? "s" : ""}`}
          className="rounded focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-azul-deep"
        >
          <svg
            width={28}
            height={28}
            viewBox="0 0 24 24"
            fill={i <= active ? "#f59e0b" : "none"}
            stroke={i <= active ? "#f59e0b" : "#d1d5db"}
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d={PATH} />
          </svg>
        </button>
      ))}
    </div>
  );
}
