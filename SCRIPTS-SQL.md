# SCRIPTS-SQL.md — CRM-123

**Estructura oficial de la base de datos. Documento normativo. Versión 1.2.**

Base de datos: `dbcrm123` (Supabase / PostgreSQL)
Zona horaria de negocio: `Europe/Madrid`
Moneda: EUR, importes **sin IVA** (base imponible)

> **Regla de oro:** este archivo es la única fuente de verdad de la estructura de datos.
> `DESIGN_BRIEF.md`, `TECHNICAL_SPEC.md` y `CLAUDE.md` la consumen. **Nadie la modifica.**
> Si algo falta, se detiene el trabajo y se pide una decisión al humano. No se inventan
> tablas, columnas ni valores de enumeración.

---

## 1. Índice

1. Índice
2. Reglas de seguridad innegociables
3. Convenciones
4. Modelo de datos (resumen)
4-bis. **Script 00 — Reinicio limpio (destructivo)**
5. Script 01 — Extensiones y tipos
6. Script 02 — Tablas
7. Script 03 — Índices y restricciones
8. Script 04 — Funciones auxiliares
9. Script 05 — Disparadores (triggers)
10. Script 06 — Vistas
11. Script 07 — Activación de RLS
12. Script 08 — Políticas RLS
13. Script 09 — Permisos (grants)
14. Script 10 — Datos de configuración inicial
15. Script 11 — Datos de ejemplo (desechable)
16. Script 12 — Borrado de datos de ejemplo
17. Batería de comprobaciones
18. Orden de ejecución
19. **Apéndice A — Cómo simular una sesión para las comprobaciones C16 a C21**
20. **Apéndice B — Registro de correcciones**

---

## 2. Reglas de seguridad innegociables

Estas reglas se verifican en la batería de comprobaciones de la sección 17. Si una falla, la base de datos no se da por buena.

- **RLS activa en todas las tablas**, incluidas `settings` y `audit_log`. Sin excepción.
- **Ninguna política de `DELETE`** en ninguna tabla. No hay borrado físico, solo archivado lógico.
- **`activities` y `audit_log` son solo de inserción.** Sin políticas de `UPDATE` ni `DELETE` para nadie, incluido el supervisor.
- **Toda política de `UPDATE` lleva `with check`**, no solo `using`.
- **Ninguna política con condición `true`**, salvo el `select` de `settings`.
- **Todas las vistas con `security_invoker = true`.**
- **Toda función `security definer` fija `search_path = public`.**
- **El rol se lee de `profiles`**, nunca de un JWT ni de nada que venga del cliente.
- **n8n nunca toca Postgres.** Todo pasa por los endpoints `/api/n8n/*` de la aplicación.

---

## 3. Convenciones

| Aspecto | Convención |
|---|---|
| Esquema | `public` |
| Nombres | `snake_case`, tablas en plural inglés |
| Claves primarias | `id uuid` con `gen_random_uuid()` |
| Marcas de tiempo | `timestamptz`, siempre UTC en almacenamiento |
| Importes | `numeric(12,2)`, EUR, sin IVA |
| Teléfono | `text`, normalizado a E.164 español (`+34XXXXXXXXX`) |
| Archivado | Columna `is_archived boolean` + `archived_at` + `archived_by` |
| Idioma de datos | Valores de enumeración en inglés; las etiquetas visibles se traducen en la interfaz |

---

## 4. Modelo de datos (resumen)

```
auth.users (Supabase)
    │ 1:1
    ▼
profiles ──1:N──> quotas            (cuota mensual por vendedor)
    │
    │ 1:N (owner_id)
    ▼
customers ──1:N──> opportunities    (solo UNA abierta a la vez por cliente)
                        │
                        │ 1:N
                        ▼
                   activities       (solo inserción)

audit_log        (solo inserción, independiente)
settings         (clave/valor global)
automation_runs  (bitácora de disparos de n8n)
```

**Reglas de negocio grabadas en la base:**

1. Un cliente pertenece a **un** vendedor (`owner_id`).
2. El teléfono es **único en todo el sistema**, incluso entre carteras distintas.
3. Un cliente puede tener **una sola oportunidad abierta**; las cerradas se conservan como historial.
4. Al cerrar como perdida, el **motivo es obligatorio**.
5. Al cerrar como ganada, el **importe final es obligatorio** y se congela con la fecha de cierre.
6. `activities` y `audit_log` no se modifican ni se borran jamás.

---

## 4-bis. Script 00 — Reinicio limpio · **PASO 0 OBLIGATORIO**

**Se ejecuta siempre, y siempre el primero.** Es lo que garantiza que cada pasada del Hito 1
parta de un estado idéntico, se haya ejecutado antes algo o no. Sobre una base virgen no hace
nada y no da error; sobre una base a medio construir la deja vacía.

> **AVISO — a partir del Hito 2, este script NO se vuelve a ejecutar jamás.**
> Destruye todos los datos del CRM. Su sitio es el Hito 1 y solo el Hito 1. Cuando existan
> clientes reales, ejecutarlo los borra todos sin posibilidad de recuperación.

**Qué borra y qué conserva:**

| Borra | Conserva |
|---|---|
| Vistas, tablas, disparadores, índices y políticas de CRM-123 | El proyecto de Supabase y su Project URL |
| Las funciones y los tipos de CRM-123 | Las tres claves de API |
| Los usuarios de ejemplo (`demo.%@crm123.local`) | La extensión `pgcrypto` |

No hace falta borrar el proyecto de Supabase ni crear uno nuevo. Si lo hicieras, cambiarían
la URL y las claves y tendrías que volver a recogerlas.

El orden no es decorativo: `profiles` referencia `auth.users` con `on delete restrict`, así
que los usuarios solo pueden borrarse **después** de eliminar las tablas.

```sql
-- =====================================================================
-- CRM-123 · Script 00 · Reinicio limpio · DESTRUCTIVO
-- Seguro sobre una base virgen: todo va con "if exists".
-- =====================================================================

-- 1. Vistas
drop view if exists public.v_team_month_progress   cascade;
drop view if exists public.v_loss_reasons_month    cascade;
drop view if exists public.v_seller_month_progress cascade;
drop view if exists public.v_opportunity_board     cascade;

-- 2. Tablas (cascade arrastra disparadores, índices y políticas)
drop table if exists public.activities      cascade;
drop table if exists public.audit_log       cascade;
drop table if exists public.automation_runs cascade;
drop table if exists public.opportunities   cascade;
drop table if exists public.customers       cascade;
drop table if exists public.quotas          cascade;
drop table if exists public.settings        cascade;
drop table if exists public.profiles        cascade;

-- 3. Usuarios de ejemplo. Solo ahora es posible: profiles ya no existe.
--    Se borran EXCLUSIVAMENTE los del dominio de pruebas.
delete from auth.users where email like 'demo.%@crm123.local';

-- 4. Funciones.
--    Se recorren por nombre en lugar de listar sus firmas.
--    MOTIVO: "drop function if exists public.stale_threshold_days(
--    public.opportunity_stage)" FALLA sobre una base virgen, porque para
--    interpretar la firma Postgres necesita que el tipo exista, y el tipo
--    aún no se ha creado. El "if exists" no protege de eso. Este bucle
--    recorre cero filas sobre una base limpia y no da error.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as firma
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in (
        'sync_opportunity_on_activity',
        'guard_opportunity_owner',
        'cascade_customer_reassignment',
        'block_archived_customer_write',
        'touch_updated_at',
        'owns_customer',
        'is_active_user',
        'is_supervisor',
        'app_current_role',
        'stale_threshold_days',
        'period_year_madrid',
        'period_month_madrid'
      )
  loop
    execute format('drop function if exists %s cascade', r.firma);
  end loop;
end $$;

-- 5. Tipos. Ahora sí es seguro: ninguna función los referencia ya.
drop type if exists public.automation_trigger  cascade;
drop type if exists public.automation_status   cascade;
drop type if exists public.activity_type       cascade;
drop type if exists public.loss_reason         cascade;
drop type if exists public.opportunity_status  cascade;
drop type if exists public.opportunity_stage   cascade;
drop type if exists public.customer_source     cascade;
drop type if exists public.user_role           cascade;
```

**Comprobación del reinicio — C0.** Las cuatro consultas deben devolver 0 filas:

```sql
-- C0.1 · sin tablas de CRM-123
select tablename from pg_tables
 where schemaname = 'public'
   and tablename in ('profiles','quotas','customers','opportunities',
                     'activities','audit_log','settings','automation_runs');

-- C0.2 · sin tipos enumerados
select typname from pg_type
 where typnamespace = 'public'::regnamespace and typtype = 'e';

-- C0.3 · sin funciones
select proname from pg_proc
 where pronamespace = 'public'::regnamespace
   and proname in ('is_supervisor','app_current_role','owns_customer',
                   'stale_threshold_days','touch_updated_at');

-- C0.4 · sin usuarios de ejemplo
select email from auth.users
 where email like 'demo.%@crm123.local';
```

> **Si C0.4 devuelve filas**, es que hay cuentas de prueba creadas con otro correo. El Script
> 00 solo borra las del patrón `demo.%@crm123.local`. Cualquier otra queda huérfana en
> `auth.users` al desaparecer `profiles`. Bórrala a mano antes de continuar.

