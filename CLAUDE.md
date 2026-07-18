# Feria Mendoza — Definición de Alcance del MVP

**Fecha:** Julio 2026
**Equipo actual:** Fundadora (negocio/producto), Co-fundador (desarrollo), Claude (arquitecto/PM de apoyo)
**Contexto:** Relanzamiento de un proyecto de marketplace que estuvo activo en redes (Instagram) y se frenó hace ~2 años. Se retoma con foco en construir la plataforma web/app.

---

## 1. Visión del producto

Feria Mendoza es un marketplace local (Mendoza, Argentina) donde usuarios verificados pueden publicar y vender productos, y compradores pueden encontrarlos y pagarlos online. El negocio ya tiene un canal activo de venta de publicaciones vía Instagram (gestionado manualmente, fuera de la app); el desarrollo actual se enfoca en el **canal Web/App**, que digitaliza todo el flujo: publicación paga, verificación de identidad, catálogo, compra y cobro.

---

## 2. Modelo de negocio

Feria Mendoza monetiza de dos formas, una por canal:

1. **Canal Web/App — 100% comisión**: publicar es **gratis** y sin límite de productos. Feria Mendoza no cobra nada al publicar; se queda con un **20% de comisión** sobre cada venta, retenido automáticamente vía **split de Mercado Pago** (modelo *Marketplace* de MP) al momento en que el comprador paga.
2. **Canal Instagram — fee fijo, 100% manual/externo**: el vendedor paga **$10.000** por publicar hasta **10 fotos de productos distintos** en historias, que luego quedan como **historias destacadas durante 1 mes**. Este canal no tiene ninguna integración técnica — la gestión es manual (contacto y venta por WhatsApp), y solo se registra administrativamente en la plataforma para llevar todo en un mismo sistema de facturación.

**Implicación técnica clave:** cada vendedor debe conectar su propia cuenta de Mercado Pago (OAuth) antes de poder cobrar una venta. Esto se suma a la verificación de identidad como parte del onboarding. Como no hay fee de publicación en Web/App, **el primer pago real en el sistema ocurre recién cuando se concreta una venta**, no al publicar.

---

## 3. Roles de usuario

| Rol | Descripción |
|---|---|
| **Comprador** | Navega el catálogo, busca, compra productos con Mercado Pago |
| **Vendedor** | Se verifica (DNI), publica gratis y gestiona sus productos, conecta su cuenta de MP antes de poder cobrar una venta |
| **Admin** | Aprueba/rechaza verificaciones de identidad, modera publicaciones, registra ventas del Plan Instagram, gestiona disputas |

Un mismo usuario puede ser comprador y vendedor a la vez.

---

## 4. Alcance del MVP (V1)

### 4.1 Cuentas y verificación
- Registro / login (email + contraseña)
- Perfil de usuario (nombre, teléfono, zona en Mendoza)
- Carga de foto de DNI para verificación de identidad
- **Solo usuarios verificados pueden publicar** (comprar no requiere verificación)
- Panel admin: cola de verificaciones pendientes → aprobar / rechazar

### 4.2 Publicación (Plan Web/App)
- Publicar es gratis y sin límite de productos — no hay fee de publicación en este canal
- Formulario de producto: título, descripción, precio, categoría, fotos, zona
- Editar / pausar / marcar como vendido / eliminar publicación propia
- Conexión de cuenta de Mercado Pago del vendedor (OAuth) — recién es requisito para poder cobrar una venta (Fase 4), no para publicar

### 4.3 Catálogo y compra
- Catálogo público con filtros: categoría, precio, texto, zona
- Vista de detalle de producto
- Checkout con Mercado Pago (split automático vendedor / plataforma)
- Estado de la orden: `pagado` → `entregado` / `en disputa` → `resuelto` / `reembolsado`

### 4.4 Post-venta básico
- Comprador puede abrir una disputa desde su orden
- Admin visualiza y gestiona disputas (marcar resuelta / disparar reembolso vía API de MP)

