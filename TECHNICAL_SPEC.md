# TECHNICAL_SPEC.md — CRM-123

**Especificación técnica para Claude Code Web.**

| Dato | Valor |
|---|---|
| Marca | CRM-123 |
| Rama de fuentes | `gh-crm-123` |
| Carpetas | `/web` (escritorio, vendedores) · `/pwa` (móvil, supervisor) |
| Base de datos | Supabase, proyecto `dbcrm123` |
| Despliegue | Vercel, manual |
| Zona horaria | `Europe/Madrid` |
| Moneda | EUR, **sin IVA** |
| Idioma | Español de España |

> **Dependencia normativa:** la estructura de datos está definida en `SCRIPTS-SQL.md`.
> Este documento la consume y **no puede modificarla**. Ningún nombre de tabla, columna,
> vista o valor de enumeración se inventa, se renombra ni se añade. Si algo hace falta y
> no está, se detiene el trabajo y se pide una decisión al humano.

---

## 1. Índice

1. Índice
2. Arquitectura
3. Modelo de datos (referencia)
4. Reglas de negocio
5. Seguridad por fila
6. Autenticación
7. Endpoints
8. Protección del disparo manual de n8n
9. Flujo de automatización
10. Variables de entorno
11. Estructura del repositorio
12. Manejo de errores
13. Rendimiento
14. Qué está prohibido

---

## 2. Arquitectura

```
┌─────────────────────┐        ┌─────────────────────┐
│  /web  (escritorio) │        │  /pwa  (móvil)      │
│  Vendedores         │        │  Supervisor         │
│  Next.js App Router │        │  Next.js App Router │
└──────────┬──────────┘        └──────────┬──────────┘
           │                              │
           └──────────────┬───────────────┘
                          │  HTTPS
                 ┌────────▼─────────┐
                 │  Route Handlers  │  ← única capa que
                 │  Server Actions  │    ve la clave de servicio
                 └────────┬─────────┘
                          │
              ┌───────────┴────────────┐
              │                        │
    ┌─────────▼─────────┐    ┌─────────▼─────────┐
    │  Supabase         │    │  n8n cloud        │
    │  Postgres + Auth  │    │  (nunca toca      │
    │  RLS activa       │    │   Postgres)       │
    └───────────────────┘    └─────────┬─────────┘
                                       │
                             ┌─────────▼─────────┐
                             │  Resend           │
                             └───────────────────┘
```

**Regla de oro del flujo:** n8n **nunca** abre una conexión a Postgres. Pide y devuelve
datos exclusivamente por los endpoints `/api/n8n/*` de la aplicación.

### Pila

| Capa | Elección |
|---|---|
| Framework | Next.js, App Router, TypeScript estricto |
| Estilos | Tailwind CSS |
| Componentes | shadcn/ui |
| Sistema de diseño | **Lo define Claude Design.** Claude Code Web lo respeta sin reinterpretarlo |
| Datos y sesión | Supabase (`@supabase/ssr`) |
| Validación | Zod, en el servidor y en el cliente |
| Formularios | react-hook-form |
| Correo | Resend, disparado desde n8n |
| Automatización | n8n cloud |
| Hospedaje | Vercel |

### Los tres clientes de Supabase

| Cliente | Dónde vive | Clave | Uso |
|---|---|---|---|
| Navegador | Componentes cliente | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Lecturas sujetas a RLS |
| Servidor | Server Components, Route Handlers | `NEXT_PUBLIC_SUPABASE_ANON_KEY` + cookie de sesión | Lecturas y escrituras del usuario, sujetas a RLS |
| Administrador | **Solo** Route Handlers y Server Actions | `SUPABASE_SERVICE_ROLE_KEY` | Alta de usuarios, resolución de usuario a email, escritura en `automation_runs` |

El cliente administrador vive en un único archivo, `lib/supabase/admin.ts`, con la primera
línea `import 'server-only';`. Jamás se importa desde un componente cliente, ni siquiera
sin usarse.

---

## 3. Modelo de datos (referencia)

Estructura completa en `SCRIPTS-SQL.md`. Resumen operativo:

| Tabla | Qué guarda | Verbos permitidos |
|---|---|---|
| `profiles` | Usuarios del CRM | select, insert, update |
| `quotas` | Cuota mensual por vendedor | select, insert, update |
| `customers` | Ficha permanente del cliente | select, insert, update |
| `opportunities` | Negociación, una abierta por cliente | select, insert, update |
| `activities` | Historial de contactos | **select, insert** |
| `audit_log` | Auditoría | **select, insert** |
| `settings` | Configuración global | select, insert, update |
| `automation_runs` | Bitácora de disparos de n8n | select (escritura solo con clave de servicio) |

**Ninguna tabla admite `delete`.**

| Vista | Para qué |
|---|---|
| `v_opportunity_board` | Tablero del día y tabla densa. Trae el atraso ya calculado |
| `v_seller_month_progress` | Cuota, cerrado, porcentaje y atrasadas por vendedor |
| `v_team_month_progress` | Consolidado del equipo (solo devuelve datos al supervisor) |
| `v_loss_reasons_month` | Motivos de pérdida del mes |