---

## 5. Script 01 — Extensiones y tipos

```sql
-- =====================================================================
-- CRM-123 · Script 01 · Extensiones y tipos enumerados
-- =====================================================================

create extension if not exists pgcrypto;

-- Rol del usuario dentro del CRM
do $$ begin
  create type public.user_role as enum ('seller', 'supervisor');
exception when duplicate_object then null; end $$;

-- Canal por el que llegó el cliente
do $$ begin
  create type public.customer_source as enum (
    'physical_store',
    'whatsapp',
    'instagram',
    'trade_show',
    'referral',
    'inbound_call',
    'other'
  );
exception when duplicate_object then null; end $$;

-- Etapas del embudo
do $$ begin
  create type public.opportunity_stage as enum (
    'new',
    'contacted',
    'proposal_sent',
    'negotiation',
    'closed'
  );
exception when duplicate_object then null; end $$;

-- Estado de la oportunidad
do $$ begin
  create type public.opportunity_status as enum ('open', 'won', 'lost');
exception when duplicate_object then null; end $$;

-- Motivo de pérdida (obligatorio al perder)
do $$ begin
  create type public.loss_reason as enum (
    'price',
    'no_response',
    'bought_from_competitor',
    'no_budget',
    'bad_timing',
    'cancellation',
    'other'
  );
exception when duplicate_object then null; end $$;

-- Tipo de actividad registrada
do $$ begin
  create type public.activity_type as enum (
    'call',
    'whatsapp',
    'email',
    'visit',
    'note'
  );
exception when duplicate_object then null; end $$;

-- Estado de una ejecución de automatización
do $$ begin
  create type public.automation_status as enum ('running', 'success', 'failed');
exception when duplicate_object then null; end $$;

-- Forma de disparo de la automatización
do $$ begin
  create type public.automation_trigger as enum ('scheduled', 'manual');
exception when duplicate_object then null; end $$;
```

**Traducción de valores para la interfaz** (referencia para `DESIGN_BRIEF.md`):

| Enumeración | Valor | Etiqueta en pantalla |
|---|---|---|
| `user_role` | `seller` / `supervisor` | Vendedor / Supervisor |
| `customer_source` | `physical_store` | Tienda física |
| | `whatsapp` | WhatsApp |
| | `instagram` | Instagram |
| | `trade_show` | Feria / showroom |
| | `referral` | Referido |
| | `inbound_call` | Llamada entrante |
| | `other` | Otro |
| `opportunity_stage` | `new` | Nuevo |
| | `contacted` | Contactado |
| | `proposal_sent` | Propuesta enviada |
| | `negotiation` | Negociación |
| | `closed` | Cerrado |
| `opportunity_status` | `open` / `won` / `lost` | Abierta / Ganada / Perdida |
| `loss_reason` | `price` | Precio |
| | `no_response` | No responde |
| | `bought_from_competitor` | Compró a la competencia |
| | `no_budget` | Sin presupuesto |
| | `bad_timing` | No era el momento |
| | `cancellation` | Cancelación |
| | `other` | Otro |
| `activity_type` | `call` | Llamada |
| | `whatsapp` | WhatsApp |
| | `email` | Email |
| | `visit` | Visita |
| | `note` | Nota |

---

## 6. Script 02 — Tablas

```sql
-- =====================================================================
-- CRM-123 · Script 02 · Tablas
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles: espejo de auth.users con los datos de negocio del usuario
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete restrict,
  username              text not null,
  full_name             text not null,
  email                 text not null,
  role                  public.user_role not null default 'seller',
  is_active             boolean not null default true,
  must_change_password  boolean not null default true,
  deactivated_at        timestamptz,
  deactivated_by        uuid references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint profiles_username_format
    check (username ~ '^[a-z0-9._-]{3,32}$'),
  constraint profiles_email_format
    check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint profiles_full_name_len
    check (char_length(trim(full_name)) between 2 and 120),
  constraint profiles_deactivation_coherent
    check (
      (is_active = true  and deactivated_at is null)
      or
      (is_active = false and deactivated_at is not null)
    )
);

comment on table  public.profiles is 'Usuarios del CRM. El alta la hace el supervisor; no hay autoregistro.';
comment on column public.profiles.username is 'Identificador de acceso. El vendedor entra con esto, nunca ve el email.';
comment on column public.profiles.email is 'Solo para recibir el resumen matutino. No se muestra al vendedor.';
comment on column public.profiles.must_change_password is 'true hasta que el usuario cambia la contraseña en su primer ingreso.';


-- ---------------------------------------------------------------------
-- quotas: cuota mensual en euros por vendedor
-- ---------------------------------------------------------------------
create table if not exists public.quotas (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete restrict,
  period_year   smallint not null,
  period_month  smallint not null,
  amount_eur    numeric(12,2) not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint quotas_year_range  check (period_year between 2024 and 2100),
  constraint quotas_month_range check (period_month between 1 and 12),
  constraint quotas_amount_positive check (amount_eur >= 0)
);

comment on table public.quotas is 'Meta mensual en euros (sin IVA) fijada por el supervisor para cada vendedor.';


-- ---------------------------------------------------------------------
-- customers: ficha permanente del cliente
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id           uuid primary key default gen_random_uuid(),
  phone        text not null,
  full_name    text not null,
  company      text,
  source       public.customer_source,
  owner_id     uuid not null references public.profiles(id) on delete restrict,
  is_archived  boolean not null default false,
  archived_at  timestamptz,
  archived_by  uuid references public.profiles(id),
  created_by   uuid not null references public.profiles(id) on delete restrict,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint customers_phone_e164_es
    check (phone ~ '^\+34[6-9]\d{8}$'),
  constraint customers_full_name_len
    check (char_length(trim(full_name)) between 2 and 120),
  constraint customers_company_len
    check (company is null or char_length(trim(company)) between 2 and 120),
  constraint customers_archive_coherent
    check (
      (is_archived = false and archived_at is null)
      or
      (is_archived = true  and archived_at is not null)
    )
);

comment on table  public.customers is 'Cliente. El teléfono es el identificador único. Prohibido almacenar DPI, NIT, DNI o pasaporte.';
comment on column public.customers.phone is 'E.164 España. Único en todo el sistema, incluso entre carteras distintas.';
comment on column public.customers.owner_id is 'Vendedor propietario. Solo el supervisor puede reasignarlo.';


-- ---------------------------------------------------------------------
-- opportunities: negociación. Solo UNA abierta por cliente.
-- ---------------------------------------------------------------------
create table if not exists public.opportunities (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references public.customers(id) on delete restrict,
  owner_id          uuid not null references public.profiles(id) on delete restrict,
  stage             public.opportunity_stage not null default 'new',
  status            public.opportunity_status not null default 'open',
  estimated_amount  numeric(12,2) not null,
  final_amount      numeric(12,2),
  loss_reason       public.loss_reason,
  loss_note         text,
  next_action_at    timestamptz,
  last_activity_at  timestamptz not null default now(),
  closed_at         timestamptz,
  created_by        uuid not null references public.profiles(id) on delete restrict,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint opportunities_estimated_positive
    check (estimated_amount >= 0),
  constraint opportunities_final_positive
    check (final_amount is null or final_amount >= 0),
  constraint opportunities_loss_note_len
    check (loss_note is null or char_length(loss_note) <= 500),

  -- Una oportunidad abierta está en una etapa abierta y sin datos de cierre
  constraint opportunities_open_coherent check (
    status <> 'open' or (
      stage <> 'closed'
      and closed_at   is null
      and final_amount is null
      and loss_reason  is null
    )
  ),

  -- Una oportunidad ganada exige importe final y fecha de cierre, sin motivo de pérdida
  constraint opportunities_won_coherent check (
    status <> 'won' or (
      stage = 'closed'
      and closed_at    is not null
      and final_amount is not null
      and loss_reason  is null
    )
  ),

  -- Una oportunidad perdida exige motivo y fecha de cierre, sin importe final
  constraint opportunities_lost_coherent check (
    status <> 'lost' or (
      stage = 'closed'
      and closed_at   is not null
      and loss_reason is not null
      and final_amount is null
    )
  )
);

comment on table  public.opportunities is 'Negociación con un cliente. Solo una puede estar abierta por cliente a la vez.';
comment on column public.opportunities.final_amount is 'Importe real cerrado, sin IVA. Es el que cuenta para la cuota.';
comment on column public.opportunities.last_activity_at is 'Lo mantiene un trigger al insertar en activities. Base del cálculo de atraso.';


-- ---------------------------------------------------------------------
-- activities: historial. SOLO INSERCIÓN.
-- ---------------------------------------------------------------------
create table if not exists public.activities (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid not null references public.opportunities(id) on delete restrict,
  customer_id     uuid not null references public.customers(id) on delete restrict,
  author_id       uuid not null references public.profiles(id) on delete restrict,
  type            public.activity_type not null,
  note            text not null,
  next_action_at  timestamptz,
  created_at      timestamptz not null default now(),

  constraint activities_note_len check (char_length(trim(note)) between 1 and 1000)
);

comment on table public.activities is 'Registro inmutable de contactos. Sin políticas de UPDATE ni DELETE para nadie.';


-- ---------------------------------------------------------------------
-- audit_log: auditoría. SOLO INSERCIÓN.
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles(id) on delete restrict,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),

  constraint audit_log_action_allowed check (action in (
    'customer.created',
    'customer.updated',
    'customer.archived',
    'customer.reassigned',
    'opportunity.created',
    'opportunity.stage_changed',
    'opportunity.won',
    'opportunity.lost',
    'user.created',
    'user.deactivated',
    'user.reactivated',
    'user.password_changed',
    'quota.changed',
    'automation.manual_trigger'
  )),
  constraint audit_log_entity_type_allowed check (entity_type in (
    'customer', 'opportunity', 'profile', 'quota', 'automation'
  ))
);

comment on table public.audit_log is 'Auditoría inmutable. Solo lectura para el supervisor. Sin UPDATE ni DELETE.';


-- ---------------------------------------------------------------------
-- settings: configuración global clave/valor
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id)
);

comment on table public.settings is 'Configuración global. Única tabla con un select de condición true.';


-- ---------------------------------------------------------------------
-- automation_runs: bitácora de disparos de n8n
-- ---------------------------------------------------------------------
create table if not exists public.automation_runs (
  id            uuid primary key default gen_random_uuid(),
  flow          text not null,
  trigger_type  public.automation_trigger not null,
  triggered_by  uuid references public.profiles(id) on delete restrict,
  status        public.automation_status not null default 'running',
  emails_sent   integer not null default 0,
  error_message text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,

  constraint automation_runs_flow_allowed check (flow in ('morning_digest')),
  constraint automation_runs_emails_positive check (emails_sent >= 0),
  constraint automation_runs_manual_has_actor
    check (trigger_type <> 'manual' or triggered_by is not null)
);

comment on table public.automation_runs is 'Una fila por ejecución del resumen matutino. Sostiene el límite de un disparo manual cada 10 minutos.';
```

