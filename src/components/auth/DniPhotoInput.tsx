"use client";

import { useState, type ChangeEvent } from "react";
import { MAX_DNI_PHOTO_SIZE_BYTES } from "@/lib/dni-photo";

const MAX_MB = (MAX_DNI_PHOTO_SIZE_BYTES / 1024 / 1024).toFixed(0);

export function DniPhotoInput() {
  const [error, setError] = useState<string | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setError(null);
      return;
    }

    if (file.size > MAX_DNI_PHOTO_SIZE_BYTES) {
      setError(
        `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)}MB, el máximo es ${MAX_MB}MB. Elegí una foto más liviana.`,
      );
      event.target.value = "";
      return;
    }

    setError(null);
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        type="file"
        name="dni_photo"
        accept="image/*"
        required
        onChange={handleChange}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
