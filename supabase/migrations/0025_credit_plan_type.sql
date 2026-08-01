-- Fase K: agrega 'credit' al enum plan_type y crea el plan de créditos
-- en publication_plans para que el admin pueda activarlo/desactivarlo
-- desde /admin/planes, igual que el plan de comisión.

ALTER TYPE public.plan_type ADD VALUE IF NOT EXISTS 'credit';

-- El INSERT se hace en 0026 porque ADD VALUE IF NOT EXISTS no puede
-- usarse en la misma transacción que consultas que lean el nuevo valor.