---

## 7. Script 03 — Índices y restricciones

```sql
-- =====================================================================
-- CRM-123 · Script 03 · Índices y restricciones únicas
-- =====================================================================

-- profiles ------------------------------------------------------------
create unique index if not exists profiles_username_uk
  on public.profiles (lower(username));

create unique index if not exists profiles_email_uk
  on public.profiles (lower(email));

create index if not exists profiles_role_active_idx
  on public.profiles (role, is_active);

-- quotas --------------------------------------------------------------
create unique index if not exists quotas_profile_period_uk
  on public.quotas (profile_id, period_year, period_month);

-- customers -----------------------------------------------------------
-- El teléfono es único en TODO el sistema, no por vendedor.
create unique index if not exists customers_phone_uk
  on public.customers (phone);

create index if not exists customers_owner_active_idx
  on public.customers (owner_id) where is_archived = false;

create index if not exists customers_name_search_idx
  on public.customers using gin (to_tsvector('spanish', full_name || ' ' || coalesce(company, '')));

-- opportunities -------------------------------------------------------
-- REGLA CLAVE: solo UNA oportunidad abierta por cliente.
create unique index if not exists opportunities_one_open_per_customer_uk
  on public.opportunities (customer_id) where status = 'open';

create index if not exists opportunities_owner_open_idx
  on public.opportunities (owner_id, stage) where status = 'open';

create index if not exists opportunities_next_action_idx
  on public.opportunities (next_action_at) where status = 'open';

create index if not exists opportunities_last_activity_idx
  on public.opportunities (last_activity_at) where status = 'open';

create index if not exists opportunities_closed_month_idx
  on public.opportunities (owner_id, closed_at) where status = 'won';

create index if not exists opportunities_customer_idx
  on public.opportunities (customer_id);

-- activities ----------------------------------------------------------
create index if not exists activities_opportunity_idx
  on public.activities (opportunity_id, created_at desc);

create index if not exists activities_customer_idx
  on public.activities (customer_id, created_at desc);

create index if not exists activities_author_idx
  on public.activities (author_id, created_at desc);

-- audit_log -----------------------------------------------------------
create index if not exists audit_log_created_idx
  on public.audit_log (created_at desc);

create index if not exists audit_log_entity_idx
  on public.audit_log (entity_type, entity_id);

create index if not exists audit_log_actor_idx
  on public.audit_log (actor_id, created_at desc);

-- automation_runs -----------------------------------------------------
create index if not exists automation_runs_flow_started_idx
  on public.automation_runs (flow, started_at desc);
```

---

## 8. Script 04 — Funciones auxiliares

```sql
-- =====================================================================
-- CRM-123 · Script 04 · Funciones auxiliares
-- Toda función security definer fija search_path = public.
-- =====================================================================

-- ---------------------------------------------------------------------
-- app_current_role: lee el rol desde profiles. NUNCA desde el JWT.
-- ---------------------------------------------------------------------
create or replace function public.app_current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true;
$$;

comment on function public.app_current_role() is
  'Rol efectivo del usuario. Se lee de profiles, nunca de un JWT. Devuelve null si está desactivado.';


-- ---------------------------------------------------------------------
-- is_supervisor: atajo booleano usado por las políticas RLS
-- ---------------------------------------------------------------------
create or replace function public.is_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.app_current_role() = 'supervisor', false);
$$;


-- ---------------------------------------------------------------------
-- is_active_user: el usuario desactivado no ve ni escribe nada
-- ---------------------------------------------------------------------
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true
  );
$$;


-- ---------------------------------------------------------------------
-- owns_customer: el vendedor es propietario de este cliente
-- ---------------------------------------------------------------------
create or replace function public.owns_customer(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.customers c
    where c.id = p_customer_id and c.owner_id = auth.uid()
  );
$$;


-- ---------------------------------------------------------------------
-- stale_threshold_days: umbral de atraso según la etapa
--   Nuevo / Contactado ............ 3 días
--   Propuesta / Negociación ....... 2 días
-- ---------------------------------------------------------------------
create or replace function public.stale_threshold_days(p_stage public.opportunity_stage)
returns integer
language sql
immutable
as $$
  select case p_stage
    when 'new'           then 3
    when 'contacted'     then 3
    when 'proposal_sent' then 2
    when 'negotiation'   then 2
    else null
  end;
$$;


-- ---------------------------------------------------------------------
-- period_of: año y mes en Europe/Madrid de una marca de tiempo
-- ---------------------------------------------------------------------
create or replace function public.period_year_madrid(p_ts timestamptz)
returns smallint
language sql
immutable
as $$
  select extract(year from (p_ts at time zone 'Europe/Madrid'))::smallint;
$$;

create or replace function public.period_month_madrid(p_ts timestamptz)
returns smallint
language sql
immutable
as $$
  select extract(month from (p_ts at time zone 'Europe/Madrid'))::smallint;
$$;
```

---

## 9. Script 05 — Disparadores

```sql
-- =====================================================================
-- CRM-123 · Script 05 · Disparadores
-- =====================================================================

-- ---------------------------------------------------------------------
-- touch_updated_at: mantiene updated_at
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists quotas_touch on public.quotas;
create trigger quotas_touch before update on public.quotas
  for each row execute function public.touch_updated_at();

drop trigger if exists customers_touch on public.customers;
create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();

drop trigger if exists opportunities_touch on public.opportunities;
create trigger opportunities_touch before update on public.opportunities
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------
-- sync_opportunity_on_activity
-- Al registrar una actividad: refresca last_activity_at y, si la
-- actividad trae próxima acción, la copia a la oportunidad.
-- Además fuerza customer_id y author_id para que sean coherentes.
-- ---------------------------------------------------------------------
create or replace function public.sync_opportunity_on_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_status public.opportunity_status;
begin
  select o.customer_id, o.status
    into v_customer_id, v_status
  from public.opportunities o
  where o.id = new.opportunity_id;

  if v_customer_id is null then
    raise exception 'La oportunidad no existe';
  end if;

  if v_status <> 'open' then
    raise exception 'No se pueden registrar actividades en una oportunidad cerrada';
  end if;

  new.customer_id := v_customer_id;

  -- Con sesión iniciada, auth.uid() no es nulo y SIEMPRE gana: un vendedor
  -- no puede falsificar el autor de una actividad.
  -- auth.uid() solo es nulo desde service_role o postgres, que ya se saltan
  -- RLS por completo, así que respetar el valor pasado no abre ninguna puerta
  -- nueva. Esto permite la carga de datos de ejemplo sin sesión.
  new.author_id := coalesce(auth.uid(), new.author_id);

  if new.author_id is null then
    raise exception 'No se puede determinar el autor de la actividad';
  end if;

  update public.opportunities
     set last_activity_at = new.created_at,
         next_action_at   = coalesce(new.next_action_at, next_action_at)
   where id = new.opportunity_id;

  return new;
end;
$$;

drop trigger if exists activities_sync on public.activities;
create trigger activities_sync before insert on public.activities
  for each row execute function public.sync_opportunity_on_activity();


-- ---------------------------------------------------------------------
-- guard_opportunity_owner
-- El owner_id de la oportunidad siempre sigue al del cliente.
-- Evita que una reasignación deje la oportunidad huérfana.
-- ---------------------------------------------------------------------
create or replace function public.guard_opportunity_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select c.owner_id into v_owner
  from public.customers c where c.id = new.customer_id;

  new.owner_id := v_owner;
  return new;
end;
$$;

drop trigger if exists opportunities_owner_guard on public.opportunities;
create trigger opportunities_owner_guard before insert or update on public.opportunities
  for each row execute function public.guard_opportunity_owner();


-- ---------------------------------------------------------------------
-- cascade_customer_reassignment
-- Al reasignar un cliente, sus oportunidades siguen al nuevo propietario.
-- ---------------------------------------------------------------------
create or replace function public.cascade_customer_reassignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    update public.opportunities
       set owner_id = new.owner_id
     where customer_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists customers_reassign_cascade on public.customers;
create trigger customers_reassign_cascade after update on public.customers
  for each row execute function public.cascade_customer_reassignment();


-- ---------------------------------------------------------------------
-- block_archived_customer_write
-- Un cliente archivado no admite oportunidades nuevas.
-- ---------------------------------------------------------------------
create or replace function public.block_archived_customer_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.customers c
    where c.id = new.customer_id and c.is_archived = true
  ) then
    raise exception 'El cliente está archivado';
  end if;
  return new;
end;
$$;

drop trigger if exists opportunities_block_archived on public.opportunities;
create trigger opportunities_block_archived before insert on public.opportunities
  for each row execute function public.block_archived_customer_write();
```

