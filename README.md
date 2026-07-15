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
4. **Configurar el webhook**: Callback URL `https://<tu-dominio>/api/webhooks/whatsapp`, Verify Token = el valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
5. **⚠️ Suscribir DOS campos, no uno**: en la lista de webhook fields, tildar tanto **`messages`** (mensajes entrantes + estados de entrega) como **`smb_message_echoes`** (mensajes mandados a mano desde la app del teléfono). Son suscripciones independientes — si solo tildás `messages`, los echoes de Coexistence nunca van a llegar y el admin podría terminar aprobando una respuesta a un chat que ya se respondió desde el celular.
6. **Completar `.env.local`** (ver `.env.local.example`): `WHATSAPP_ACCESS_TOKEN` (el token permanente del paso 2), `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_BUSINESS_ACCOUNT_ID` (dashboard de WhatsApp → API Setup), `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` (App settings → Basic → App secret de la app usada en el paso 1).
7. **Correr la migración** `supabase/migrations/0015_whatsapp.sql` en el SQL Editor de Supabase antes de activar el webhook.

Igual que Instagram: la IA solo sugiere, cero envíos automáticos — todo mensaje saliente pasa por aprobación manual en `/admin/inbox`.

### Exponer el server local con HTTPS para probar el webhook (túnel)

Meta necesita pegarle a una URL pública HTTPS — no le llega a `localhost:3000` directo. Para desarrollo/pruebas, la forma más simple sin crear cuenta en ningún lado es un túnel SSH efímero (el mismo mecanismo que `ssh -R`, sin instalar nada):

```bash
ssh -R 80:localhost:3000 serveo.net
```

Al conectar, imprime una línea tipo `Forwarding HTTP traffic from https://<subdominio-random>.serveousercontent.com` — esa URL + `/api/webhooks/whatsapp` es la Callback URL que va en el dashboard de Meta mientras se prueba en local.

**Importante:**
- La URL es **efímera**: cambia cada vez que se reinicia el túnel (sin cuenta no se puede fijar un subdominio). Si el túnel se cae (reinicio de Mac, cambio de red, etc.) hay que volver a correr el comando y actualizar la Callback URL en Meta con la URL nueva.
- Dejar la terminal/proceso corriendo mientras se hacen pruebas — al cortar el SSH, el túnel se cae.
- Alternativa si `serveo.net` no anda: `cloudflared tunnel --url http://localhost:3000` (`brew install cloudflared` primero) — en teoría es la opción más simple sin cuenta, pero requiere que el DNS de `trycloudflare.com` resuelva; algunos routers/ISP lo bloquean por categoría (nos pasó probándolo). Si `nslookup trycloudflare.com` no resuelve, usar `serveo.net` en su lugar, como arriba.
- Nada de esto hace falta en producción: ahí la Callback URL es el dominio real de Vercel, sin túnel.

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
