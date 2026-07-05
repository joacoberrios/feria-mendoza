# Feria Mendoza

Marketplace local de Mendoza. Ver [CLAUDE.md](./CLAUDE.md) para el contexto completo del producto, modelo de negocio y plan de fases.

Estado actual: **Fase 0 — Setup**. Todavía no hay funcionalidad de negocio (login, catálogo, pagos); solo el esqueleto del proyecto.

## Stack

- Next.js (App Router, TypeScript, Tailwind CSS)
- Supabase (Postgres, Auth, Storage)
- Mercado Pago (a integrar en fases 3-4)
- Vercel (hosting)

## Correr el proyecto localmente

```bash
npm install
cp .env.local.example .env.local   # completar con tus credenciales de Supabase
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Pasos manuales pendientes (no automatizables por el agente)

1. **Crear el proyecto en Supabase**: entrar a [supabase.com](https://supabase.com), crear un proyecto nuevo (elegir región cercana, ej. South America).
2. **Completar `.env.local`**: copiar `.env.local.example` a `.env.local` y pegar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` desde *Project Settings > API* en el dashboard de Supabase.
3. **Conectar el repo a Vercel**: crear el repositorio en GitHub, pushear este código, e importarlo en [vercel.com](https://vercel.com). Cargar ahí las mismas variables de entorno de `.env.local` (Project Settings > Environment Variables).
4. **Crear cuenta de aplicación en Mercado Pago** (se necesita más adelante, Fase 3-4): registrar la app en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers) para obtener credenciales de Checkout Pro y habilitar el modelo Marketplace/Split.

## Estructura del proyecto

```
src/
  app/            # rutas (App Router) — se van completando por fase
  components/     # componentes de UI por dominio (auth, catalog, admin, ui)
  lib/
    supabase/     # clientes de Supabase (browser, server, middleware)
    mercadopago/  # integración de pagos (Fase 3+)
  types/          # tipos de datos (a futuro, generados desde Supabase)
middleware.ts     # refresco de sesión de Supabase en cada request
```

Ver la sección 9 de [CLAUDE.md](./CLAUDE.md) para el detalle de qué se construye en cada fase.