---

## 10. Script 06 — Vistas

```sql
-- =====================================================================
-- CRM-123 · Script 06 · Vistas
-- TODAS con security_invoker = true. Sin esto, una vista filtraría
-- los datos de todo el equipo a cualquier vendedor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- v_opportunity_board
-- Oportunidades abiertas con el cálculo de atraso resuelto.
-- Es la fuente del tablero del día y de la tabla densa.
-- ---------------------------------------------------------------------
create or replace view public.v_opportunity_board
with (security_invoker = true) as
select
  o.id                    as opportunity_id,
  o.customer_id,
  o.owner_id,
  c.full_name             as customer_name,
  c.company               as customer_company,
  c.phone                 as customer_phone,
  c.source                as customer_source,
  o.stage,
  o.estimated_amount,
  o.next_action_at,
  o.last_activity_at,
  o.created_at,
  public.stale_threshold_days(o.stage) as threshold_days,

  -- Días completos sin actividad, en horario de Madrid
  greatest(
    0,
    (date(now() at time zone 'Europe/Madrid')
     - date(o.last_activity_at at time zone 'Europe/Madrid'))
  )::integer as days_without_activity,

  -- Señal 1: sin actividad más allá del umbral de su etapa
  (
    (date(now() at time zone 'Europe/Madrid')
     - date(o.last_activity_at at time zone 'Europe/Madrid'))
    >= public.stale_threshold_days(o.stage)
  ) as is_stale,

  -- Señal 2: la próxima acción agendada ya venció
  (o.next_action_at is not null and o.next_action_at < now()) as is_overdue,

  -- Aparece en el bloque "Atrasadas" si se cumple cualquiera de las dos
  (
    (
      (date(now() at time zone 'Europe/Madrid')
       - date(o.last_activity_at at time zone 'Europe/Madrid'))
      >= public.stale_threshold_days(o.stage)
    )
    or (o.next_action_at is not null and o.next_action_at < now())
  ) as needs_attention,

  -- Aparece en el bloque "Acciones de hoy"
  (
    o.next_action_at is not null
    and date(o.next_action_at at time zone 'Europe/Madrid')
        = date(now() at time zone 'Europe/Madrid')
  ) as is_due_today

from public.opportunities o
join public.customers c on c.id = o.customer_id
where o.status = 'open'
  and c.is_archived = false;

comment on view public.v_opportunity_board is
  'Oportunidades abiertas con atraso ya calculado. Respeta RLS por security_invoker.';


-- ---------------------------------------------------------------------
-- v_seller_month_progress
-- Avance del mes en curso por vendedor: cuota, cerrado y porcentaje.
-- ---------------------------------------------------------------------
create or replace view public.v_seller_month_progress
with (security_invoker = true) as
with period as (
  select
    public.period_year_madrid(now())  as y,
    public.period_month_madrid(now()) as m
),
won as (
  select
    o.owner_id,
    coalesce(sum(o.final_amount), 0) as closed_amount,
    count(*)                         as closed_count
  from public.opportunities o, period p
  where o.status = 'won'
    and public.period_year_madrid(o.closed_at)  = p.y
    and public.period_month_madrid(o.closed_at) = p.m
  group by o.owner_id
),
attention as (
  select b.owner_id, count(*) as needs_attention_count
  from public.v_opportunity_board b
  where b.needs_attention
  group by b.owner_id
)
select
  pr.id                                as profile_id,
  pr.full_name,
  pr.username,
  pr.email,
  p.y                                  as period_year,
  p.m                                  as period_month,
  coalesce(q.amount_eur, 0)            as quota_amount,
  coalesce(w.closed_amount, 0)         as closed_amount,
  coalesce(w.closed_count, 0)          as closed_count,
  greatest(coalesce(q.amount_eur,0) - coalesce(w.closed_amount,0), 0) as remaining_amount,
  case
    when coalesce(q.amount_eur, 0) = 0 then null
    else round((coalesce(w.closed_amount,0) / q.amount_eur) * 100, 1)
  end                                  as quota_percent,
  coalesce(a.needs_attention_count, 0) as needs_attention_count
from public.profiles pr
cross join period p
left join public.quotas q
       on q.profile_id = pr.id and q.period_year = p.y and q.period_month = p.m
left join won w        on w.owner_id = pr.id
left join attention a  on a.owner_id = pr.id
where pr.role = 'seller'
  and pr.is_active = true;

comment on view public.v_seller_month_progress is
  'Avance del mes por vendedor. El vendedor solo verá su fila por RLS; el supervisor las verá todas.';


-- ---------------------------------------------------------------------
-- v_team_month_progress
-- Consolidado del equipo. Solo devuelve datos al supervisor,
-- porque se apoya en v_seller_month_progress que ya filtra por RLS.
-- ---------------------------------------------------------------------
create or replace view public.v_team_month_progress
with (security_invoker = true) as
select
  count(*)                                    as sellers_count,
  coalesce(sum(quota_amount), 0)              as team_quota,
  coalesce(sum(closed_amount), 0)             as team_closed,
  coalesce(sum(closed_count), 0)              as team_closed_count,
  coalesce(sum(needs_attention_count), 0)     as team_needs_attention,
  case
    when coalesce(sum(quota_amount), 0) = 0 then null
    else round((sum(closed_amount) / sum(quota_amount)) * 100, 1)
  end                                         as team_quota_percent
from public.v_seller_month_progress;


-- ---------------------------------------------------------------------
-- v_loss_reasons_month
-- Motivos de pérdida del mes. Alimenta el panel del supervisor.
-- ---------------------------------------------------------------------
create or replace view public.v_loss_reasons_month
with (security_invoker = true) as
select
  o.loss_reason,
  count(*)                              as lost_count,
  coalesce(sum(o.estimated_amount), 0)  as lost_estimated_amount
from public.opportunities o
where o.status = 'lost'
  and public.period_year_madrid(o.closed_at)  = public.period_year_madrid(now())
  and public.period_month_madrid(o.closed_at) = public.period_month_madrid(now())
group by o.loss_reason;
```

---

## 11. Script 07 — Activación de RLS

```sql
-- =====================================================================
-- CRM-123 · Script 07 · Activación de RLS
-- RLS activa en TODAS las tablas. Sin excepción.
-- force row level security impide que el propietario de la tabla la esquive.
-- =====================================================================

alter table public.profiles         enable row level security;
alter table public.quotas           enable row level security;
alter table public.customers        enable row level security;
alter table public.opportunities    enable row level security;
alter table public.activities       enable row level security;
alter table public.audit_log        enable row level security;
alter table public.settings         enable row level security;
alter table public.automation_runs  enable row level security;

alter table public.profiles         force row level security;
alter table public.quotas           force row level security;
alter table public.customers        force row level security;
alter table public.opportunities    force row level security;
alter table public.activities       force row level security;
alter table public.audit_log        force row level security;
alter table public.settings         force row level security;
alter table public.automation_runs  force row level security;
```

---

## 12. Script 08 — Políticas RLS