**La aplicación no recalcula el atraso.** Lee `needs_attention`, `is_stale`, `is_overdue`
y `is_due_today` de la vista. Duplicar la lógica en TypeScript está prohibido: sería una
segunda fuente de verdad que se desincronizaría.

---

## 4. Reglas de negocio

### R1 — Teléfono único, con aviso ciego
El teléfono es único en todo el sistema. Al intentar crear un cliente con un teléfono existente:

1. La aplicación consulta por el teléfono **con la clave de servicio** (porque RLS ocultaría el cliente de otro vendedor y el vendedor vería un error de unicidad confuso).
2. Si existe, devuelve `409` con el cuerpo `{ "error": "customer_exists", "owned_by_other": true }`.
3. La interfaz muestra: *«Este cliente ya existe en el sistema y lo lleva otro compañero.»*
4. **Nunca** se devuelve el nombre, la empresa, el vendedor propietario ni ningún otro dato de ese cliente.
5. Si el cliente existente es **suyo**, se devuelve `409` con `owned_by_other: false` y la interfaz ofrece abrir su ficha.

### R2 — Normalización del teléfono
Antes de guardar o comparar, el teléfono se normaliza a E.164 español:
- Se eliminan espacios, guiones y paréntesis.
- Si empieza por `6`, `7`, `8` o `9` y tiene 9 dígitos, se antepone `+34`.
- Si empieza por `0034` o `34`, se sustituye por `+34`.
- El resultado debe cumplir `^\+34[6-9]\d{8}$`. Si no, se rechaza con `422`.
- **La comparación de duplicados se hace siempre sobre el valor normalizado.**

### R3 — Una oportunidad abierta por cliente
La base lo impone con un índice único parcial. La aplicación además:
- Oculta el botón «Nueva oportunidad» si el cliente ya tiene una abierta.
- Si el índice salta igualmente, devuelve `409` con `{ "error": "open_opportunity_exists" }`.

### R4 — Cierre de oportunidad
Ganada: importe final obligatorio, precargado con el estimado, editable. Se fija `status='won'`, `stage='closed'`, `closed_at=now()`, `final_amount`.
Perdida: motivo obligatorio de la lista cerrada. Nota opcional. Se fija `status='lost'`, `stage='closed'`, `closed_at=now()`, `loss_reason`. **`final_amount` queda nulo.**
Una oportunidad cerrada **no se reabre**. Si el cliente vuelve, se crea una oportunidad nueva.

### R5 — Actividades inmutables
Se insertan, nunca se editan ni se borran. La interfaz no ofrece esas acciones.
Un disparador refresca `last_activity_at` de la oportunidad y copia `next_action_at` si viene.
No se pueden registrar actividades en oportunidades cerradas: el disparador lo rechaza.

### R6 — Reasignación
Solo el supervisor. Cambia `customers.owner_id`; un disparador arrastra las oportunidades del cliente. Se escribe en `audit_log` la acción `customer.reassigned` con el propietario anterior y el nuevo en `metadata`.

### R7 — Archivado
Nunca se usa la palabra «eliminar» en la interfaz. La acción se llama **«Archivar»**.
- **Cliente archivado:** `is_archived=true`, `archived_at`, `archived_by`. Desaparece de las listas y no admite oportunidades nuevas. Solo el supervisor archiva y desarchiva.
- **Usuario desactivado:** `is_active=false`, `deactivated_at`, `deactivated_by`. No puede iniciar sesión y sus funciones de RLS devuelven falso. Su cartera queda visible para el supervisor y disponible para reasignar.
- **Las oportunidades no se archivan.** Se cierran como ganadas o perdidas.

### R8 — Cuotas
Una fila por vendedor y mes. Si un mes no tiene fila, la cuota es cero y el porcentaje se muestra como «—», nunca como 0 %.
El avance del mes suma `final_amount` de oportunidades `won` cuyo `closed_at` cae en el mes en curso **en horario de Madrid**.

### R9 — Aislamiento total entre vendedores
Un vendedor no ve nada de otro: ni nombres, ni cifras, ni ranking. La interfaz no muestra en ningún punto un listado de compañeros.

### R10 — Importes sin IVA
Todos los importes son base imponible. La interfaz lo indica una vez, discretamente, junto al primer campo de importe: *«Importes sin IVA»*.

### R11 — Prohibición de identificadores personales
La aplicación no pide, no guarda y no muestra DPI, NIT, DNI, NIE, CIF, pasaporte ni ningún identificador fiscal o nacional. Ningún formulario los incluye, ni siquiera como campo opcional.

### R12 — Auditoría
Se escribe una fila en `audit_log` en cada uno de estos eventos, con `actor_id = auth.uid()`:

