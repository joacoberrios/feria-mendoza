-- Precio de lista/anterior para mostrar descuentos en "Mansas Ofertas".
-- Un producto califica como oferta cuando original_price IS NOT NULL AND original_price > price.
-- La condición se evalúa en la app, no como check constraint, para que
-- subir el precio de vuelta simplemente deje de calificar sin errores de DB.
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price numeric;