```sql
-- =====================================================================
-- CRM-123 · Script 08 · Políticas RLS
--
-- INVARIANTES:
--   · Ninguna política de DELETE en ninguna tabla.
--   · activities y audit_log: solo INSERT y SELECT.
--   · Toda política de UPDATE lleva with check.
--   · Ninguna condición true, salvo settings_select_all.
-- =====================================================================

-- =====================================================================
-- profiles
-- =====================================================================

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists profiles_select_supervisor on public.profiles;
create policy profiles_select_supervisor
  on public.profiles for select
  to authenticated
  using (public.is_supervisor());

-- El usuario solo puede tocar su propia fila y NO puede cambiar
-- su rol, su estado ni su email. Eso lo hace el supervisor.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid() and public.is_active_user())
  with check (
    id = auth.uid()
    and role      = (select p.role      from public.profiles p where p.id = auth.uid())
    and is_active = (select p.is_active from public.profiles p where p.id = auth.uid())
    and lower(email) = (select lower(p.email) from public.profiles p where p.id = auth.uid())
    and lower(username) = (select lower(p.username) from public.profiles p where p.id = auth.uid())
  );

drop policy if exists profiles_update_supervisor on public.profiles;
create policy profiles_update_supervisor
  on public.profiles for update
  to authenticated
  using (public.is_supervisor())
  with check (public.is_supervisor());

-- El alta de usuarios la hace el servidor con la clave de servicio,
-- que ignora RLS. No hay política de insert para authenticated.
-- SIN POLÍTICA DE DELETE.


-- =====================================================================
-- quotas
-- =====================================================================

drop policy if exists quotas_select_own on public.quotas;
create policy quotas_select_own
  on public.quotas for select
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists quotas_select_supervisor on public.quotas;
create policy quotas_select_supervisor
  on public.quotas for select
  to authenticated
  using (public.is_supervisor());

drop policy if exists quotas_insert_supervisor on public.quotas;
create policy quotas_insert_supervisor
  on public.quotas for insert
  to authenticated
  with check (public.is_supervisor());

drop policy if exists quotas_update_supervisor on public.quotas;
create policy quotas_update_supervisor
  on public.quotas for update
  to authenticated
  using (public.is_supervisor())
  with check (public.is_supervisor());

-- SIN POLÍTICA DE DELETE.


-- =====================================================================
-- customers
-- =====================================================================

drop policy if exists customers_select_own on public.customers;
create policy customers_select_own
  on public.customers for select
  to authenticated
  using (owner_id = auth.uid() and public.is_active_user());

drop policy if exists customers_select_supervisor on public.customers;
create policy customers_select_supervisor
  on public.customers for select
  to authenticated
  using (public.is_supervisor());

-- El vendedor crea clientes solo para sí mismo y nunca archivados.
drop policy if exists customers_insert_own on public.customers;
create policy customers_insert_own
  on public.customers for insert
  to authenticated
  with check (
    owner_id   = auth.uid()
    and created_by = auth.uid()
    and is_archived = false
    and public.is_active_user()
  );

drop policy if exists customers_insert_supervisor on public.customers;
create policy customers_insert_supervisor
  on public.customers for insert
  to authenticated
  with check (public.is_supervisor() and created_by = auth.uid());

-- CLAVE: el with check impide que el vendedor cambie owner_id
-- y se quede con el cliente de otro, o archive un cliente.
drop policy if exists customers_update_own on public.customers;
create policy customers_update_own
  on public.customers for update
  to authenticated
  using (owner_id = auth.uid() and is_archived = false and public.is_active_user())
  with check (
    owner_id = auth.uid()
    and is_archived = false
    and created_by = (select c.created_by from public.customers c where c.id = customers.id)
  );

-- Solo el supervisor reasigna y archiva.
drop policy if exists customers_update_supervisor on public.customers;
create policy customers_update_supervisor
  on public.customers for update
  to authenticated
  using (public.is_supervisor())
  with check (public.is_supervisor());

-- SIN POLÍTICA DE DELETE. El archivado es lógico.


-- =====================================================================
-- opportunities
-- =====================================================================

drop policy if exists opportunities_select_own on public.opportunities;
create policy opportunities_select_own
  on public.opportunities for select
  to authenticated
  using (owner_id = auth.uid() and public.is_active_user());

drop policy if exists opportunities_select_supervisor on public.opportunities;
create policy opportunities_select_supervisor
  on public.opportunities for select
  to authenticated
  using (public.is_supervisor());

drop policy if exists opportunities_insert_own on public.opportunities;
create policy opportunities_insert_own
  on public.opportunities for insert
  to authenticated
  with check (
    public.owns_customer(customer_id)
    and created_by = auth.uid()
    and status = 'open'
    and public.is_active_user()
  );

drop policy if exists opportunities_insert_supervisor on public.opportunities;
create policy opportunities_insert_supervisor
  on public.opportunities for insert
  to authenticated
  with check (public.is_supervisor() and created_by = auth.uid() and status = 'open');

-- El vendedor mueve etapas y cierra sus propias oportunidades,
-- pero no puede reasignarlas ni reabrir una cerrada.
drop policy if exists opportunities_update_own on public.opportunities;
create policy opportunities_update_own
  on public.opportunities for update
  to authenticated
  using (owner_id = auth.uid() and status = 'open' and public.is_active_user())
  with check (
    owner_id = auth.uid()
    and public.owns_customer(customer_id)
    and customer_id = (select o.customer_id from public.opportunities o where o.id = opportunities.id)
    and created_by  = (select o.created_by  from public.opportunities o where o.id = opportunities.id)
  );

drop policy if exists opportunities_update_supervisor on public.opportunities;
create policy opportunities_update_supervisor
  on public.opportunities for update
  to authenticated
  using (public.is_supervisor())
  with check (public.is_supervisor());

-- SIN POLÍTICA DE DELETE.


-- =====================================================================
-- activities  ·  SOLO INSERCIÓN
-- =====================================================================

drop policy if exists activities_select_own on public.activities;
create policy activities_select_own
  on public.activities for select
  to authenticated
  using (public.owns_customer(customer_id) and public.is_active_user());

drop policy if exists activities_select_supervisor on public.activities;
create policy activities_select_supervisor
  on public.activities for select
  to authenticated
  using (public.is_supervisor());

drop policy if exists activities_insert_own on public.activities;
create policy activities_insert_own
  on public.activities for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.owns_customer(customer_id)
    and public.is_active_user()
  );

drop policy if exists activities_insert_supervisor on public.activities;
create policy activities_insert_supervisor
  on public.activities for insert
  to authenticated
  with check (public.is_supervisor() and author_id = auth.uid());

-- SIN POLÍTICA DE UPDATE. SIN POLÍTICA DE DELETE. Para nadie,
-- incluido el supervisor. El historial es inmutable.


-- =====================================================================
-- audit_log  ·  SOLO INSERCIÓN
-- =====================================================================

drop policy if exists audit_log_select_supervisor on public.audit_log;
create policy audit_log_select_supervisor
  on public.audit_log for select
  to authenticated
  using (public.is_supervisor());

drop policy if exists audit_log_insert_self on public.audit_log;
create policy audit_log_insert_self
  on public.audit_log for insert
  to authenticated
  with check (actor_id = auth.uid() and public.is_active_user());

-- SIN POLÍTICA DE UPDATE. SIN POLÍTICA DE DELETE. Para nadie.


-- =====================================================================
-- settings
-- =====================================================================

-- ÚNICA política con condición true en todo el sistema, y está permitida.
drop policy if exists settings_select_all on public.settings;
create policy settings_select_all
  on public.settings for select
  to authenticated
  using (true);

drop policy if exists settings_insert_supervisor on public.settings;
create policy settings_insert_supervisor
  on public.settings for insert
  to authenticated
  with check (public.is_supervisor());

drop policy if exists settings_update_supervisor on public.settings;
create policy settings_update_supervisor
  on public.settings for update
  to authenticated
  using (public.is_supervisor())
  with check (public.is_supervisor());

-- SIN POLÍTICA DE DELETE.


-- =====================================================================
-- automation_runs
-- =====================================================================

drop policy if exists automation_runs_select_supervisor on public.automation_runs;
create policy automation_runs_select_supervisor
  on public.automation_runs for select
  to authenticated
  using (public.is_supervisor());

-- La escritura la hace el servidor con la clave de servicio.
-- No hay insert ni update para authenticated. SIN DELETE.
```

---

## 13. Script 09 — Permisos

```sql
-- =====================================================================
-- CRM-123 · Script 09 · Permisos
-- RLS filtra filas, pero grant controla qué verbos existen.
-- Nunca se concede delete a nadie.
-- =====================================================================

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from anon;

grant usage on schema public to authenticated;

grant select, insert, update on public.profiles        to authenticated;
grant select, insert, update on public.quotas          to authenticated;
grant select, insert, update on public.customers       to authenticated;
grant select, insert, update on public.opportunities   to authenticated;
grant select, insert         on public.activities      to authenticated;  -- sin update
grant select, insert         on public.audit_log       to authenticated;  -- sin update
grant select, insert, update on public.settings        to authenticated;
grant select                 on public.automation_runs to authenticated;

grant select on public.v_opportunity_board      to authenticated;
grant select on public.v_seller_month_progress  to authenticated;
grant select on public.v_team_month_progress    to authenticated;
grant select on public.v_loss_reasons_month     to authenticated;

grant execute on function public.app_current_role()          to authenticated;
grant execute on function public.is_supervisor()             to authenticated;
grant execute on function public.is_active_user()            to authenticated;
grant execute on function public.owns_customer(uuid)         to authenticated;
grant execute on function public.stale_threshold_days(public.opportunity_stage) to authenticated;
grant execute on function public.period_year_madrid(timestamptz)  to authenticated;
grant execute on function public.period_month_madrid(timestamptz) to authenticated;

-- El rol anónimo no tiene acceso a nada.
revoke all on schema public from anon;
```

