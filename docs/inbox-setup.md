# Bandeja de Instagram — setup manual en Meta

Esto no se puede automatizar: son pasos en el dashboard de Meta for
Developers. Se documentan acá para no perder tiempo la próxima vez.

## 1. Crear la app en Meta for Developers

1. Entrar a [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Crear app** → tipo **Business**.
2. Dentro de la app, agregar el producto **Instagram API with Instagram login** (no hace falta una página de Facebook ni el producto viejo "Instagram Graph API" clásico — este es el flujo nuevo, pensado para cuentas profesionales sin depender de una Page).
3. Con **Standard Access** alcanza para operar sobre la cuenta propia (la del negocio) sin pasar por **App Review** de Meta. App Review recién hace falta si en algún momento la app necesita operar sobre cuentas de Instagram de terceros.

## 2. Conectar la cuenta de Instagram

1. La cuenta de Instagram tiene que ser **profesional** (Business o Creator) — si es personal, convertirla desde la app de Instagram (Configuración → Cuenta → Cambiar a cuenta profesional).
2. En el panel de **Instagram API with Instagram login** de la app, generar el login de la cuenta y autorizar los permisos que pide (mensajería + comentarios).
3. Anotar el **IGSID** (Instagram-scoped User ID) de la cuenta conectada — es el valor de `IG_USER_ID`.

## 3. Suscribir los webhooks

1. En **Webhooks** dentro del producto de Instagram, suscribirse a los campos:
   - `comments` (comentarios nuevos en publicaciones)
   - `messages` (DMs entrantes)
2. Callback URL: `https://<tu-dominio>/api/webhooks/instagram`
3. Verify token: cualquier string propio — el mismo valor va en `META_WEBHOOK_VERIFY_TOKEN`. Meta hace un `GET` a la callback URL con `hub.verify_token` y espera recibir `hub.challenge` de vuelta tal cual si el token coincide (lo maneja el `GET` de `src/app/api/webhooks/instagram/route.ts`).
4. Guardar el **App Secret** (App settings → Basic → App secret, hay que apretar "Show") en `META_APP_SECRET` — firma cada webhook entrante vía el header `X-Hub-Signature-256`.

## 4. Generar el token de larga duración

1. Con el login de Instagram del paso 2 se obtiene un **short-lived token** (1 hora).
2. Canjearlo por uno de **larga duración** (60 días) siguiendo el flujo de intercambio de Meta (`GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=...&access_token=<short_lived>`).
3. Guardar ese token y su fecha de expiración directo en la tabla `social_settings` (fila única, `id=1`) — **no va en variables de entorno**, porque rota cada 60 días y no queremos redeployar cada vez. El cron semanal (`/api/cron/refresh-ig-token`) lo renueva solo cuando falten menos de 15 días para el vencimiento.
4. Para cargar el token por primera vez (antes de que exista UI para esto), insertarlo a mano vía el SQL Editor de Supabase:
   ```sql
   update social_settings
   set ig_access_token = '<el token>',
       ig_token_expires_at = now() + interval '60 days'
   where id = 1;
   ```

## 5. Variables de entorno

Completar en `.env.local` (ver `.env.local.example`):

- `META_APP_SECRET`
- `META_WEBHOOK_VERIFY_TOKEN`
- `IG_USER_ID`
- `ANTHROPIC_API_KEY`
- `CRON_SECRET` (inventado, protege el cron de refresh de token)
- `INBOX_DRY_RUN=true` mientras se desarrolla sin un token real (loguea el envío en vez de llamar a la Graph API).

`SUPABASE_SERVICE_ROLE_KEY` ya debería estar cargada de fases anteriores — la usa `src/lib/supabase/admin.ts` para todas las escrituras del webhook/cron/backfill.

## 6. Correr la migración

Pegar el contenido de `supabase/migrations/0014_social_inbox.sql` en el SQL Editor de Supabase (Project → SQL Editor) y ejecutarlo — mismo procedimiento manual que las migraciones anteriores del proyecto.

## 7. Probar el webhook

- El handshake (`GET`) se puede probar pegando la callback URL + query params en el navegador, o dejando que Meta lo dispare al guardar la suscripción — si el verify token no matchea, Meta muestra error en el dashboard.
- Para probar el `POST` con firma real, lo más simple es mandar un comentario o DM real a la cuenta conectada y revisar los logs de Vercel.
