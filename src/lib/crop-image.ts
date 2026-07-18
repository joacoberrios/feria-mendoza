// Recorte final de la foto de perfil — react-easy-crop solo devuelve las
// coordenadas del área elegida en píxeles de la imagen original; dibujar
// esa región en un canvas y exportarla es responsabilidad de quien la usa.
export type PixelCrop = { x: number; y: number; width: number; height: number };

const OUTPUT_SIZE = 512;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("No se pudo leer la imagen.")));
    image.src = src;
  });
}

export async function getCroppedAvatarBlob(imageSrc: string, crop: PixelCrop): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen en este navegador.");

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen recortada."))),
      "image/jpeg",
      0.9,
    );
  });
}