---

## 14. Script 10 — Configuración inicial

```sql
-- =====================================================================
-- CRM-123 · Script 10 · Configuración inicial
-- =====================================================================

insert into public.settings (key, value) values
  ('brand',              '{"name":"CRM-123"}'::jsonb),
  ('locale',             '{"language":"es-ES","currency":"EUR","timezone":"Europe/Madrid","date_format":"dd/MM/yyyy"}'::jsonb),
  ('stale_thresholds',   '{"new":3,"contacted":3,"proposal_sent":2,"negotiation":2}'::jsonb),
  ('morning_digest',     '{"hour":"07:30","weekdays":[1,2,3,4,5],"timezone":"Europe/Madrid","manual_cooldown_minutes":10}'::jsonb),
  ('vat',                '{"amounts_include_vat":false,"note":"Todos los importes son base imponible, sin IVA."}'::jsonb)
on conflict (key) do nothing;
```

---

## 15. Script 11 — Datos de ejemplo (desechable)

> **Aviso:** este script crea usuarios en `auth.users` y por tanto solo debe ejecutarse
> con la clave de servicio, en el entorno de pruebas. Se elimina completo con el Script 12.
> Todos los clientes llevan el prefijo de nombre `[DEMO]` para poder identificarlos.

```sql
-- =====================================================================
-- CRM-123 · Script 11 · Datos de ejemplo · DESECHABLE
-- =====================================================================

-- En Supabase, pgcrypto vive en el esquema 'extensions', no en 'public'.
-- Sin esta línea, crypt() y gen_salt() pueden no resolverse y el script
-- falla al crear los usuarios de autenticación.
set search_path = public, extensions;

do $$
declare
  v_sup  uuid := gen_random_uuid();
  v_v1   uuid := gen_random_uuid();
  v_v2   uuid := gen_random_uuid();
  v_cust uuid;
  v_opp  uuid;
  v_year  smallint := public.period_year_madrid(now());
  v_month smallint := public.period_month_madrid(now());
  i int;

  v_names text[] := array[
    'Lucía Fernández','Mario Iglesias','Carmen Ortega','Javier Peña','Nuria Sanchís',
    'Alberto Cano','Rocío Herrero','Iván Salgado','Marta Bustos','Sergio Alcalde',
    'Paula Redondo','Andrés Villalba','Elena Camino','Rubén Prieto','Beatriz Nogales'
  ];
  v_companies text[] := array[
    'Calzados Aurora','Boutique Marés', null,'Zapatería El Paso', null,
    'Moda Lienzo','Tienda Sirena', null,'Calzado Bustos','Alcalde Distribución',
    null,'Villalba Retail','Camino Shoes', null,'Nogales Moda'
  ];
  v_sources public.customer_source[] := array[
    'physical_store','instagram','whatsapp','trade_show','referral',
    'inbound_call','instagram','whatsapp','physical_store','trade_show',
    'referral','other','instagram','physical_store','whatsapp'
  ]::public.customer_source[];
  v_stages public.opportunity_stage[] := array[
    'new','contacted','proposal_sent','negotiation','contacted',
    'proposal_sent','new','negotiation','contacted','proposal_sent',
    'new','negotiation','contacted','proposal_sent','new'
  ]::public.opportunity_stage[];
begin

  -- Usuarios de autenticación. Contraseña de todos: Demo1234!
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data)
  values
   (v_sup,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
    'demo.supervisor@crm123.local', crypt('Demo1234!', gen_salt('bf')),
    now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb),
   (v_v1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
    'demo.vendedor1@crm123.local', crypt('Demo1234!', gen_salt('bf')),
    now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb),
   (v_v2,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
    'demo.vendedor2@crm123.local', crypt('Demo1234!', gen_salt('bf')),
    now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb);

  insert into public.profiles (id, username, full_name, email, role, must_change_password) values
   (v_sup,'demo.supervisor','Ana Supervisora','demo.supervisor@crm123.local','supervisor', false),
   (v_v1, 'demo.vendedor1', 'Pedro Ventas',   'demo.vendedor1@crm123.local', 'seller',     false),
   (v_v2, 'demo.vendedor2', 'Sara Comercial', 'demo.vendedor2@crm123.local', 'seller',     false);

  insert into public.quotas (profile_id, period_year, period_month, amount_eur) values
   (v_v1, v_year, v_month, 18000.00),
   (v_v2, v_year, v_month, 15000.00);

  for i in 1..15 loop
    v_cust := gen_random_uuid();

    insert into public.customers (id, phone, full_name, company, source, owner_id, created_by)
    values (
      v_cust,
      '+346' || lpad((10000000 + i)::text, 8, '0'),
      '[DEMO] ' || v_names[i],
      v_companies[i],
      v_sources[i],
      case when i % 2 = 1 then v_v1 else v_v2 end,
      case when i % 2 = 1 then v_v1 else v_v2 end
    );

    v_opp := gen_random_uuid();

    if i <= 11 then
      -- Oportunidades abiertas, con distintos grados de atraso
      insert into public.opportunities
        (id, customer_id, owner_id, stage, status, estimated_amount,
         next_action_at, last_activity_at, created_by, created_at)
      values (
        v_opp, v_cust,
        case when i % 2 = 1 then v_v1 else v_v2 end,
        v_stages[i], 'open',
        (600 + i * 175)::numeric(12,2),
        case
          when i % 4 = 0 then now() - interval '1 day'      -- vencida
          when i % 4 = 1 then now() + interval '3 hours'    -- hoy
          else now() + interval '4 days'
        end,
        now() - (i || ' days')::interval,
        case when i % 2 = 1 then v_v1 else v_v2 end,
        now() - (i + 5 || ' days')::interval
      );

      -- created_at EXPLÍCITO. El disparador copia este valor a
      -- opportunities.last_activity_at. Sin él, la actividad tomaría now()
      -- por defecto y borraría el escalonado de atraso que se acaba de
      -- fabricar, dejando C22 sin nada que comprobar.
      insert into public.activities
        (opportunity_id, customer_id, author_id, type, note, created_at)
      values (
        v_opp, v_cust,
        case when i % 2 = 1 then v_v1 else v_v2 end,
        (array['call','whatsapp','email','visit','note'])[1 + (i % 5)]::public.activity_type,
        '[DEMO] Primer contacto sobre la colección de temporada.',
        now() - (i || ' days')::interval
      );

    elsif i <= 13 then
      -- Ganadas este mes
      insert into public.opportunities
        (id, customer_id, owner_id, stage, status, estimated_amount, final_amount,
         closed_at, last_activity_at, created_by)
      values (
        v_opp, v_cust,
        case when i % 2 = 1 then v_v1 else v_v2 end,
        'closed', 'won',
        (2500 + i * 100)::numeric(12,2),
        (2350 + i * 100)::numeric(12,2),
        now() - interval '3 days',
        now() - interval '3 days',
        case when i % 2 = 1 then v_v1 else v_v2 end
      );
    else
      -- Perdidas este mes
      insert into public.opportunities
        (id, customer_id, owner_id, stage, status, estimated_amount,
         loss_reason, closed_at, last_activity_at, created_by)
      values (
        v_opp, v_cust,
        case when i % 2 = 1 then v_v1 else v_v2 end,
        'closed', 'lost',
        (1400 + i * 60)::numeric(12,2),
        (array['price','no_response'])[i - 13]::public.loss_reason,
        now() - interval '5 days',
        now() - interval '5 days',
        case when i % 2 = 1 then v_v1 else v_v2 end
      );
    end if;
  end loop;

  raise notice 'Datos de ejemplo creados. Contraseña de todos los usuarios demo: Demo1234!';
end $$;

reset search_path;
```

---

## 16. Script 12 — Borrado de datos de ejemplo

```sql
-- =====================================================================
-- CRM-123 · Script 12 · Borrado de datos de ejemplo
-- Solo con clave de servicio. Solo elimina lo marcado como [DEMO].
-- =====================================================================

do $$
declare
  v_demo_profiles uuid[];
begin
  select array_agg(id) into v_demo_profiles
  from public.profiles
  where email like 'demo.%@crm123.local';

  if v_demo_profiles is null then
    raise notice 'No hay datos de ejemplo que borrar.';
    return;
  end if;

  delete from public.activities
   where customer_id in (select id from public.customers where full_name like '[DEMO]%');

  delete from public.opportunities
   where customer_id in (select id from public.customers where full_name like '[DEMO]%');

  delete from public.customers where full_name like '[DEMO]%';
  delete from public.audit_log where actor_id = any(v_demo_profiles);
  delete from public.quotas   where profile_id = any(v_demo_profiles);
  delete from public.profiles where id = any(v_demo_profiles);
  delete from auth.users      where id = any(v_demo_profiles);

  raise notice 'Datos de ejemplo eliminados.';
end $$;
```

---

## 17. Batería de comprobaciones

Ejecutar **después** de todos los scripts. Cada consulta debe devolver el resultado esperado. Si alguna falla, la base de datos no se da por buena.

### C1 — Todas las tablas existen

```sql
select tablename
from pg_tables
where schemaname = 'public'
order by tablename;
-- ESPERADO: activities, audit_log, automation_runs, customers,
--           opportunities, profiles, quotas, settings  (8 filas)
```

