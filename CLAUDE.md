# Feria Mendoza — Definición de Alcance del MVP

**Fecha:** Julio 2026
**Equipo actual:** Fundadora (negocio/producto), Co-fundador (desarrollo), Claude (arquitecto/PM de apoyo)
**Contexto:** Relanzamiento de un proyecto de marketplace que estuvo activo en redes (Instagram) y se frenó hace ~2 años. Se retoma con foco en construir la plataforma web/app.

---

## 1. Visión del producto

Feria Mendoza es un marketplace local (Mendoza, Argentina) donde usuarios verificados pueden publicar y vender productos, y compradores pueden encontrarlos y pagarlos online. El negocio ya tiene un canal activo de venta de publicaciones vía Instagram (gestionado manualmente, fuera de la app); el desarrollo actual se enfoca en el **canal Web/App**, que digitaliza todo el flujo: publicación paga, verificación de identidad, catálogo, compra y cobro.

---

## 2. Modelo de negocio

Feria Mendoza monetiza de dos formas:

1. **Fee de publicación** (el vendedor paga por publicar su producto)
   - Plan Instagram: gestión 100% manual/externa (no requiere desarrollo, solo registro administrativo)
   - Plan Web/App: gestión dentro de la plataforma, pago con Mercado Pago
2. **Comisión sobre ventas** (Plan Web/App): cuando el comprador paga un producto, Mercado Pago hace un **split automático** — el vendedor recibe el pago directo a su cuenta y Feria Mendoza retiene su porcentaje automáticamente (modelo *Marketplace* de MP).

**Implicación técnica clave:** cada vendedor debe conectar su propia cuenta de Mercado Pago (OAuth) antes de poder cobrar. Esto se suma a la verificación de identidad como parte del onboarding.

---

## 3. Roles de usuario

| Rol | Descripción |
|---|---|
| **Comprador** | Navega el catálogo, busca, compra productos con Mercado Pago |
| **Vendedor** | Se verifica (DNI), conecta su cuenta de MP, paga el plan de publicación, publica y gestiona sus productos |
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
- Conexión de cuenta de Mercado Pago del vendedor (OAuth) — requisito para poder cobrar
- Elegir plan de publicación (pago único o suscripción) → pago vía Mercado Pago antes de publicar
- Formulario de producto: título, descripción, precio, categoría, fotos, zona
- Editar / pausar / marcar como vendido / eliminar publicación propia

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
- Renovación automática de suscripciones (en V1 puede ser manual o con recordatorio)

---

## 6. Preguntas abiertas / a definir en detalle más adelante

- Estructura exacta de precios de los planes de publicación (pago único vs. suscripción, montos)
- Porcentaje de comisión que retiene Feria Mendoza en el split de Mercado Pago
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
id (PK), name, type (enum: `one_time`/`subscription`), price, duration_days, channel (enum: `web`/`instagram`)

### `orders`
id (PK), product_id (FK → products), buyer_id (FK → users), seller_id (FK → users), amount, commission_amount, mp_payment_id, status (enum: `pending`/`paid`/`delivered`/`disputed`/`refunded`/`resolved`), created_at

### `disputes`
id (PK), order_id (FK → orders), opened_by (FK → users), reason (texto libre), status (enum: `open`/`in_review`/`resolved`/`refunded`), resolution_notes, created_at, resolved_at

### `instagram_sales` (registro manual, canal externo)
id (PK), seller_name, seller_contact, plan_id (FK → publication_plans, channel=instagram), amount, registered_by (FK → users admin), created_at

### `payment_subscriptions`
id (PK), user_id (FK → users), plan_id (FK → publication_plans), status (enum: `active`/`expired`/`cancelled`), current_period_end, mp_subscription_id

### Relaciones
```
users 1───N products
users 1───N orders (buyer) / 1───N orders (seller)
products 1───N orders
orders 1───1 disputes (opcional)
zones 1───N users / 1───N products
categories 1───N products
publication_plans 1───N products / 1───N payment_subscriptions
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

### Fase 3 — Pagos del vendedor (fee de publicación)
- Tabla `publication_plans` con datos semilla (planes web, pago único y suscripción)
- Integración Mercado Pago (Checkout Pro) para cobrar el plan elegido
- Al confirmarse el pago (webhook de MP), el producto pasa de `pending_payment` a `active`

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