| Acción | `entity_type` | `metadata` |
|---|---|---|
| `customer.created` | `customer` | `{phone_last4, source}` |
| `customer.updated` | `customer` | `{changed_fields:[...]}` |
| `customer.archived` | `customer` | `{}` |
| `customer.reassigned` | `customer` | `{from_owner_id, to_owner_id}` |
| `opportunity.created` | `opportunity` | `{customer_id, estimated_amount}` |
| `opportunity.stage_changed` | `opportunity` | `{from_stage, to_stage}` |
| `opportunity.won` | `opportunity` | `{final_amount, estimated_amount}` |
| `opportunity.lost` | `opportunity` | `{loss_reason, estimated_amount}` |
| `user.created` | `profile` | `{username, role}` |
| `user.deactivated` | `profile` | `{}` |
| `user.reactivated` | `profile` | `{}` |
| `user.password_changed` | `profile` | `{first_login: bool}` |
| `quota.changed` | `quota` | `{period_year, period_month, from_amount, to_amount}` |
| `automation.manual_trigger` | `automation` | `{run_id, flow}` |

**`metadata` nunca contiene el teléfono completo, ni el email, ni la contraseña.**

---

## 5. Seguridad por fila

Las políticas están en `SCRIPTS-SQL.md`, Script 08. Lo que la aplicación debe entender:

| Quién | Qué ve | Qué escribe |
|---|---|---|
| Vendedor activo | Sus clientes, sus oportunidades, sus actividades, su cuota, su perfil, `settings` | Crea clientes y oportunidades suyas; registra actividades; mueve etapas; cierra sus oportunidades; cambia su contraseña |
| Vendedor desactivado | Nada | Nada |
| Supervisor | Todo, más `audit_log` y `automation_runs` | Todo lo anterior, más reasignar, archivar, crear usuarios y fijar cuotas |
| Anónimo | Nada | Nada |

**Consecuencias para el desarrollo:**

1. **El rol se lee de `profiles`.** Nunca de `user_metadata`, `app_metadata` ni de ninguna reclamación del JWT. Se usa la función `public.is_supervisor()` o una lectura directa de `profiles` en el servidor.
2. **Las consultas no llevan `where owner_id = ...` de adorno.** RLS ya filtra. Añadirlo es redundante y da la falsa impresión de que la seguridad vive en el cliente.
3. **La clave de servicio esquiva RLS.** Solo se usa en los cuatro casos listados en la sección 2, y cada uso lleva una comprobación explícita de rol inmediatamente antes.
4. **Una consulta que devuelve cero filas no es un error de la aplicación.** Puede ser RLS haciendo su trabajo. Se muestra el estado vacío, no un error.

---

## 6. Autenticación

### Diseño
El vendedor entra con **nombre de usuario y contraseña**. Nunca ve un email. Supabase Auth
identifica por email internamente, así que la aplicación traduce el nombre de usuario a
email en el servidor.

### Flujo de ingreso

```
1. El usuario escribe: usuario + contraseña
2. POST /api/auth/login
3. El servidor, con la CLAVE DE SERVICIO:
     select id, email, is_active, must_change_password
     from profiles where lower(username) = lower(:username)
4. Si no existe o is_active = false:
     → 401 genérico. Mensaje idéntico al de contraseña incorrecta.
       Nunca se revela si el usuario existe.
5. Si existe: signInWithPassword({ email, password })
6. Si falla: → 401 genérico.
7. Si acierta: se establece la cookie de sesión.
8. Si must_change_password = true:
     → redirección forzada a /cambiar-contrasena
       Toda otra ruta redirige de vuelta allí hasta que se cambie.
9. Si no: → redirección al tablero del día (vendedor) o al panel (supervisor).
```

**El mensaje de error es siempre el mismo:** *«Usuario o contraseña incorrectos.»* No se
distingue entre usuario inexistente, contraseña errónea y cuenta desactivada. Distinguir
permitiría enumerar usuarios.

### Cambio de contraseña en el primer ingreso
- Página `/cambiar-contrasena`, sin navegación, sin posibilidad de saltarla.
- Pide contraseña nueva y confirmación. No pide la actual: acaba de autenticarse.
- Mínimo 10 caracteres. Se rechazan las 100 contraseñas más comunes y cualquiera que contenga el nombre de usuario.
- Al guardar: `updateUser({ password })`, luego `profiles.must_change_password = false`, luego auditoría `user.password_changed` con `{first_login: true}`.
- El middleware lo hace cumplir en el servidor, no solo con una redirección de cliente.

### Alta de usuarios
Solo el supervisor, desde `/admin/usuarios`. El endpoint, con la clave de servicio:
1. Comprueba que quien llama es supervisor **leyendo `profiles`**.
2. Valida que el nombre de usuario cumple `^[a-z0-9._-]{3,32}$` y no existe.
3. `auth.admin.createUser({ email, password, email_confirm: true })`.
4. Inserta en `profiles` con `must_change_password = true`.
5. Inserta la cuota del mes en curso si se indicó.
6. Audita `user.created`.
7. Devuelve el usuario y la contraseña **una sola vez**, para que el supervisor la entregue en persona. **No se almacena en ningún sitio ni se envía por correo.**

**No existe autoregistro. No hay correo de invitación. No hay recuperación de contraseña por email.** Si un vendedor la olvida, el supervisor genera una nueva desde el panel y vuelve a activarse `must_change_password`.

### Middleware
Un único middleware protege ambas aplicaciones:

