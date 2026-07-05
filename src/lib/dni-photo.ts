// Límite compartido entre la validación del lado del cliente (antes de
// subir) y la del server action (por si el JS del cliente no corrió).
// Se deja margen bajo el bodySizeLimit de 10mb configurado en
// next.config.ts para los Server Actions.
export const MAX_DNI_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;
