// Límite compartido entre la validación del lado del cliente (antes de
// subir) y la del server action (por si el JS del cliente no corrió).
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