```
/login, /api/auth/login .............. público
/api/n8n/* ........................... firma HMAC, no sesión (sección 8)
/cambiar-contrasena .................. sesión válida
/admin/* ............................. sesión + rol supervisor leído de profiles
todo lo demás ........................ sesión válida + must_change_password = false
```

En cada petición el middleware refresca la sesión y comprueba `is_active`. Un usuario desactivado en mitad de su jornada queda fuera en la siguiente navegación.

---

## 7. Endpoints

Convenciones: `Content-Type: application/json`. Toda entrada validada con Zod en el servidor. Errores con la forma `{ "error": "codigo_maquina", "message": "Texto para la persona" }`.

### 7.1 Autenticación

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| `POST` | `/api/auth/login` | Público | Traduce usuario a email e inicia sesión |
| `POST` | `/api/auth/logout` | Sesión | Cierra sesión |
| `POST` | `/api/auth/change-password` | Sesión | Cambia la contraseña y baja `must_change_password` |

```
POST /api/auth/login
  → { username: string, password: string }
  ← 200 { redirect_to: "/tablero" | "/cambiar-contrasena" | "/panel" }
  ← 401 { error: "invalid_credentials", message: "Usuario o contraseña incorrectos." }
  ← 429 { error: "too_many_attempts" }   // 10 intentos / 15 min por IP
```

### 7.2 Clientes

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| `GET` | `/api/customers` | Sesión | Lista (RLS filtra). Parámetros: `q`, `source`, `page`, `page_size` |
| `POST` | `/api/customers` | Sesión | Crea. Comprueba duplicado de teléfono |
| `GET` | `/api/customers/:id` | Sesión | Ficha con oportunidad abierta e historial |
| `PATCH` | `/api/customers/:id` | Sesión | Edita nombre, empresa, canal |
| `POST` | `/api/customers/check-phone` | Sesión | Comprueba disponibilidad antes de enviar el formulario |
| `POST` | `/api/customers/:id/archive` | Supervisor | Archiva |
| `POST` | `/api/customers/:id/unarchive` | Supervisor | Desarchiva |
| `POST` | `/api/customers/:id/reassign` | Supervisor | Reasigna a otro vendedor |

```
POST /api/customers
  → { phone, full_name, company?, source? }
  ← 201 { id, phone, full_name, company, source }
  ← 409 { error: "customer_exists", owned_by_other: true,
          message: "Este cliente ya existe en el sistema y lo lleva otro compañero." }
  ← 409 { error: "customer_exists", owned_by_other: false, customer_id: "...",
          message: "Ya tienes a este cliente registrado." }
  ← 422 { error: "invalid_phone",
          message: "El teléfono debe ser un móvil o fijo español válido." }
```

```
POST /api/customers/:id/reassign
  → { to_owner_id: uuid }
  ← 200 { id, owner_id }
  ← 403 { error: "forbidden" }        // rol leído de profiles
  ← 422 { error: "invalid_target" }   // destino inexistente o inactivo
```

### 7.3 Oportunidades

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| `GET` | `/api/opportunities` | Sesión | Tabla densa. Parámetros: `stage`, `needs_attention`, `q`, `sort`, `page` |
| `POST` | `/api/opportunities` | Sesión | Crea. Falla si el cliente ya tiene una abierta |
| `GET` | `/api/opportunities/:id` | Sesión | Detalle con actividades |
| `PATCH` | `/api/opportunities/:id` | Sesión | Cambia etapa, importe estimado o próxima acción |
| `POST` | `/api/opportunities/:id/win` | Sesión | Cierra como ganada |
| `POST` | `/api/opportunities/:id/lose` | Sesión | Cierra como perdida |

```
POST /api/opportunities
  → { customer_id: uuid, estimated_amount: number, next_action_at?: string }
  ← 201 { id, stage: "new", status: "open" }
  ← 409 { error: "open_opportunity_exists",
          message: "Este cliente ya tiene una oportunidad abierta." }
  ← 409 { error: "customer_archived" }

POST /api/opportunities/:id/win
  → { final_amount: number }
  ← 200 { id, status: "won", final_amount, closed_at }
  ← 409 { error: "already_closed" }
  ← 422 { error: "final_amount_required" }

POST /api/opportunities/:id/lose
  → { loss_reason: enum, loss_note?: string }
  ← 200 { id, status: "lost", loss_reason, closed_at }
  ← 409 { error: "already_closed" }
  ← 422 { error: "loss_reason_required" }
```

### 7.4 Actividades

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| `GET` | `/api/opportunities/:id/activities` | Sesión | Historial, más reciente primero |
| `POST` | `/api/opportunities/:id/activities` | Sesión | Registra una actividad |

```
POST /api/opportunities/:id/activities
  → { type: enum, note: string, next_action_at?: string }
  ← 201 { id, type, note, created_at }
  ← 409 { error: "opportunity_closed" }
```

**No existe `PATCH` ni `DELETE` sobre actividades. No se implementan, ni desactivados.**

