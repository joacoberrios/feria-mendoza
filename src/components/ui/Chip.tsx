import type { ReactNode } from "react";

export type ChipTone = "terra" | "azul" | "menta" | "lav" | "ciruela" | "line";

const TONE_CLASSES: Record<ChipTone, string> = {
  terra: "bg-[#f6e3d8] text-terracota-deep",
  azul: "bg-[#e0e5f4] text-azul-deep",
  menta: "bg-[#d9f0e7] text-menta-deep",
  lav: "bg-lavanda text-ink",
  ciruela: "bg-[#ece5f3] text-ciruela",
  line: "bg-surface border border-border text-ink-soft",
};

// Chip estático de solo lectura — ver sección 10 de docs/design-system.html.
export function Chip({ tone = "line", children }: { tone?: ChipTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-3.5 py-1.5 text-[.82rem] font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

// Mismos tonos que arriba, pero como clases peer-checked (para el radio
// oculto de FilterChipGroup) — tienen que quedar escritas literalmente acá
// para que Tailwind las detecte; no se pueden armar concatenando strings.
const PEER_CHECKED_CLASSES: Record<ChipTone, string> = {
  terra: "peer-checked:border-transparent peer-checked:bg-[#f6e3d8] peer-checked:text-terracota-deep",
  azul: "peer-checked:border-transparent peer-checked:bg-[#e0e5f4] peer-checked:text-azul-deep",
  menta: "peer-checked:border-transparent peer-checked:bg-[#d9f0e7] peer-checked:text-menta-deep",
  lav: "peer-checked:border-transparent peer-checked:bg-lavanda peer-checked:text-ink",
  ciruela: "peer-checked:border-transparent peer-checked:bg-[#ece5f3] peer-checked:text-ciruela",
  line: "peer-checked:border-ink-soft",
};

export type ChipRadioOption = { value: string; label: string; tone?: ChipTone };

// Selector de una sola opción con estilo chip, para formularios (a
// diferencia de FilterChipGroup no tiene opción "Todas": siempre hay un
// valor elegido) — ver sección 10 de docs/design-system.html.
export function ChipRadioGroup({
  name,
  groupLabel,
  options,
  defaultValue,
  required,
}: {
  name: string;
  groupLabel: string;
  options: ChipRadioOption[];
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <fieldset className="m-0 mb-[18px] border-0 p-0">
      <legend className="mb-2 text-sm font-semibold text-ink">{groupLabel}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const checked = defaultValue === opt.value;
          const tone = opt.tone ?? "line";
          return (
            <label key={opt.value} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={opt.value}
                defaultChecked={checked}
                required={required}
                className="peer sr-only"
              />
              <span
                className={`inline-flex items-center rounded-pill border border-border bg-surface px-3.5 py-1.5 text-[.82rem] font-medium text-ink-soft transition-colors peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-azul-deep peer-focus-visible:outline-offset-2 ${PEER_CHECKED_CLASSES[tone]}`}
              >
                {opt.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export type FilterChipOption = { value: string; label: string };

export type FilterChipGroupProps = {
  name: string;
  groupLabel: string;
  options: FilterChipOption[];
  selectedValue: string;
  tone?: ChipTone;
  toneFor?: (value: string) => ChipTone;
  allLabel?: string;
};

// Filtro tipo chip (radio estilizado, pill + pastel al seleccionar) — ver
// sección 10 de docs/design-system.html. Sin JS: hay que enviar el form
// para aplicar el filtro, igual que con los <select> de antes. El radio
// real queda oculto (sr-only) pero sigue siendo focuseable por teclado; el
// anillo de foco se muestra en el chip visible vía peer-focus-visible.
export function FilterChipGroup({
  name,
  groupLabel,
  options,
  selectedValue,
  tone = "line",
  toneFor,
  allLabel = "Todas",
}: FilterChipGroupProps) {
  const allOptions: FilterChipOption[] = [{ value: "", label: allLabel }, ...options];

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 text-sm font-semibold text-ink">{groupLabel}</legend>
      <div className="flex flex-wrap gap-2">
        {allOptions.map((opt) => {
          const checked = selectedValue === opt.value;
          const chipTone = toneFor ? toneFor(opt.value) : tone;
          return (
            <label key={opt.value || "__all"} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={opt.value}
                defaultChecked={checked}
                className="peer sr-only"
              />
              <span
                className={`inline-flex items-center rounded-pill border border-border bg-surface px-3.5 py-1.5 text-[.82rem] font-medium text-ink-soft transition-colors peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-azul-deep peer-focus-visible:outline-offset-2 ${PEER_CHECKED_CLASSES[chipTone]}`}
              >
                {opt.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