### C2 — RLS activa y forzada en todas las tablas

```sql
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;
-- ESPERADO: relrowsecurity = true Y relforcerowsecurity = true en las 8 filas.
```

### C3 — Ninguna política de DELETE (INNEGOCIABLE)

```sql
select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public' and cmd = 'DELETE';
-- ESPERADO: 0 filas.
```

### C4 — activities y audit_log son solo de inserción (INNEGOCIABLE)

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('activities','audit_log')
  and cmd in ('UPDATE','DELETE','ALL');
-- ESPERADO: 0 filas.
```

### C5 — Toda política de UPDATE lleva with check (INNEGOCIABLE)

```sql
select tablename, policyname
from pg_policies
where schemaname = 'public' and cmd = 'UPDATE' and with_check is null;
-- ESPERADO: 0 filas.
```

### C6 — Ninguna condición true salvo el select de settings (INNEGOCIABLE)

```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and (btrim(coalesce(qual,'')) = 'true' or btrim(coalesce(with_check,'')) = 'true')
  and policyname <> 'settings_select_all';
-- ESPERADO: 0 filas.
```

### C7 — Todas las vistas con security_invoker (INNEGOCIABLE)

```sql
select c.relname,
       coalesce(
         (select option_value from pg_options_to_table(c.reloptions)
          where option_name = 'security_invoker'), 'NO DEFINIDO'
       ) as security_invoker
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'
order by c.relname;
-- ESPERADO: security_invoker = 'true' en las 4 vistas.
```

### C8 — Toda función security definer fija search_path (INNEGOCIABLE)

```sql
select p.proname,
       p.prosecdef as es_security_definer,
       p.proconfig
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.prosecdef = true
order by p.proname;
-- ESPERADO: toda fila con prosecdef = true debe tener
--           proconfig conteniendo 'search_path=public'.
```

Comprobación estricta, debe devolver 0 filas:

```sql
select proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and prosecdef = true
  and (proconfig is null or not (proconfig @> array['search_path=public']));
-- ESPERADO: 0 filas.
```

### C9 — El rol anónimo no tiene ningún permiso

```sql
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public';
-- ESPERADO: 0 filas.
```

### C10 — Nadie tiene permiso de DELETE

```sql
select grantee, table_name
from information_schema.role_table_grants
where table_schema = 'public'
  and privilege_type = 'DELETE'
  and grantee in ('anon','authenticated');
-- ESPERADO: 0 filas.
```

### C11 — activities y audit_log sin permiso de UPDATE

```sql
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('activities','audit_log')
  and privilege_type = 'UPDATE'
  and grantee in ('anon','authenticated');
-- ESPERADO: 0 filas.
--
-- NOTA: el filtro por grantee es imprescindible. Sin él la consulta también
-- devuelve a 'postgres' (dueño de la tabla) y a 'service_role', que Supabase
-- concede de fábrica y que no son roles de aplicación. Lo que aquí se verifica
-- es que ningún usuario del CRM pueda modificar el historial.
```

### C12 — Índices y unicidades presentes

```sql
select indexname
from pg_indexes
where schemaname = 'public'
order by indexname;
-- ESPERADO, entre otros, deben aparecer:
--   customers_phone_uk
--   opportunities_one_open_per_customer_uk
--   profiles_username_uk
--   profiles_email_uk
--   quotas_profile_period_uk
```

### C13 — Teléfono único: debe FALLAR el segundo insert

```sql
-- Prueba manual. Con dos vendedores distintos, insertar el mismo teléfono.
-- ESPERADO: error de violación de unicidad en customers_phone_uk.
```

### C14 — Una sola oportunidad abierta por cliente: debe FALLAR

```sql
-- Prueba manual. Insertar una segunda oportunidad con status = 'open'
-- para un cliente que ya tiene una abierta.
-- ESPERADO: error de violación de unicidad en
--           opportunities_one_open_per_customer_uk.
```

### C15 — Coherencia de cierre: debe FALLAR

```sql
-- a) Cerrar como 'lost' sin loss_reason
--    ESPERADO: violación de opportunities_lost_coherent.
-- b) Cerrar como 'won' sin final_amount
--    ESPERADO: violación de opportunities_won_coherent.
-- c) Cerrar como 'won' con loss_reason
--    ESPERADO: violación de opportunities_won_coherent.
```

### C16 — Aislamiento entre vendedores

```sql
-- Autenticado como demo.vendedor1:
select count(*) from public.customers;
-- ESPERADO: solo sus clientes (8 de los 15 de ejemplo), nunca los de vendedor2.

select count(*) from public.v_seller_month_progress;
-- ESPERADO: 1 fila, la suya.

select count(*) from public.audit_log;
-- ESPERADO: 0 filas. El vendedor no ve la auditoría.

select count(*) from public.automation_runs;
-- ESPERADO: 0 filas.
```

### C17 — El vendedor no puede robar un cliente

```sql
-- Autenticado como demo.vendedor1, intentar:
update public.customers
   set owner_id = '<uuid de vendedor1>'
 where id = '<uuid de un cliente de vendedor2>';
-- ESPERADO: 0 filas afectadas. La política using no lo alcanza.

-- Y sobre un cliente propio, intentar cedérselo a otro:
update public.customers
   set owner_id = '<uuid de vendedor2>'
 where id = '<uuid de un cliente propio>';
-- ESPERADO: error de violación de RLS por el with check.
```

### C18 — El vendedor no puede alterar el historial

```sql
-- Autenticado como demo.vendedor1:
update public.activities set note = 'alterado' where id = '<uuid de una actividad propia>';
-- ESPERADO: error de permiso denegado (no hay grant de update).

delete from public.activities where id = '<uuid de una actividad propia>';
-- ESPERADO: error de permiso denegado.
```

### C19 — El supervisor tampoco puede alterar el historial

```sql
-- Autenticado como demo.supervisor:
update public.audit_log set action = 'user.created' where id = '<uuid>';
-- ESPERADO: error de permiso denegado. Sin excepciones por rol.
```

### C20 — El vendedor no puede ascenderse a supervisor

```sql
-- Autenticado como demo.vendedor1:
update public.profiles set role = 'supervisor' where id = auth.uid();
-- ESPERADO: error de violación de RLS por el with check de profiles_update_own.
```

### C21 — El supervisor ve todo

```sql
-- Autenticado como demo.supervisor:
select count(*) from public.customers;              -- ESPERADO: 15
select count(*) from public.v_seller_month_progress; -- ESPERADO: 2
select * from public.v_team_month_progress;          -- ESPERADO: 1 fila con totales
```

### C22 — El cálculo de atraso funciona

```sql
-- Autenticado como demo.vendedor1:
select customer_name, stage, days_without_activity, threshold_days,
       is_stale, is_overdue, needs_attention, is_due_today
from public.v_opportunity_board
order by needs_attention desc, days_without_activity desc;
-- ESPERADO: filas con days_without_activity >= threshold_days
--           tienen is_stale = true y needs_attention = true.
```

### C23 — Configuración inicial cargada

```sql
select key from public.settings order by key;
-- ESPERADO: brand, locale, morning_digest, stale_thresholds, vat  (5 filas)
```

### C24 — Ninguna columna guarda identificadores personales prohibidos

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and column_name ~* '(^|_)(dpi|nit|dni|nie|cif|passport|pasaporte|tax_id|national_id|fiscal_id)(_|$)';
-- ESPERADO: 0 filas.
--
-- NOTA: los límites de palabra (^|_) y (_|$) son imprescindibles. Con un
-- '%nit%' suelto, el patrón casa dentro de 'oppor-tu-NIT-y_id' y devuelve
-- falsos positivos en activities y en v_opportunity_board. Con la expresión
-- de arriba, 'customer_nit' o 'nit_number' se detectan y 'opportunity_id' no.
```

---

## 18. Orden de ejecución

Esta secuencia funciona **igual sobre una base virgen que sobre una a medio construir**. Se
ejecuta entera, de arriba abajo, sin saltarse pasos. Cada script se lanza por separado y se
confirma que terminó sin error antes de pasar al siguiente.

| # | Script | Cuándo |
|---|---|---|
| 0 | **Script 00 — Reinicio limpio** | **Siempre. Es el paso 0 del Hito 1** |
| 1 | **Comprobación C0** (las cuatro consultas) | **Obligatorio antes de continuar** |
| 2 | Script 01 — Extensiones y tipos | Siempre |
| 3 | Script 02 — Tablas | Siempre |
| 4 | Script 03 — Índices | Siempre |
| 5 | Script 04 — Funciones | Siempre |
| 6 | Script 05 — Disparadores | Siempre |
| 7 | Script 06 — Vistas | Siempre |
| 8 | Script 07 — Activación de RLS | Siempre |
| 9 | Script 08 — Políticas RLS | Siempre |
| 10 | Script 09 — Permisos | Siempre |
| 11 | Script 10 — Configuración inicial | Siempre |
| 12 | **Comprobaciones C1 a C12, C23 y C24** | **Obligatorio antes de continuar** |
| 13 | Script 11 — Datos de ejemplo | Solo en pruebas |
| 14 | **Verificación del Apéndice A** | **Obligatorio antes de C16** |
| 15 | **Comprobaciones C13 a C22** | **Obligatorio** |
| 16 | Script 12 — Borrado de ejemplo | Antes de cargar datos reales |