### 7.5 Tablero y panel

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| `GET` | `/api/board/today` | Sesión | Los tres bloques del tablero del día |
| `GET` | `/api/me/progress` | Sesión | Cuota, cerrado, restante, porcentaje |
| `GET` | `/api/team/progress` | Supervisor | Semáforo por vendedor + consolidado |
| `GET` | `/api/team/loss-reasons` | Supervisor | Motivos de pérdida del mes |
| `GET` | `/api/audit` | Supervisor | Auditoría paginada. Parámetros: `entity_type`, `actor_id`, `from`, `to` |

```
GET /api/board/today
  ← 200 {
      needs_attention: [ { opportunity_id, customer_name, customer_company,
                           stage, estimated_amount, days_without_activity,
                           threshold_days, is_stale, is_overdue } ],
      due_today:       [ { opportunity_id, customer_name, stage,
                           estimated_amount, next_action_at } ],
      my_month:        { quota_amount, closed_amount, remaining_amount,
                         quota_percent, closed_count }
    }
```

Todo sale de `v_opportunity_board` y `v_seller_month_progress`. La aplicación no recalcula nada.

### 7.6 Administración

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| `GET` | `/api/admin/users` | Supervisor | Lista de usuarios |
| `POST` | `/api/admin/users` | Supervisor | Crea usuario con contraseña |
| `PATCH` | `/api/admin/users/:id` | Supervisor | Edita nombre o email |
| `POST` | `/api/admin/users/:id/deactivate` | Supervisor | Desactiva |
| `POST` | `/api/admin/users/:id/activate` | Supervisor | Reactiva |
| `POST` | `/api/admin/users/:id/reset-password` | Supervisor | Contraseña nueva, `must_change_password = true` |
| `PUT` | `/api/admin/quotas` | Supervisor | Fija la cuota de un vendedor para un mes |

```
POST /api/admin/users
  → { username, full_name, email, role, password, quota_amount? }
  ← 201 { id, username, full_name, role,
          password_shown_once: "...",
          message: "Entrega esta contraseña al usuario. No volverá a mostrarse." }
  ← 409 { error: "username_taken" | "email_taken" }
```

### 7.7 Automatización

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| `POST` | `/api/automation/morning-digest/trigger` | **Supervisor, con sesión** | Dispara el resumen a mano |
| `GET` | `/api/automation/runs` | Supervisor | Últimas ejecuciones |
| `GET` | `/api/n8n/digest-payload` | **n8n, con firma HMAC** | Devuelve los datos del resumen |
| `POST` | `/api/n8n/digest-result` | **n8n, con firma HMAC** | Informa del resultado del envío |

Detalle en la sección 8.

---

## 8. Protección del disparo manual de n8n

El botón «Enviar resumen ahora» de la PWA es el punto más expuesto del sistema: un botón
que provoca correos a diez personas. Se protege en **cinco capas**, todas obligatorias.

### Capa 1 — El rol se lee de `profiles`

`/api/automation/morning-digest/trigger` exige sesión válida y, antes de nada:

```ts
const { data: { user } } = await supabaseServer.auth.getUser();
if (!user) return json(401, { error: 'unauthorized' });

// El rol se lee de la tabla. NUNCA del JWT.
const { data: profile } = await supabaseServer
  .from('profiles')
  .select('id, role, is_active')
  .eq('id', user.id)
  .single();

if (!profile || profile.role !== 'supervisor' || !profile.is_active) {
  return json(403, { error: 'forbidden' });
}
```

Un vendedor que descubra la ruta y la llame recibe `403`. Un JWT manipulado con
`role: supervisor` no sirve de nada: nadie lo lee.

### Capa 2 — Límite de un disparo cada 10 minutos

Antes de llamar a n8n, se consulta `automation_runs` con la clave de servicio:

```sql
select id, started_at, status
from public.automation_runs
where flow = 'morning_digest'
  and started_at > now() - interval '10 minutes'
order by started_at desc
limit 1;
```

Si hay una fila, se devuelve `429` con el minuto en que podrá reintentarse. Esto absorbe el
doble clic, el reintento nervioso y el envío duplicado por dos supervisores a la vez.

Si no la hay, se inserta la fila **antes** de llamar a n8n (`status='running'`,
`trigger_type='manual'`, `triggered_by=profile.id`) y se conserva su `id`. Esa fila es el
cerrojo: existe desde el primer instante, así que una segunda petición simultánea la
encuentra y se detiene.

### Capa 3 — Firma HMAC con marca de tiempo

La llamada de la aplicación a n8n, y la de n8n de vuelta a la aplicación, van firmadas con
`N8N_SHARED_SECRET`, un secreto que **solo existe en el servidor** y que nunca lleva el
prefijo `NEXT_PUBLIC_`.

**Cabeceras de toda petición firmada:**

| Cabecera | Contenido |
|---|---|
| `x-crm123-timestamp` | Segundos Unix del momento de la petición |
| `x-crm123-nonce` | UUID v4 único de esta petición |
| `x-crm123-signature` | `sha256=` + HMAC en hexadecimal |

**Cadena que se firma:** `${timestamp}.${nonce}.${cuerpoJSONExacto}`