### 4.5 Panel de Admin (core, no opcional)
- Cola de verificación de DNI
- Moderación de publicaciones (dar de baja contenido)
- Registro manual de ventas del Plan Instagram (para centralizar todo en un mismo sistema)
- Listado y gestión de disputas abiertas

---

## 5. Fuera del MVP (V2+)

- Chat interno comprador–vendedor
- Sistema de reputación / reviews
- Logística o envíos gestionados por la plataforma
- Notificaciones push / email automáticas
- Favoritos / wishlist
- Verificación de identidad automatizada (KYC vía API, reemplazando la revisión manual)
- Dashboard de analytics para vendedores

---

## 6. Preguntas abiertas / a definir en detalle más adelante

- Política de reembolsos y plazos para resolución de disputas
- Categorías de productos permitidas (¿todo tipo de producto o rubros específicos?)
- Alcance geográfico inicial (¿toda la provincia de Mendoza o zonas específicas al lanzar?)

---

## 7. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend + Backend | Next.js (React, App Router, TypeScript) |
| Base de datos + Auth + Storage | Supabase (Postgres) |
| Hosting | Vercel |
| Pagos | Mercado Pago (Checkout Pro + Marketplace/Split) |
| Repositorio | GitHub |

Criterio: presupuesto ajustado (~$0-20 USD/mes al arrancar), desarrollo 100% vía Claude Code (sin intervención manual de código), stack ampliamente documentado para minimizar errores de agente.

---

## 8. Estructura de datos (modelo inicial)

**Regla general:** campos identificatorios/descriptivos libres (`full_name`, `email`, `phone`, `title`, `description`); todo lo demás que se use para filtrar o definir estados es **selección fija** (enum o tabla de referencia), para evitar inconsistencias en los filtros del catálogo.

### `users`
id (PK), full_name (texto libre), email (texto libre, verificado por link — Supabase Auth), phone (texto libre), zone_id (FK → zones), role (enum: `user`/`admin`), verification_status (enum: `not_submitted`/`pending`/`approved`/`rejected`), dni_photo_url, mp_connected (bool), mp_account_id, created_at

### `zones` (lista fija, administrable)
id (PK), name (ej. Ciudad de Mendoza, Godoy Cruz, Guaymallén, Luján de Cuyo...), active (bool)

### `categories` (lista fija, administrable)
id (PK), name, active (bool)

### `products`
id (PK), seller_id (FK → users), title (texto libre), description (texto libre), price (numérico), category_id (FK → categories), zone_id (FK → zones), condition (enum: `nuevo`/`como_nuevo`/`usado`), photos (array de urls), status (enum: `draft`/`pending_payment`/`active`/`paused`/`sold`/`removed`), plan_id (FK → publication_plans), created_at

### `publication_plans`
id (PK), name, type (enum: `commission`/`fixed_fee`), price (nullable, no aplica para `commission`), duration_days (vigencia, solo aplica a `fixed_fee`), max_active_listings (nullable = sin límite), max_photos (nullable, ej. 10 para el plan de Instagram), commission_percentage (nullable, solo aplica a `commission`), channel (enum: `web`/`instagram`), active (bool)

**Planes reales (seed):**
| Plan | Canal | Tipo | Precio | Límite | Comisión |
|---|---|---|---|---|---|
| Plan Comisión Web | web | commission | — | sin límite de productos | 20% |
| Historias Destacadas IG | instagram | fixed_fee | $10.000 | 10 fotos de productos distintos, 30 días | — |

Todos estos valores deben ser **editables desde el panel de admin** (precio, comisión, duración, límites), sin tocar código.

### `orders`
id (PK), product_id (FK → products), buyer_id (FK → users), seller_id (FK → users), amount, commission_amount, mp_payment_id, status (enum: `pending`/`paid`/`delivered`/`disputed`/`refunded`/`resolved`), created_at

