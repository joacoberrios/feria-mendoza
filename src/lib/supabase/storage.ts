// product-photos es un bucket público: la URL es determinística y no hace
// falta pedir una signed URL (a diferencia de dni-photos, que es privado).
export function getPublicStorageUrl(bucket: string, path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