```ts
import crypto from 'node:crypto';

function sign(timestamp: string, nonce: string, rawBody: string) {
  const payload = `${timestamp}.${nonce}.${rawBody}`;
  const hmac = crypto
    .createHmac('sha256', process.env.N8N_SHARED_SECRET!)
    .update(payload, 'utf8')
    .digest('hex');
  return `sha256=${hmac}`;
}
```

**Verificación en `/api/n8n/*`:**

```ts
function verify(req: Request, rawBody: string): boolean {
  const ts    = req.headers.get('x-crm123-timestamp');
  const nonce = req.headers.get('x-crm123-nonce');
  const given = req.headers.get('x-crm123-signature');
  if (!ts || !nonce || !given) return false;

  // Ventana de 5 minutos: una petición capturada caduca enseguida.
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = sign(ts, nonce, rawBody);

  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // Longitudes distintas: timingSafeEqual lanzaría. Se comprueba antes,
  // pero se compara igualmente para no filtrar la diferencia por el tiempo.
  if (a.length !== b.length) {
    crypto.timingSafeEqual(b, b);
    return false;
  }
  // OBLIGATORIO timingSafeEqual. Jamás ===.
  return crypto.timingSafeEqual(a, b);
}
```

**Reglas grabadas en piedra:**
- `crypto.timingSafeEqual`, **nunca** `===`. Comparar cadenas con `===` se detiene en el primer carácter distinto, y esa diferencia de microsegundos permite adivinar la firma byte a byte.
- El cuerpo se lee **crudo** con `await req.text()` y se firma esa cadena exacta. Si se hace `JSON.parse` y luego `JSON.stringify`, el orden de las claves o el espaciado cambian y la firma no cuadra.
- La ventana de 5 minutos convierte una petición capturada en basura pasados esos minutos.
- El `nonce` se guarda en memoria durante 10 minutos y se rechaza si se repite, para que ni siquiera dentro de la ventana pueda reenviarse la misma petición dos veces.

### Capa 4 — n8n no toca Postgres

n8n **no tiene credenciales de Supabase**. No las tiene configuradas, no las recibe y no
podría usarlas. Obtiene los datos con `GET /api/n8n/digest-payload` y devuelve el resultado
con `POST /api/n8n/digest-result`. Ambos exigen la firma de la capa 3.

Si un día alguien intenta añadir un nodo de Postgres al flujo, ese nodo no tendrá a dónde
conectarse. Es una separación de diseño, no una recomendación.

### Capa 5 — Auditoría y bitácora

Todo disparo manual deja rastro doble: la fila de `automation_runs` y una entrada en
`audit_log` con `automation.manual_trigger` y `{run_id, flow}` en `metadata`.

### Recorrido completo del disparo manual

```
 1. El supervisor pulsa «Enviar resumen ahora» en la PWA.
 2. POST /api/automation/morning-digest/trigger  (con cookie de sesión)
 3. ¿Sesión válida?               no → 401
 4. ¿profiles.role = supervisor?  no → 403      ← se lee de la TABLA
 5. ¿profiles.is_active = true?   no → 403
 6. ¿Hay una ejecución en los últimos 10 min?  sí → 429
 7. insert automation_runs (running, manual, triggered_by)  → run_id
 8. insert audit_log (automation.manual_trigger, {run_id})
 9. El servidor firma y llama a N8N_WEBHOOK_MORNING_DIGEST_URL
      cuerpo: { run_id, flow: "morning_digest", trigger: "manual" }
      cabeceras: timestamp + nonce + signature
10. La aplicación responde 202 { run_id, status: "running" }
      La PWA muestra «Enviando…» y sondea /api/automation/runs cada 5 s.
11. n8n → GET /api/n8n/digest-payload?run_id=...   (firmado)
      La aplicación verifica la firma, lee los datos con la clave de servicio
      y devuelve un vendedor por elemento.
12. n8n envía los correos por Resend.
13. n8n → POST /api/n8n/digest-result             (firmado)
      { run_id, status: "success" | "failed", emails_sent, error_message? }
14. La aplicación verifica la firma y cierra la fila de automation_runs
      con status, emails_sent y finished_at.
15. La PWA deja de sondear y muestra el resultado.
```

### Contratos de los endpoints de n8n

```
GET /api/n8n/digest-payload?run_id=<uuid>
  Cabeceras: x-crm123-timestamp, x-crm123-nonce, x-crm123-signature
  Cuerpo firmado: cadena vacía
  ← 200 {
      run_id, generated_at, timezone: "Europe/Madrid",
      recipients: [{
        profile_id, full_name, email,
        month: { quota_amount, closed_amount, remaining_amount,
                 quota_percent, closed_count },
        needs_attention: [{ customer_name, customer_company, stage,
                            estimated_amount, days_without_activity,
                            is_overdue }],
        due_today:       [{ customer_name, stage, estimated_amount,
                            next_action_at }]
      }]
    }
  ← 401 { error: "invalid_signature" }
  ← 404 { error: "run_not_found" }
```

Solo se incluyen vendedores con `is_active = true` y email válido. Un vendedor sin nada que
reportar recibe igualmente su correo, con el avance de cuota: la ausencia de atrasos es una
buena noticia que conviene comunicar.