### `disputes`
id (PK), order_id (FK → orders), opened_by (FK → users), reason (texto libre), status (enum: `open`/`in_review`/`resolved`/`refunded`), resolution_notes, created_at, resolved_at

### `instagram_sales` (registro manual, canal externo)
id (PK), seller_name, seller_contact, plan_id (FK → publication_plans, channel=instagram), amount, registered_by (FK → users admin), created_at

### Relaciones
```
users 1───N products
users 1───N orders (buyer) / 1───N orders (seller)
products 1───N orders
orders 1───1 disputes (opcional)
zones 1───N users / 1───N products
categories 1───N products
publication_plans 1───N products
```

Row Level Security (RLS) en Supabase: cada usuario ve/edita solo lo suyo; admin tiene acceso ampliado.

---

## 9. Plan de trabajo (fases de desarrollo)

Pensado para que Claude Code lo ejecute de forma incremental: cada fase entrega algo demostrable, no todo se construye junto al final.

### Fase 0 — Setup
- Repositorio en GitHub
- Proyecto Next.js (App Router, TypeScript)
- Proyecto Supabase (base de datos + auth + storage)
- Conexión Next.js ↔ Supabase
- Deploy inicial en Vercel ("hola mundo" funcionando en producción)

### Fase 1 — Cuentas y verificación
- Registro / login (Supabase Auth, con verificación de email real por link)
- Perfil de usuario (`full_name`, `phone`, `zone_id`)
- Carga de foto de DNI (Supabase Storage)
- Panel admin básico: cola de verificaciones pendientes → aprobar / rechazar

### Fase 2 — Catálogo (sin pagos todavía)
- Tablas `zones` y `categories` con datos semilla (carga inicial)
- Formulario de publicación de producto (título, descripción, precio, categoría, zona, condición, fotos) — sin cobro todavía, queda en `draft`
- Catálogo público con filtros (categoría, zona, condición, precio, texto)
- Vista de detalle de producto
- Editar / pausar / marcar vendido / eliminar publicación propia

### Fase 3 — Modelo de planes y panel de precios
- Tabla `publication_plans` con datos semilla reales (Plan Comisión Web 20%, Historias Destacadas IG $10.000/10 fotos/30 días)
- Publicar en Web/App no requiere pago: el producto pasa directo a `active`, etiquetado con el plan de comisión
- Panel admin para editar precio/comisión/duración/límites de cada plan sin tocar código
- No hay integración de Mercado Pago en esta fase (no hay fee de publicación que cobrar) — el primer pago real llega en la Fase 4, al momento de la venta

### Fase 4 — Conexión OAuth de vendedores + Split de pago
- Vendedor conecta su cuenta de Mercado Pago (OAuth) — se guarda `mp_account_id`
- Checkout de compra para el comprador, con split automático (Marketplace de MP)
- Tabla `orders`: se crea al pagar, queda en estado `paid`

### Fase 5 — Post-venta
- Actualización de estado de orden (`delivered`, etc.)
- Comprador puede abrir disputa (tabla `disputes`)
- Panel admin de disputas: revisar, resolver, o disparar reembolso vía API de MP

### Fase 6 — Registro Plan Instagram + pulido
- Panel admin: carga manual de ventas del Plan Instagram (tabla `instagram_sales`)
- Ajustes de UI/UX generales
- QA end-to-end de los flujos principales (verificación, publicación, compra, disputa)

---

## 10. Roles del equipo (actual y futuro)

- **Fundadora:** producto, negocio, relación con vendedores/comunidad
- **Co-fundador:** desarrollo, arquitectura técnica
- **Claude:** arquitecto de software / PM de apoyo
- *A futuro:* posibilidad de crear agentes especializados (CMO, CEO, CTO) para ordenar la toma de decisiones a medida que el proyecto crezca.

---