### Puntos donde hay que pararse

**Tras el paso 1.** Si C0 devuelve alguna fila, la base no está limpia. No se sigue.

**Tras el paso 12.** Si alguna de C3, C4, C5, C6, C7 u C8 falla, la base **no sirve**. Se
vuelve al paso 0 y se investiga qué script no se aplicó.

**Tras el paso 14.** Si `auth.uid()` sale nulo, la simulación de sesión no está activa y las
comprobaciones C16 a C21 darían un **falso aprobado**: parecería que el aislamiento entre
vendedores funciona sin haberlo probado. No se sigue hasta que devuelva el uuid correcto.

**Tras el paso 15.** En C22, las once oportunidades abiertas quedan escalonadas de 1 a 11
días sin actividad, con umbrales de 3 días en Nuevo y Contactado y de 2 en Propuesta enviada
y Negociación. Debe verse una **mezcla** de `needs_attention` verdadero y falso. Si salen
todas iguales en un sentido o en el otro, hay algo mal en la vista y conviene pararse ahí.

**El Hito 1 no se da por cerrado hasta que C0 y las 24 comprobaciones pasan.**

---

## 19. Apéndice A — Cómo simular una sesión para las comprobaciones C16 a C21

Las comprobaciones C16 a C21 son las que de verdad demuestran que el aislamiento entre
vendedores funciona. Pero el conector MCP se conecta como `service_role`, que **se salta RLS
por completo**: ejecutadas tal cual, esas consultas devolverían todos los datos y darían un
falso aprobado.

Para ejecutarlas de verdad hay que hacerse pasar por un usuario concreto. Se hace con dos
ajustes de sesión, dentro de una transacción que se deshace al terminar.

### Plantilla

```sql
begin;

-- 1. Se declaran las credenciales que leerá auth.uid().
--    Sustituir el uuid por el del usuario que se quiere simular.
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',  '<UUID DEL USUARIO>',
    'role', 'authenticated'
  )::text,
  true
);

-- 2. Se baja del rol privilegiado al rol de aplicación.
--    A partir de aquí, RLS SÍ se aplica.
set local role authenticated;

-- 3. Las consultas de la comprobación.
select count(*) from public.customers;

-- 4. Se deshace todo y se recupera el rol original.
rollback;
```

El orden de los dos primeros pasos importa: primero se ponen las credenciales, después se
cambia de rol. Al revés, el rol `authenticated` puede no tener permiso para escribir el ajuste.

### Obtener los uuid de los usuarios de ejemplo

```sql
select id, username, full_name, role
from public.profiles
where email like 'demo.%@crm123.local'
order by role, username;
```

### Comprobación de que la simulación funciona

Antes de dar por buena ninguna otra, ejecutar esta. Si falla, todas las demás mienten:

```sql
begin;
select set_config('request.jwt.claims',
  json_build_object('sub','<UUID DE demo.vendedor1','role','authenticated')::text, true);
set local role authenticated;

select auth.uid()                as usuario_simulado,
       public.app_current_role() as rol_leido_de_profiles,
       public.is_supervisor()    as es_supervisor;
rollback;
-- ESPERADO: el uuid de demo.vendedor1, rol 'seller', es_supervisor = false.
-- Si auth.uid() sale nulo, la simulación NO está activa y C16 a C21
-- darían un falso aprobado.
```

### Las pruebas que deben fallar

C17, C18, C19 y C20 se dan por buenas **cuando la sentencia devuelve un error**. Ese error es
el resultado correcto. Conviene ejecutarlas de una en una, porque el primer error aborta la
transacción y las siguientes sentencias no llegan a evaluarse.

| Comprobación | Sentencia | Resultado que la aprueba |
|---|---|---|
| C17a | `update customers set owner_id = ... where id = <cliente de otro>` | `UPDATE 0` |
| C17b | `update customers set owner_id = <otro> where id = <cliente propio>` | Error de RLS por el `with check` |
| C18a | `update activities set note = ...` | Permiso denegado |
| C18b | `delete from activities where ...` | Permiso denegado |
| C19 | Como supervisor: `update audit_log set ...` | Permiso denegado |
| C20 | `update profiles set role = 'supervisor' where id = auth.uid()` | Error de RLS por el `with check` |

---

## 20. Apéndice B — Registro de correcciones

### Versión 1.2 — Ejecución limpia de principio a fin

Tres correcciones para que el documento funcione de una pasada sobre una base virgen.
**Ninguna altera la estructura de datos.** Los demás documentos no cambian.

**1. Script 00 — el `drop function` fallaba sobre una base virgen**

*Antes:* `drop function if exists public.stale_threshold_days(public.opportunity_stage) cascade;`
*Ahora:* un bucle sobre `pg_proc` que localiza las funciones por nombre y las elimina por su firma real.

*Por qué fallaba:* para interpretar esa firma, Postgres necesita que el tipo `public.opportunity_stage` **exista**. Sobre una base virgen aún no se ha creado, y la sentencia da error `type does not exist` — el `if exists` protege de que falte la función, no de que falte el tipo de su argumento. El bucle recorre cero filas sobre una base limpia y no da error.

**2. Script 00 — pasa a ser el paso 0 obligatorio**

*Antes:* «solo si se reconstruye desde cero».
*Ahora:* se ejecuta siempre, el primero, con su comprobación **C0**.

*Por qué:* es lo que hace el proceso idempotente. Los scripts usan `create table if not exists` y `exception when duplicate_object then null`, de modo que una reejecución parcial deja la base en un estado difícil de razonar. Con el reinicio por delante, cada pasada del Hito 1 parte de un estado idéntico.

**3. Script 11 — `crypt()` y `gen_salt()` podían no resolverse**

*Ahora:* `set search_path = public, extensions;` antes del bloque y `reset search_path;` después.

*Por qué:* en Supabase, `pgcrypto` vive en el esquema `extensions`, no en `public`. Según cómo esté configurado el `search_path` de la conexión, `crypt()` puede no encontrarse y el script falla al crear los usuarios de autenticación.

### Versión 1.1

Tres correcciones sobre la versión inicial. **Ninguna altera la estructura de datos**: no
cambia ninguna tabla, columna, tipo, valor de enumeración, índice ni política. `DESIGN_BRIEF.md`,
`TECHNICAL_SPEC.md` y `CLAUDE.md` **no requieren ningún cambio**, y la aplicación tampoco.

**1. Script 05 — `sync_opportunity_on_activity` acepta la carga sin sesión**

*Antes:* `new.author_id := auth.uid();`
*Ahora:* `new.author_id := coalesce(auth.uid(), new.author_id);` con excepción explícita si el resultado es nulo.

*Por qué falló:* ejecutado desde el conector MCP no hay sesión iniciada, `auth.uid()` vale nulo, y la columna `author_id` no admite nulos. Error `23502`.

*Por qué no debilita la seguridad:* con sesión iniciada `auth.uid()` no es nulo y siempre gana, así que un vendedor sigue sin poder falsificar el autor. El valor pasado solo se respeta cuando `auth.uid()` es nulo, y eso únicamente ocurre desde `service_role` o `postgres`, que ya se saltan RLS por completo. Además, la política `activities_insert_own` exige `author_id = auth.uid()` para cualquier inserción autenticada.

**2. Script 11 — las actividades de ejemplo llevan `created_at` explícito**

*Antes:* la actividad se insertaba sin `created_at` y tomaba `now()` por defecto.
*Ahora:* `created_at = now() - (i || ' days')::interval`.

*Por qué importaba:* el disparador copia `created_at` a `opportunities.last_activity_at`. Con el valor por defecto, las once oportunidades abiertas habrían quedado todas con actividad de hoy y **ninguna atrasada**. La comprobación C22 habría pasado sin filas que revisar, dando por buena una lógica de atraso que nunca se probó. Este defecto no llegó a manifestarse porque la transacción murió antes por el error 1.

**3. Comprobaciones C11 y C24 — consultas corregidas**

- **C11** no filtraba por rol y devolvía `postgres` (dueño de la tabla) y `service_role`, concedidos de fábrica por Supabase. Se añade `and grantee in ('anon','authenticated')`, igual que ya hacía C10.
- **C24** usaba `ilike '%nit%'`, que casa dentro de `opportunity_id`. Se sustituye por una expresión regular con límites de palabra: `(^|_)(dpi|nit|dni|nie|cif|passport|pasaporte|tax_id|national_id|fiscal_id)(_|$)`. Sigue detectando `customer_nit` o `nit_number`, y ya no marca `opportunity_id`.

**4. Script 00 — Reinicio limpio (nuevo)**

Permite reconstruir la base desde cero entre pruebas. Elimina en el orden correcto vistas,
tablas, usuarios de ejemplo, funciones y tipos.

**5. Apéndice A — Simulación de sesión (nuevo)**

Sin él, las comprobaciones C16 a C21 ejecutadas desde el conector MCP darían un falso
aprobado, porque `service_role` se salta RLS.