```
POST /api/n8n/digest-result
  Cabeceras: las tres de firma
  → { run_id, status: "success" | "failed", emails_sent, error_message? }
  ← 200 { ok: true }
  ← 401 { error: "invalid_signature" }
  ← 409 { error: "run_already_closed" }
```

**Ambos endpoints se declaran `export const runtime = 'nodejs'`.** El módulo `crypto` de
Node no está disponible en el entorno de ejecución de borde.

---

## 9. Flujo de automatización

**Un solo flujo: el resumen matutino.**

| Dato | Valor |
|---|---|
| Nombre en n8n | `CRM-123 · Resumen matutino` |
| Programación | 07:30, lunes a viernes, `Europe/Madrid` |
| Disparo manual | Webhook desde la PWA del supervisor |
| Destinatarios | Cada vendedor activo, a su email |
| Envío | Resend |

### Nodos

```
[Cron 07:30 L-V Madrid] ──┐
                          ├──> [Preparar contexto]
[Webhook manual]      ────┘         │
                                    ▼
                          [Firmar y pedir datos]
                          GET /api/n8n/digest-payload
                                    │
                                    ▼
                          [Separar destinatarios]
                                    │
                                    ▼
                          [Componer correo]
                                    │
                                    ▼
                          [Resend · enviar]
                                    │
                                    ▼
                          [Contar y firmar resultado]
                          POST /api/n8n/digest-result
```

El nodo del cron genera su propio `run_id` (UUID) y lo declara con `trigger: "scheduled"`;
en ese caso el endpoint `digest-payload` crea la fila de `automation_runs` si no existe. El
webhook manual recibe el `run_id` que ya creó la aplicación.

### Contenido del correo

**Asunto:** `CRM-123 · Tu resumen del {fecha}`

Cuerpo en texto y listas, sin gráficos:

1. Saludo con el nombre.
2. **Atrasadas** — cliente, etapa, importe, días sin actividad. Si no hay: *«Nada atrasado. Buen trabajo.»*
3. **Para hoy** — cliente, etapa, hora de la acción. Si no hay: *«No tienes acciones agendadas para hoy.»*
4. **Tu mes** — cerrado / meta / porcentaje / cuánto falta.
5. Enlace al CRM.

Sin datos de otros vendedores. Sin el teléfono completo del cliente.

### Credenciales en n8n

| Credencial | Uso |
|---|---|
| `RESEND_API_KEY` | Envío de correo. **Vive solo en n8n**, no en la aplicación |
| `N8N_SHARED_SECRET` | Firmar y verificar. Mismo valor que en Vercel |
| `APP_BASE_URL` | Base de las llamadas a `/api/n8n/*` |

**n8n no tiene ninguna credencial de Supabase.**

---

## 10. Variables de entorno

### Aplicación (Vercel, ambos proyectos)

| Variable | Ámbito | Dónde se obtiene | Notas |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente | Supabase → Settings → API → Project URL | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente | Supabase → Settings → API → `anon public` | Pública. Segura porque RLS filtra |
| `SUPABASE_SERVICE_ROLE_KEY` | **Servidor** | Supabase → Settings → API → `service_role` | **Esquiva RLS. Jamás en el cliente** |
| `N8N_SHARED_SECRET` | **Servidor** | Se genera (ver abajo) | Mismo valor en Vercel y en n8n |
| `N8N_WEBHOOK_MORNING_DIGEST_URL` | **Servidor** | n8n → nodo Webhook → Production URL | |
| `APP_BASE_URL` | Servidor | URL del despliegue en Vercel | Sin barra final |
| `APP_TIMEZONE` | Servidor | Fijo | `Europe/Madrid` |
| `APP_LOCALE` | Servidor | Fijo | `es-ES` |
| `APP_CURRENCY` | Servidor | Fijo | `EUR` |

### n8n

| Variable | Dónde se obtiene |
|---|---|
| `RESEND_API_KEY` | Resend → API Keys |
| `RESEND_FROM` | Remitente del dominio verificado en Resend |
| `N8N_SHARED_SECRET` | **El mismo valor que en Vercel** |
| `APP_BASE_URL` | URL del despliegue en Vercel |

### Generación del secreto compartido

```bash
openssl rand -hex 32
```

Produce 64 caracteres hexadecimales. **Ese valor se pega en dos sitios y solo en dos:**
Vercel (`N8N_SHARED_SECRET`, en los dos proyectos) y n8n (`N8N_SHARED_SECRET`). No se
guarda en el repositorio, no se envía por correo y no se apunta en un documento compartido.

Si se rota, hay que actualizarlo en ambos sitios a la vez: mientras no coincidan, el resumen matutino falla con `401 invalid_signature`, que es exactamente lo que debe pasar.

### Comprobación al arrancar

`lib/env.ts` valida con Zod todas las variables al iniciar el proceso. Si falta una, la
aplicación **no arranca** y el mensaje dice cuál falta y dónde obtenerla. Fallar al arrancar
es mucho mejor que fallar a las 07:30 de un martes.