## 11. Troubleshooting (lecciones del despliegue inicial)

Todo esto surgió de una sesión larga de debugging del primer deploy a Vercel. Se deja documentado para no volver a perder tiempo con los mismos síntomas.

### "404 NOT_FOUND" en todas las rutas de producción (pero el build compila bien)
- **Causa:** el **Framework Preset del proyecto en Vercel** estaba en "Other" en vez de "Next.js" (Project Settings → General → Framework Settings). Con "Other", Vercel sirve el deploy como sitio estático genérico (buscando archivos en `public/`) e ignora por completo el runtime de Next.js, sin importar que el build local o de Vercel haya compilado perfecto.
- **Fix:** Framework Preset → **Next.js**, y redeploy. Si esto está mal configurado, ningún otro fix de código lo va a solucionar — chequearlo primero ante cualquier 404 masivo en producción.

### `middleware.ts` se ignora en silencio (no corre, sin error ni warning)
- **Causa:** el proyecto usa estructura `src/app`. Next.js requiere que `middleware.ts` esté en **`src/middleware.ts`**, no en la raíz del proyecto, cuando existe una carpeta `src/`. En la raíz, se compila y se invoca sin ningún aviso — el bug es puramente silencioso.
- **Fix:** siempre poner `middleware.ts` dentro de `src/`. Confirmar que corre buscando la línea `✓ Compiled /middleware` en el log de `next dev`/`next build`.

### Por qué el proyecto quedó en Next 15.5.20 y no en Next 16
- Next 16.0 renombró `middleware` a `proxy` (`proxy.ts`), y **el `proxy` corre exclusivamente en Node.js runtime, sin la opción de Edge**. Al migrar a `proxy.ts`, el builder de Vercel de ese momento no generaba ninguna función para las rutas de la app (deploy "exitoso" pero 404 en todo) — soporte incompleto de esta convención tan nueva en el pipeline de deploy.
- **Decisión:** downgrade a **Next 15.5.20** (última estable de la serie 15.x), donde `middleware.ts` sigue siendo la única convención y soporta Node.js runtime de forma estable (`export const config = { runtime: "nodejs", matcher: [...] }`), evitando tanto el crash de Edge Runtime (`__dirname is not defined`, ver más abajo) como el problema de deploy de `proxy.ts`.
- Si en el futuro se evalúa volver a Next 16+, primero confirmar que el builder de Vercel ya soporta `proxy.ts` correctamente (probar en un deploy de prueba antes de migrar el proyecto real).

### `ReferenceError: __dirname is not defined` en el middleware (Edge Runtime)
- **Causa:** `__dirname` es una variable de Node.js que no existe en Edge Runtime. Pasaba porque `middleware.ts` corría en Edge por defecto (comportamiento legado de Next).
- **Fix:** ya cubierto por el punto anterior — Node.js runtime explícito en el `config` del middleware evita todo el Edge Runtime.

### El registro no manda el email de confirmación / dice `"{}"` como error
- **Causa raíz real (no era código):** el remitente configurado en el SMTP de Supabase (Authentication → Emails → SMTP Settings) usa el dominio de pruebas de Resend, `onboarding@resend.dev`. Ese dominio **solo puede mandar emails a la dirección con la que te registraste en Resend** — cualquier otro destinatario se rechaza (403 en los logs de Resend), y Supabase envuelve ese rechazo en un genérico `"Error sending confirmation email"` (500) que el cliente de Auth (`@supabase/auth-js`) termina mostrando como el string literal `"{}"` en vez del mensaje real.
- **Para producción real:** hay que verificar un dominio propio en resend.com/domains y cambiar el "Sender email" en Supabase a una dirección de ese dominio (ej. `noreply@tudominio.com`). Sin esto, ningún usuario real va a poder confirmar su cuenta.
- **Efecto secundario a tener en cuenta al debuggear:** si probás el signup con tu propia dirección de Resend y un usuario con ese email ya existe en `auth.users` (aunque sea de una prueba vieja), Supabase devuelve un 200 "éxito" falso sin mandar ningún email nuevo (protección anti-enumeración de cuentas) — hay que borrar el usuario viejo de Authentication → Users antes de reintentar para que sea un signup genuinamente nuevo.
- **Fix de código ya aplicado:** el mensaje de error nunca debe mostrarse crudo — si `error.message` viene vacío o es literalmente `"{}"`, mostrar un mensaje genérico y loguear el error completo (con `Object.getOwnPropertyNames`, que sí captura `.message` aunque no sea enumerable) del lado del servidor para diagnosticar futuros casos desde los logs de Vercel.

