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

## Bandeja de WhatsApp — setup manual (Cloud API + Coexistence)

Extiende la bandeja social existente (`/admin/inbox`, ver también `docs/inbox-setup.md` para Instagram) a WhatsApp. Igual que con Instagram, estos pasos son 100% dashboard, no automatizables:

1. **Crear/usar una app de Meta for Developers** sobre un **Business Portfolio** (puede ser la misma app de Instagram u otra distinta) y agregarle el producto **WhatsApp**.
2. **Generar un token permanente**: Business Settings → Users → System Users → crear un system user, asignarle el activo de WhatsApp con permiso `whatsapp_business_messaging` + `whatsapp_business_management`, y generar el token desde ahí (no vence, a diferencia del token de prueba de 24hs que da el Quickstart).
3. **Onboarding de Coexistence**: desde el dashboard de WhatsApp de la app, elegir la opción de conectar un número que ya usa la app WhatsApp Business del celular (Coexistence) y escanear el QR desde el teléfono (necesita la app WhatsApp Business actualizada). Esto deja la app del teléfono funcionando en paralelo con la API — los mensajes que se manden a mano desde el celular llegan igual por webhook como "echoes" (ver `smb_message_echoes` en el código).
4. **Configurar el webhook**: Callback URL `https://<tu-dominio>/api/webhooks/whatsapp`, Verify Token = el valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. Suscribirse a los campos **messages** y **smb_message_echoes** (son dos suscripciones separadas — los echoes de Coexistence NO vienen incluidos en el field `messages`).
5. **Completar `.env.local`** (ver `.env.local.example`): `WHATSAPP_ACCESS_TOKEN` (el token permanente del paso 2), `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_BUSINESS_ACCOUNT_ID` (dashboard de WhatsApp → API Setup), `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` (App settings → Basic → App secret de la app usada en el paso 1).
6. **Correr la migración** `supabase/migrations/0015_whatsapp.sql` en el SQL Editor de Supabase antes de activar el webhook.

Igual que Instagram: la IA solo sugiere, cero envíos automáticos — todo mensaje saliente pasa por aprobación manual en `/admin/inbox`.

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