```ts
import 'server-only';
import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL:        z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY:   z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY:       z.string().min(20),
  N8N_SHARED_SECRET:               z.string().length(64),
  N8N_WEBHOOK_MORNING_DIGEST_URL:  z.string().url(),
  APP_BASE_URL:                    z.string().url(),
  APP_TIMEZONE:                    z.literal('Europe/Madrid'),
  APP_LOCALE:                      z.literal('es-ES'),
  APP_CURRENCY:                    z.literal('EUR'),
});

export const env = schema.parse(process.env);
```

---

## 11. Estructura del repositorio

Rama única: **`gh-crm-123`**.

```
gh-crm-123/
├── CLAUDE.md
├── DESIGN_BRIEF.md
├── TECHNICAL_SPEC.md
├── SCRIPTS-SQL.md
├── BUILD_PLAN.md
├── README.md
│
├── web/                          ← escritorio, vendedores
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (auth)/cambiar-contrasena/
│   │   ├── (app)/tablero/
│   │   ├── (app)/oportunidades/
│   │   ├── (app)/clientes/[id]/
│   │   ├── (admin)/admin/usuarios/
│   │   ├── (admin)/admin/cuotas/
│   │   ├── (admin)/admin/auditoria/
│   │   └── api/
│   │       ├── auth/
│   │       ├── customers/
│   │       ├── opportunities/
│   │       ├── board/
│   │       ├── admin/
│   │       └── n8n/
│   ├── components/
│   ├── lib/
│   │   ├── supabase/{client,server,admin}.ts
│   │   ├── hmac.ts
│   │   ├── phone.ts
│   │   ├── format.ts
│   │   ├── audit.ts
│   │   └── env.ts
│   ├── middleware.ts
│   └── types/database.ts         ← generado con supabase gen types
│
├── pwa/                          ← móvil, supervisor
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (app)/panel/
│   │   ├── (app)/equipo/
│   │   └── api/automation/
│   ├── public/{manifest.json,icons/}
│   └── ...
│
└── n8n/
    └── morning-digest.json       ← flujo listo para importar
```

`types/database.ts` se genera con `supabase gen types typescript` a partir de la base real.
**No se escribe a mano.** Es la garantía de que el código no puede referirse a una columna
que no existe.

---

## 12. Manejo de errores

| Código | Cuándo | Qué ve la persona |
|---|---|---|
| 400 | Cuerpo mal formado | «No hemos podido procesar la petición.» |
| 401 | Sin sesión o firma inválida | Redirección a `/login` |
| 403 | Rol insuficiente | «No tienes permiso para esta acción.» |
| 404 | No existe, o RLS lo oculta | «No hemos encontrado lo que buscas.» |
| 409 | Conflicto de reglas de negocio | El mensaje concreto de la sección 7 |
| 422 | Validación | El error junto al campo |
| 429 | Límite de disparos o de intentos | «Espera unos minutos antes de reintentar.» |
| 500 | Fallo inesperado | «Algo ha fallado. Vuelve a intentarlo.» |

**Nunca se muestra al usuario el mensaje crudo de Postgres.** Un error de RLS o de índice
único se traduce a un mensaje comprensible. El detalle va al registro del servidor.

Los registros del servidor **jamás** contienen la clave de servicio, el secreto compartido,
contraseñas ni teléfonos completos.

---

## 13. Rendimiento

Con 12 usuarios y unos pocos miles de filas, el rendimiento no es un problema. Aun así:

- El tablero del día se sirve desde Server Components, sin cascada de peticiones.
- La tabla densa pagina de 50 en 50 en el servidor.
- La búsqueda usa el índice de texto completo en español de `customers`.
- No se cachea nada que dependa del usuario: RLS y caché son mala combinación. Todas las rutas con datos llevan `export const dynamic = 'force-dynamic'`.
- La PWA sondea el estado de la ejecución cada 5 segundos, con un máximo de 24 intentos (2 minutos). Sin websockets ni suscripciones en tiempo real.

---

## 14. Qué está prohibido

Sin excepciones, sin comodidad, sin prisa.

1. Modificar la estructura de `SCRIPTS-SQL.md`.
2. Cualquier `delete` sobre cualquier tabla, desde cualquier capa.
3. Importar `lib/supabase/admin.ts` desde un componente cliente, aunque no se use.
4. Leer el rol de un JWT, de `user_metadata` o de `app_metadata`.
5. Comparar secretos con `===`, `==` o `localeCompare`.
6. Que n8n abra una conexión a Postgres.
7. Prefijar con `NEXT_PUBLIC_` cualquier variable de servidor.
8. Pedir, guardar o mostrar DPI, NIT, DNI, NIE, CIF o pasaporte.
9. Usar la palabra «eliminar», «borrar» o «suprimir» en la interfaz.
10. Recalcular el atraso en TypeScript en lugar de leerlo de la vista.
11. Mostrarle a un vendedor cualquier dato de otro vendedor.
12. Revelar en un error de inicio de sesión si el usuario existe.
13. Crear una vista sin `security_invoker = true`.
14. Crear una función `security definer` sin `set search_path = public`.
15. Devolver datos del cliente duplicado al vendedor que intentó registrarlo.