### Rate limit de reenvío de confirmación (Supabase)
- Supabase exige un intervalo mínimo de **60 segundos** entre reenvíos de email de confirmación para el mismo usuario. Si se prueba el botón de "reenviar" muy seguido, va a fallar silenciosamente o devolver error — no es un bug, hay que esperar el intervalo.
- El servicio de email *default* de Supabase (sin SMTP propio) tiene un límite mucho más bajo (~3-4 emails/hora en total) — motivo original por el que se configuró SMTP propio con Resend.

### Site URL de Supabase apuntando a localhost
- **Síntoma:** los logs de Auth de Supabase muestran `referer: http://localhost:3000` aunque el request real venga del dominio de producción.
- **Causa:** Authentication → URL Configuration → **Site URL** queda en `http://localhost:3000` por defecto al crear el proyecto, y GoTrue lo usa como fallback si la URL de `emailRedirectTo` que manda la app no está en la lista de "Redirect URLs" permitidas — sin importar que el código arme bien la URL (ver `src/lib/site-url.ts`).
- **Fix:** en el dashboard de Supabase, actualizar **Site URL** al dominio real de producción, y agregar ese dominio (con wildcard, ej. `https://feria-mendoza.vercel.app/**`) a **Redirect URLs**.

---

## 12. Extensión post-lanzamiento (Fases F–J)

Continuación de las fases del punto 9, pensada para después del lanzamiento inicial del MVP. Mismo criterio: cada fase entrega algo demostrable y no requiere que las siguientes estén hechas.

### Fase F — Perfil de usuario
- Foto de perfil del usuario, en bucket de Supabase Storage **público** (a diferencia del bucket de DNI, que es privado y requiere URL firmada)
- Username único por usuario
- Foto de perfil y username visibles en tarjeta de producto (catálogo) y en vista de detalle de producto

### Fase G — Categorías
- Categoría **Ropa** con sub-categorías organizadas por género/edad estilo mega-menú: Mujer / Hombre / Kids, cada una con Belleza, Accesorios, Calzado, Ropa
- Categorías nuevas de primer nivel: Electro, Herramientas, Hogar y Jardín, Juguetes, Muebles
- Categorías **Autos** e **Inmuebles** con campos propios específicos del rubro (Autos: km, año; Inmuebles: ambientes, m²) — no aplican al resto de categorías

### Fase H — Filtros del catálogo
- Mover los filtros del catálogo (categoría, zona, condición, precio, texto) de su ubicación actual a un panel lateral

### Fase I — Reputación y reseñas
- Un comprador puede dejar una reseña a un vendedor solo si tiene una compra confirmada de ese vendedor (`orders.status = 'paid'` o un estado posterior en el flujo: `delivered`, `resolved`)
- Reputación promedio y cantidad de ventas del vendedor, visibles en tarjeta de producto y en vista de detalle

### Fase J — Carrito multi-vendedor
- El carrito se agrupa por vendedor: el modelo de split vía OAuth de Mercado Pago no permite pagarle a 2 vendedores distintos en una sola transacción
- Un pago por vendedor, ejecutado en secuencia, pero presentado al comprador como un solo flujo de checkout (no como carritos separados)
