"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { FieldShell } from "./Field";
import { Button } from "./Button";
import { Avatar } from "./Avatar";
import { getCroppedAvatarBlob } from "@/lib/crop-image";

export type AvatarCropFieldProps = {
  name: string;
  label: string;
  hint?: string;
  maxSizeBytes: number;
  currentAvatarPath: string | null;
  placeholderInitial: string;
};

// Reemplaza al FileField genérico para la foto de perfil: antes de que el
// archivo quede listo para subirse, el usuario recorta un encuadre
// circular (react-easy-crop, ver decisión en la conversación con la
// fundadora — bundle chico, evita reimplementar pan/zoom táctil a mano).
// El <input type="file"> real que viaja con el form queda oculto y su
// FileList se llena vía DataTransfer recién cuando se confirma el
// recorte; el picker visible es un input aparte, sin `name`, que nunca
// se envía tal cual.
export function AvatarCropField({
  name,
  label,
  hint,
  maxSizeBytes,
  currentAvatarPath,
  placeholderInitial,
}: AvatarCropFieldProps) {
  const [error, setError] = useState<string | null>(null);
  const [pickedImageSrc, setPickedImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function trackObjectUrl(url: string) {
    objectUrlsRef.current.push(url);
    return url;
  }

  function handlePick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > maxSizeBytes) {
      const maxMb = (maxSizeBytes / 1024 / 1024).toFixed(0);
      setError(
        `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)}MB, el máximo es ${maxMb}MB. Elegí una foto más liviana.`,
      );
      return;
    }

    setError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setPickedImageSrc(trackObjectUrl(URL.createObjectURL(file)));
  }

  function handleCancelCrop() {
    setPickedImageSrc(null);
  }

  async function handleConfirmCrop() {
    if (!pickedImageSrc || !croppedAreaPixels) return;

    setSaving(true);
    try {
      const blob = await getCroppedAvatarBlob(pickedImageSrc, croppedAreaPixels);
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (hiddenInputRef.current) {
        hiddenInputRef.current.files = dataTransfer.files;
      }

      setPreviewUrl(trackObjectUrl(URL.createObjectURL(blob)));
      setPickedImageSrc(null);
    } catch {
      setError("No se pudo procesar la imagen. Probá de nuevo o elegí otra foto.");
      setPickedImageSrc(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FieldShell fieldId={name} label={label} hint={hint} error={error ?? undefined}>
      <div className="flex items-center gap-3">
        {previewUrl ? (
          <div className="relative h-14 w-14 flex-none overflow-hidden rounded-full">
            {/* Preview local recién recortado (blob:) — no es contenido de
                Supabase Storage, next/image no puede optimizarlo. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Foto de perfil elegida" className="h-full w-full object-cover" />
          </div>
        ) : (
          <Avatar avatarPath={currentAvatarPath} initial={placeholderInitial} alt="Foto de perfil actual" size="md" />
        )}

        <input
          type="file"
          accept="image/*"
          onChange={handlePick}
          className="block max-w-[220px] text-sm text-ink-soft file:mr-3 file:rounded-pill file:border-0 file:bg-azul file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white file:transition-colors hover:file:bg-azul-deep focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-azul-deep focus-visible:outline-offset-2"
        />
      </div>

      <input ref={hiddenInputRef} type="file" name={name} className="hidden" />

      {pickedImageSrc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Recortar foto de perfil"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onKeyDown={(event) => {
            if (event.key === "Escape") handleCancelCrop();
          }}
        >
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-4 shadow-lg">
            <p className="mb-3 text-sm font-semibold text-ink">Ajustá el encuadre</p>

            <div className="relative h-72 w-full overflow-hidden rounded-md bg-bg-subtle">
              <Cropper
                image={pickedImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            </div>

            <label className="mt-3 block text-xs font-medium text-ink-soft">
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="mt-1 block w-full"
              />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleCancelCrop}>
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={handleConfirmCrop} loading={saving}>
                Usar esta foto
              </Button>
            </div>
          </div>
        </div>
      )}
    </FieldShell>
  );
}
