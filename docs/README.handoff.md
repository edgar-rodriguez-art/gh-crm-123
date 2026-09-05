# README.handoff — CRM-123

Traspaso del diseño a desarrollo. El diseño entregado es **un único Design Component**:
`CRM-123.dc.html` (prototipo navegable, sin backend). Este documento describe qué hay,
con qué valores exactos, en qué se apartó del brief y qué falta conectar.

- Brief de producto: `uploads/DESIGN_BRIEF.md`
- Contrato de datos (normativo, no se modifica): `uploads/SCRIPTS-SQL.md`
- Sistema visual: Broadsheet, en `_ds/broadsheet-affd264b-5f6a-467e-945a-5e9935e94c55/`

**Índice:** 1 Arquitectura y rutas · 2 Pantallas y matriz de roles · 3 Valores visuales ·
4 Sistema de diseño y equivalencias · 5 Requisitos PWA · 6 Desviaciones del brief y valores
por defecto · 7 Qué falta conectar, con criterios de aceptación.

---

## 1. Arquitectura del entregable

**Escritorio y PWA son una sola aplicación responsive, no dos productos.** Comparten
código, sesión, modelo de datos, rutas y tokens visuales: lo que cambia es la densidad y el
conjunto de pantallas que cada rol necesita en cada ancho. El escritorio es la aplicación
completa; la «PWA» es la misma aplicación instalada en un móvil, donde el supervisor entra
a un subconjunto de consulta (Panel, Detalle de vendedor y el disparo del resumen). No se
construyen dos bases de código, ni dos sistemas de rutas, ni dos capas de datos.

`state.device` (`'desktop' | 'pwa'`) es **chrome de prototipo**: existe solo para que el
revisor vea las dos densidades en el mismo archivo sin dos dispositivos. En producción
desaparece: la densidad la deciden las media queries y el ancho real, y el subconjunto móvil
lo decide el rol más la ruta. Ninguna lógica de negocio debe depender de `device`.

Todo el prototipo vive en un solo archivo, con la navegación en estado local:

| Concepto | Dónde está |
|---|---|
| Plantilla (markup) | `CRM-123.dc.html`, bloque `<x-dc>` |
| Lógica y datos de ejemplo | mismo archivo, `class Component extends DCLogic` |
| Tokens visuales | `_ds/broadsheet-…/styles.css` (enlazado en `<helmet>`) |
| Props / Tweaks | `data-props` del script del componente |

Claves de estado que hacen de router:

```
state.device  = 'desktop' | 'pwa'
state.screen  = 'login' | 'pw' | 'app'
state.role    = 'seller' | 'supervisor'      // simula profiles.role
state.view    = 'board' | 'opps' | 'customer' | 'team' | 'admin'
state.adminTab= 'usuarios' | 'cuotas' | 'auditoria'
state.modal   = null | 'activity' | 'newCustomer' | 'newOpp' | 'won' | 'lost'
                | 'stage' | 'reassign' | 'archive' | 'editCustomer'
                | 'newUser' | 'editUser' | 'userCreated'
state.sheet   = null | 'confirm' | 'running' | 'done' | 'failed'   // PWA
state.pwaView = 'panel' | 'detail'
state.pwaSeller = null | <profile_id>
state.digestToast = null | string          // aviso del límite de 10 minutos
protoSwitch   = valor calculado, no estado  // píldora «PROTOTIPO»
```

Qué sobrevive al pasar a producción:

| Clave | ¿Sobrevive? | En producción |
|---|---|---|
| `screen` | No | lo sustituyen las rutas y el guard de `must_change_password` |
| `role` | Sí, pero **de solo lectura** | se lee de `profiles` (`app_current_role()`), nunca se conmuta en el cliente |
| `view` | No | pasa a ser la ruta |
| `adminTab` | Sí | pestaña de `/admin`, reflejada en la URL |
| `customerId` | Sí | parámetro de ruta `/clientes/[id]` |
| `modal` | Sí | estado local del diálogo (o `?modal=` si se quiere enlazable) |
| `sheet` | Sí | estado local de la hoja del resumen |
| `pwaView` | No | se sustituye por las rutas `/` y `/equipo/[id]` |
| `pwaSeller` | Sí | parámetro de ruta `/equipo/[id]` |
| `digestToast` | Sí | mensaje del límite, pero calculado del servidor (`automation_runs.started_at`), no de una prop |
| `device` | **No** | chrome de prototipo; ver el párrafo inicial |
| `protoSwitch` | **No** | se borra junto con la píldora de prototipo |
| `filters`, `menuFor`, `quotaEdits`, `audit*`, `act*`, `saving`, `toast` | Sí | estado de interfaz normal; los filtros conviene serializarlos en la URL |

Props expuestas (Tweaks) para revisar estados sin backend:

| Prop | Valores | Efecto |
|---|---|---|
| `dataState` | `normal` · `cargando` · `vacio` · `error` | esqueletos, vacío por primera vez y error en Tablero y Oportunidades |
| `firstAccess` | boolean | tras el login fuerza el cambio de contraseña obligatorio |
| `digestOutcome` | `exito` · `fallo` · `limite` | desenlace del envío del resumen matutino en la PWA |

Reloj fijo del prototipo: `Component.NOW = 2026-09-04T09:42:00+02:00` (viernes 04/09/2026).
Al conectar datos reales hay que sustituirlo por `now()` del servidor.

### Rutas propuestas

Una sola tabla de rutas para los dos anchos. «Enlazable» significa que la URL, pegada en
frío, reconstruye la pantalla completa.

| Estado del prototipo | URL propuesta | Enlazable | Quién puede entrar |
|---|---|---|---|
| `screen='login'` | `/entrar` | Sí | anónimo (si hay sesión, redirige) |
| `screen='pw'` | `/entrar/contrasena` | Sí, pero **forzada**: guard que redirige aquí mientras `must_change_password = true`, sin salida | sesión con cambio pendiente |
| `view='board'` | `/` | Sí | vendedor · supervisor |
| `view='opps'` | `/oportunidades` + filtros en `?etapa=&estado=&atrasadas=&q=&vendedor=` | Sí (los filtros forman parte de la URL) | vendedor · supervisor (`vendedor=` solo supervisor) |
| `view='customer'` + `customerId` | `/clientes/[id]` | Sí (RLS decide si existe para quien pregunta) | propietario · supervisor |
| `view='team'` | `/equipo` | Sí | **solo supervisor** |
| `pwaView='detail'` + `pwaSeller` | `/equipo/[id]` | Sí | **solo supervisor** |
| `view='admin'`, `adminTab` | `/admin/usuarios` · `/admin/cuotas` · `/admin/auditoria` | Sí | **solo supervisor** |
| `modal=*` | estado local; opcional `?accion=nueva-actividad` etc. | No por defecto | según la acción |
| `sheet=*` | estado local de `/` en móvil | No (proceso, no destino) | solo supervisor |

Un vendedor que llegue a `/equipo`, `/equipo/[id]` o `/admin/*` recibe la pantalla de error de
permisos: *«No tienes permiso para ver esto.»*, sin botón de reintentar (brief §6.4).

---

## 2. Pantallas construidas y nombre exacto

No hay un archivo por pantalla: cada pantalla es una sección del mismo componente,
seleccionada por el estado de la columna «Selector». Al portar a Next.js/React, esa
columna es la ruta natural.

### Escritorio (1440 px de referencia, reflota por debajo)

| # | Pantalla | Archivo / componente | Selector | Datos que consume |
|---|---|---|---|---|
| 1 | Inicio de sesión | `CRM-123.dc.html` → `sc-if isLogin` | `screen='login'` | `auth`, `profiles.username` |
| 2 | Cambio de contraseña obligatorio | `sc-if isPwChange` | `screen='pw'` | `profiles.must_change_password` |
| 3 | Tablero del día | `sc-if viewBoard` | `view='board'` | `v_opportunity_board`, `v_seller_month_progress` |
| 4 | Oportunidades (tabla densa) | `sc-if viewOpps` | `view='opps'` | `v_opportunity_board`, `opportunities`, `customers` |
| 5 | Ficha de cliente | `sc-if viewCustomer` | `view='customer'` + `customerId` | `customers`, `opportunities`, `activities` |
| 6 | Panel del equipo | `sc-if viewTeam` | `view='team'` | `v_team_month_progress`, `v_seller_month_progress`, `v_loss_reasons_month` |
| 7 | Administración › Usuarios | `sc-if tabUsers` | `view='admin'`, `adminTab='usuarios'` | `profiles` |
| 8 | Administración › Cuotas | `sc-if tabQuotas` | `adminTab='cuotas'` | `quotas` |
| 9 | Administración › Auditoría | `sc-if tabAudit` | `adminTab='auditoria'` | `audit_log` |

### Ventanas de acción (un único diálogo genérico, `sc-if modalOpen`)

Todas se construyen desde el objeto `modal` que devuelve `renderVals()`; los campos se
declaran con los ayudantes `txt / sel / area / chips / reveal`.

| `state.modal` | Título en pantalla | Escritura prevista |
|---|---|---|
| `activity` | Registrar actividad | `insert into activities` |
| `newCustomer` | Nuevo cliente | `insert into customers` (+ comprobación de teléfono) |
| `newOpp` | Nueva oportunidad | `insert into opportunities` (`stage='new'`, `status='open'`) |
| `won` | Marcar como ganada | `update opportunities` → `won` + `final_amount` + `closed_at` |
| `lost` | Marcar como perdida | `update opportunities` → `lost` + `loss_reason` (+ `loss_note`) |
| `stage` | Cambiar etapa | `update opportunities.stage` |
| `reassign` | Reasignar cliente (supervisor) | `update customers.owner_id` (el trigger arrastra oportunidades) |
| `archive` | Archivar cliente (supervisor) | `update customers.is_archived/archived_at/archived_by` |
| `editCustomer` | Editar cliente | `update customers` |
| `newUser` / `editUser` | Nuevo / Editar usuario | alta por clave de servicio + `insert/update profiles` |
| `userCreated` | Usuario creado / Contraseña restablecida | pantalla de entrega de credenciales |

### PWA del supervisor (marco de 390 px)

| # | Pantalla | Componente | Selector |
|---|---|---|---|
| 10 | Panel | `sc-if pwaPanel` | `device='pwa'`, `pwaView='panel'` |
| 11 | Detalle de vendedor | `sc-if pwaDetail` | `pwaView='detail'` + `pwaSeller` |
| 12 | Hoja de envío del resumen (estados A–D) | `sc-if sheetOpen` | `sheet` |
| 13 | Aviso de límite (estado E) | `sc-if digestToast` | `digestToast` |
| 14 | Bloqueo de vendedor en la PWA | `sc-if pwaBlocked` | `device='pwa'` + rol vendedor |

### Matriz rol × pantalla

| Pantalla | Vendedor | Supervisor |
|---|---|---|
| Inicio de sesión | Sí | Sí |
| Cambio de contraseña obligatorio | Sí | Sí |
| Tablero del día | Sí | Sí (su propia cartera) |
| Oportunidades | Sí, solo las suyas · **sin** columna ni filtro «Vendedor» (no se dibujan) | Sí, todas · **con** columna y filtro «Vendedor» |
| Ficha de cliente | Solo sus clientes; sin ver el campo «Vendedor» | Todos; ve «Vendedor», «Reasignar» y «Archivar» / «Desarchivar» |
| Registrar actividad (formulario y modal) | Sí | Sí |
| Nuevo cliente · Nueva oportunidad · Ganada · Perdida · Cambiar etapa | Sí (sobre lo suyo) | Sí |
| Reasignar · Archivar cliente | **No existe** | Sí |
| Panel del equipo | **No** (§14.5: ningún ranking ni comparativa en la vista del vendedor) | Sí |
| Administración (Usuarios · Cuotas · Auditoría) | **No** | Sí |
| PWA · Panel del equipo | **No** — *«Esta aplicación es solo para supervisores. Entra desde el escritorio.»* | Sí |
| PWA · Detalle de vendedor | **No** | Sí (solo lectura) |
| PWA · Envío del resumen matutino | **No** | Sí |

La matriz es de interfaz; la frontera real la imponen las políticas RLS de
`SCRIPTS-SQL.md` §12. Nada que un rol no pueda hacer debe dibujarse deshabilitado: se omite.

**Chrome de prototipo que NO va a producción:** la píldora fija abajo a la derecha
(«PROTOTIPO · Escritorio / PWA / Vendedor / Supervisor», valor `protoSwitch`) y la línea
de credenciales de demostración del login («Prueba con pedro.ventas…»). Ambas se borran
al conectar autenticación real.

---

## 3. Valores visuales finales

Todos salen de `_ds/broadsheet-…/styles.css` vía `var(--*)`. Se listan los hexadecimales
para que no haya que abrir la hoja, pero **en código se usa la variable, no el hex**.

### Color

| Rol | Variable | Hex | Uso |
|---|---|---|---|
| Fondo de aplicación | `--color-bg` | `#f3f2f2` | lienzo de todas las pantallas |
| Superficie | — (literal) | `#fdfcfc` | barra lateral, tablas, tarjetas, diálogos, marco PWA |
| Tinta | `--color-text` | `#201e1d` | texto principal |
| Texto secundario | `--color-neutral-700` | `#605d5d` | etiquetas, metadatos ≥12,5 px |
| Texto secundario reforzado | `--color-neutral-800` | `#444141` | notas de 12 px (contraste AA) |
| Relleno neutro | `--color-neutral-200` | `#eae7e7` | etiquetas de etapa, avisos, prefijo `+34` |
| Cebra de tabla | `--color-neutral-100` | `#f8f4f4` | filas alternas, tarjeta de avance PWA |
| Bordes de control | `--color-neutral-400` | `#bab6b6` | `input`, `select`, botón secundario |
| Pista de progreso | `--color-neutral-300` | `#d7d3d3` | fondo de las barras |
| Deshabilitado | `--color-neutral-400/500` | `#bab6b6` / `#9b9797` | botón apagado, etapa «Cerrado» |
| Filete | `--color-divider` | `color-mix(#201e1d 16%)` | separación de filas |
| **Marca / acción** | `--color-accent` | `#0088b0` | botón principal, nav activa, barras, punto de foco |
| Marca · hover | `--color-accent-600` | `#1186ac` | hover del botón principal |
| Marca · texto | `--color-accent-700` | `#006786` | enlaces y botones de texto |
| Marca · tinte | `--color-accent-100` | `#e9f8ff` | nav activa, hover de fila, etapa activa |
| Marca · texto sobre tinte | `--color-accent-800` | `#004961` | etiqueta de nav activa |
| **Atraso (única alarma)** | `--color-accent-2` | `#d6006c` | punto de señal, filete de fila atrasada |
| Atraso · texto | `--color-accent-2-700` | `#aa0b56` | motivo del atraso, «Próxima acción» vencida |
| Atraso · tinte / texto | `--color-accent-2-100` / `-800` | `#fff1f4` / `#790e3d` | tarjeta de alerta PWA, aviso de duplicado |
| **Venta ganada** | `Component.WON_INK` | `#17714a` | «Ganada» en historial, requisitos cumplidos, «✓ Resúmenes enviados» |
| Superficie oscura de aviso | `--color-neutral-900/100` | `#2d2b2b` / `#f8f4f4` | toasts |

Reglas de color heredadas del brief y respetadas: la magenta de atraso **no aparece en
ningún otro sitio**; el verde solo en venta ganada; las cinco etapas son neutras
(`--color-neutral-200`), diferenciadas por peso, nunca por color.

### Tipografía

- Familia única: `var(--font-body)` / `var(--font-heading)` = **Source Serif 4** (300–700, con
  itálica real), cargada desde Google Fonts en `<helmet>`.
- Cifras: `font-variant-numeric: tabular-nums` en la raíz del componente e importes
  alineados a la derecha (sustituye a la sans de ancho fijo que pedía el brief).

| Papel | Tamaño / peso |
|---|---|
| H1 de pantalla | 26 px / 600 (ficha de cliente 27 px) |
| H2 de bloque prominente | 21 px / 600 |
| H2 de bloque secundario | 17 px / 600 |
| Cifra de resumen | 22 px / 600 · PWA avance 40 px / 600 |
| Cuerpo | 14 px / 400, `line-height 1.45` |
| Tabla densa | 13,5 px |
| Secundario | 12,5 px |
| Nota al pie | 12 px (color `--color-neutral-800`) |
| Cabecera de tabla y micro-rótulos | 11,5 px / 600, mayúsculas, `letter-spacing .05–.06em` |
| Selector de etapa | 11 px / `line-height 1.25` |

### Espaciado, medidas y forma

- Escala del sistema: `--space-1..8` = 5 / 10 / 15 / 20 / 30 / 40 px (densidad 1,25×).
- Radios: `--radius-sm` 1 px · `--radius-md` 2 px (por defecto) · `--radius-lg` 4 px (marco PWA, hoja inferior).
- Sombras: `--shadow-sm` (tarjetas), `--shadow-md` (menús, toasts), `--shadow-lg` (diálogos, marco PWA).
- Barra lateral: 240 px fija; sin barra superior; contenido con `padding 26px 30px 60px`.
- **Filas de tabla: 44 px exactas.** `min-width` de la tabla densa: 1040 px (vendedor) / 1220 px (supervisor, con la columna «Vendedor»), con `overflow-x: auto`.
- Filas del tablero: rejilla fija `minmax(0,1fr) 132px 96px` con áreas `"name stage amount" / "reason reason reason"`; bloque de nombre con `min-height: 36px` para que todas las filas midan igual (82 px).
- Selector de etapa: `grid-template-columns: repeat(5, minmax(0,1fr))`, celdas de misma altura.
- Ficha de cliente: `repeat(auto-fit, minmax(300px,1fr))`, `gap 44px` — dos columnas en ancho, una sola apilada en estrecho.
- Controles de escritorio: alto 34 px (filtros y edición en línea), 38 px (campos de diálogo y acción de cabecera), 40 px (botones de diálogo), 44 px (botón de login).
- PWA: objetivos de 48–56 px (botón de envío 52 px, filas del semáforo 56 px, navegación inferior 56 px).
- Movimiento: solo `transition: background 150ms`; dos `@keyframes` (`crmPulse` para esqueletos, `crmBar` para el progreso indeterminado). Nada más.

### Formatos (implementados en la clase lógica)

| Ayudante | Resultado |
|---|---|
| `eur(n)` / `eur(n,false)` | `1.250,00 €` / `1.250 €` (`useGrouping:'always'`) |
| `pct(n)` | `68,3 %`; sin cuota devuelve `—`, nunca `0 %` |
| `fdate` `fdm` `ftime` `fdmhm` | `04/09/2026`, `02/09`, `07:30`, `05/09 10:00` — todos con `Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid'})` |
| `frel(v)` | `Hoy` · `Ayer` · `Hace 3 días` |
| `fphone(p)` | `+34 612 345 678` |
| `threshold(stage)` | 3 días en `new`/`contacted`, 2 en `proposal_sent`/`negotiation` |
| `board(op)` | replica `v_opportunity_board`: `is_overdue`, `is_stale`, `needs_attention`, `is_due_today`, `days_without_activity` |

El aviso «Importes sin IVA» aparece **una vez por pantalla**, en 11,5–12,5 px y color secundario.

---

## 4. Sistema de diseño usado — no reinventar componentes

**No se ha usado shadcn/ui, ni Tailwind, ni ninguna librería de componentes.** El sistema
vinculado es **Broadsheet** (`_ds/broadsheet-affd264b-5f6a-467e-945a-5e9935e94c55/`), que se
carga así en `<helmet>`:

```html
<link rel="stylesheet" href="_ds/broadsheet-affd264b-5f6a-467e-945a-5e9935e94c55/styles.css">
<script src="_ds/broadsheet-affd264b-5f6a-467e-945a-5e9935e94c55/_ds_bundle.js"></script>
```

Los controles del prototipo son **elementos nativos con estilos en línea tomados de los
tokens** (el sistema exige estilos propios y prohíbe estructurar con cajas y filetes). No
hay componentes de Broadsheet montados con `<x-import>`: el CRM necesita densidad y estados
que sus clases de página no cubren.

Si se continúa con shadcn/ui, la equivalencia debe respetar los valores de arriba y estas
correspondencias, para no duplicar botones ni inventar variantes nuevas:

| Elemento del prototipo | Clase Broadsheet de referencia | Equivalente shadcn/ui |
|---|---|---|
| Botón principal (`#0088b0`, alto 38–44, radio 2 px) | `.btn .btn-primary` | `Button` variante `default` |
| Botón secundario (borde `#bab6b6`, fondo transparente) | `.btn .btn-secondary` | `Button` variante `outline` |
| Botón de texto (`#006786`, sin borde) | `.btn .btn-ghost` | `Button` variante `link` |
| Botón de tres puntos (28×28) | `.btn .btn-icon` | `Button` `variant="ghost" size="icon"` |
| Etiqueta de etapa / estado | `.tag .tag-neutral` | `Badge` variante `secondary` |
| Campos, `select`, `textarea` | `.field` + `.input` | `Input`, `Select`, `Textarea`, `Label` |
| Interruptor «Solo atrasadas» | casilla nativa `accent-color` | `Checkbox` (o `Switch`) |
| Selector de tipo de actividad y de etapa | `.seg` + `.seg-opt` | `ToggleGroup` (`type="single"`) |
| Tabla densa | `.table` | `Table` (con `TableHead` fijo) |
| Menú de tres puntos | — | `DropdownMenu` |
| Ventanas de acción | `.dialog-backdrop` + `.dialog` | `Dialog` (foco atrapado, cierre con `Esc`) |
| Hoja inferior de la PWA | — | `Drawer` / `Sheet` (`side="bottom"`, no cerrable en estado B) |
| Avisos breves | — | `Sonner` / `Toast` |
| Esqueletos de carga | — | `Skeleton` |
| Pestañas de Administración | — | `Tabs` |
| Barras de avance | — | `Progress` |

Reglas del sistema que hay que mantener al portar: **una sola familia serif** (nada de
sans para el chrome), foco de teclado `outline: 2px solid var(--color-accent); outline-offset: 2px`,
hover y pulsado desde la rampa del acento, sin degradados, sin esquinas grandes y sin
usar los dos acentos en el mismo componente.

Iconografía prevista por el sistema: **Phosphor icons, peso duotone**. El prototipo aún usa
iniciales de texto (`LL`, `WA`, `@`, `V`, `N`) en la línea de tiempo de actividades: al
integrar, sustituir por Phosphor (`phone`, `whatsapp-logo`, `envelope`, `storefront`, `note`).

---

## 5. Requisitos PWA

La aplicación se instala; no se construye una segunda aplicación. **El manifest y el service
worker aplican a toda la aplicación, no a un subconjunto de rutas: `scope` es la raíz del
sitio (`/`).** No hay un manifest «de móvil» ni un service worker registrado solo bajo las
rutas del supervisor — se instala el CRM completo y cualquier ruta (`/oportunidades`,
`/clientes/[id]`, `/admin/*`) queda dentro del alcance, tanto en escritorio como en móvil.
Requisitos mínimos:

### Manifest (`/manifest.webmanifest`)

| Campo | Valor |
|---|---|
| `name` | `CRM-123` |
| `short_name` | `CRM-123` |
| `description` | `Gestión comercial de calzado y moda` |
| `lang` / `dir` | `es-ES` / `ltr` |
| `start_url` | `/` (con `?source=pwa` si se quiere medir la instalación) |
| `scope` | `/` — toda la aplicación, no solo las rutas del subconjunto móvil |
| `display` | `standalone` |
| `orientation` | `portrait` |
| `theme_color` | `#0088b0` (= `--color-accent`) |
| `background_color` | `#f3f2f2` (= `--color-bg`) |
| `icons` | 192×192, 512×512 y 512×512 `maskable`, PNG, marca CRM-123 en `--color-accent` sobre `--color-bg`; más `apple-touch-icon` 180×180 |

En el documento: `<meta name="theme-color" content="#0088b0">` y `viewport` con
`viewport-fit=cover`; los elementos fijos de la PWA (botón de envío y navegación inferior)
respetan `env(safe-area-inset-bottom)`.

### Service worker

- **Alcance:** `/` (raíz del sitio), un solo registro para toda la aplicación — servido desde la raíz para que su `scope` no quede limitado a una subcarpeta.
- **Precache (app shell):** documento de `/`, JS/CSS de la aplicación, la hoja de tokens de Broadsheet, las fuentes Source Serif 4 (auto-alojadas, no desde Google Fonts, para que el modo instalado no dependa de terceros) y los iconos.
- **Estrategia:** *stale-while-revalidate* para el shell y los estáticos; **network-only** para todo lo que sea datos del CRM y para cualquier escritura. Nunca se cachean respuestas de `customers`, `opportunities`, `activities`, `profiles` ni `audit_log`: son datos aislados por RLS y no deben quedar en disco de un dispositivo compartido.
- **Al cerrar sesión:** borrar cachés de datos y desregistrar suscripciones push.

### Qué debe funcionar sin conexión

- **Sí:** que la aplicación abra y pinte su marco (cabecera, navegación inferior, tipografía y color correctos) en lugar del error del navegador, con un aviso propio: *«Sin conexión. Vuelve a intentarlo cuando tengas cobertura.»* y **[ Reintentar ]** (reutiliza el estado de error del brief §6.4).
- **Sí:** la última vista del Panel puede mostrarse desde memoria durante la sesión en curso, siempre marcada con la hora del último dato.
- **No:** nada de escritura sin conexión, ni cola de reintentos, ni caché persistente de cifras del equipo. El brief define la PWA como consulta rápida y un solo botón de acción; el disparo del resumen exige respuesta del servidor (`automation_runs` + límite de 10 minutos) y sin red se deshabilita con el motivo visible.

### Notificaciones push

**No se usan push en esta versión.** El resumen matutino se entrega por **correo** (`profiles.email`, `settings.morning_digest`, disparo programado a las 07:30 o manual desde la PWA); el botón de la PWA dispara el envío de correos, no una notificación. No se pide permiso de notificaciones en ningún momento — pedirlo sin usarlo es un coste de confianza sin retorno. Si más adelante se quisiera avisar al supervisor de que el envío terminó, la vía correcta es push con `web-push` sobre el mismo service worker, y sería una decisión de producto nueva.

---

## 6. Dónde se apartó del brief y por qué

| Punto del brief | Lo entregado | Motivo |
|---|---|---|
| §12 «Una sola familia, sin serifas» | Source Serif 4 (serif) en toda la interfaz | El sistema de diseño Broadsheet está vinculado al proyecto y es vinculante: prohíbe introducir una sans para el chrome. **Decisión pendiente del cliente:** si prefiere la sans del brief, se cambian `--font-body/--font-heading` en un solo sitio. |
| §12 «Importes en cifras de ancho fijo» | Serif con `tabular-nums` + alineación a la derecha | Cumple el objetivo real (columnas de importes alineadas) sin añadir una segunda familia. |
| §12 «Rojo o ámbar reservado al atraso» | Magenta de imprenta `#d6006c` / texto `#aa0b56` | Es el segundo acento del sistema y no se usa en ningún otro elemento, así que conserva la regla («una sola alarma»). No se inventó un rojo ajeno a la paleta. |
| §12 «Verde solo para venta ganada» | `#17714a`, único hex fuera del sistema | Broadsheet no tiene un verde; se añadió una sola tinta, exclusiva de la venta ganada. Documentada como `Component.WON_INK`. |
| §3 «Anchura base 1440 px, mínimo 1280 px» | El escritorio reflota por debajo de 1280 px (tablas con desplazamiento horizontal, ficha a una columna) | El panel de vista previa del usuario es más estrecho; la maqueta no debe romperse. Las densidades y los 44 px de fila se conservan. |
| Iconografía | Iniciales de texto en el historial de actividades | Faltaba integrar Phosphor; ver §4. |
| PWA, navegación inferior «Panel · Equipo» | Los dos elementos existen; «Equipo» aún devuelve al Panel | El brief no define una pantalla «Equipo» distinta del semáforo del Panel. **Pregunta abierta al cliente.** |
| Añadido no pedido | Píldora «PROTOTIPO» y credenciales de demostración en el login | Solo para revisar roles, dispositivos y estados sin backend. Se elimina en producción. |

### Valores por defecto si el cliente no responde antes de empezar

Code Web **no espera**: aplica estos valores y sigue. El coste es el de cambiar de opinión después.

| Pregunta abierta | Valor por defecto a aplicar | Coste de cambiarlo más tarde |
|---|---|---|
| ¿Serif de Broadsheet o sans del brief? | **Serif** (Source Serif 4), como está entregado | Bajo: dos variables de fuente en un sitio + revisar altura de fila de 44 px y los micro-rótulos de 11,5 px. Menos de medio día si la tipografía se consume por token; alto si alguien mete tamaños a mano por el camino. |
| ¿«Equipo» en la PWA es una pantalla propia? | **No**: el semáforo del Panel es la vista de equipo; el elemento inferior «Equipo» ancla al semáforo del Panel (`/#semaforo`) y `/equipo/[id]` sigue siendo el detalle | Bajo mientras la ruta `/equipo` exista ya en el escritorio: sería reutilizarla con densidad móvil. Un día. |
| ¿El teléfono del cliente es editable? | **No**: es el identificador único (`customers_phone_uk`); se corrige creando el cliente correcto y archivando el erróneo | Medio-alto: exige endpoint de cambio con comprobación de unicidad, asiento `customer.updated` y una decisión sobre el historial. Dos o tres días. |
| ¿Iconografía definitiva? | **Phosphor duotone**, sustituyendo las iniciales de texto del historial | Bajo: un mapa de cinco iconos (`activity_type`). Horas. |
| ¿Ancho mínimo real del escritorio? | **Reflota por debajo de 1280 px** (tabla con desplazamiento horizontal, ficha a una columna), manteniendo los 44 px de fila | Bajo si se conserva la rejilla de pistas fijas; alto si alguien vuelve a anchos en porcentaje. |
| ¿Se queda algo del chrome de prototipo? | **Nada**: se borran la píldora «PROTOTIPO» y las credenciales de demostración del login en el primer commit | Nulo ahora; alto si llega a producción (expone credenciales y conmutación de rol en cliente). |

Nada del vocabulario obligatorio se ha alterado: etapas, estados, motivos de pérdida,
canales, tipos de actividad y roles usan las etiquetas exactas del brief, y no aparece en
ninguna pantalla «eliminar», «borrar», «suprimir», ni papelera, ni icono de papelera, ni
campos de identificador fiscal, ni ranking entre compañeros, ni la columna/filtro
«Vendedor» en la vista del vendedor.

---

## 7. Qué quedó como maqueta: lo que falta conectar

**Todo el prototipo funciona sobre estado en memoria** (`Component.seed()`): no hay Supabase,
ni sesión, ni RLS, ni n8n. Las interacciones mutan arrays locales y se pierden al recargar.

### Sin backend (bloque principal)

1. **Autenticación.** El login acepta cualquier usuario con la contraseña `Demo1234!`. Falta Supabase Auth, el bloqueo temporal por intentos («Demasiados intentos…», hoy solo diseñado) y que el mensaje de error siga siendo idéntico para usuario inexistente, contraseña errónea y cuenta desactivada.
   *Aceptación:* con usuario inexistente, contraseña errónea y cuenta desactivada la respuesta es byte a byte *«Usuario o contraseña incorrectos.»*, la contraseña escrita no se borra, y al sexto intento aparece el aviso de bloqueo.
2. **Cambio de contraseña obligatorio.** Valida en vivo, pero no escribe: falta `update profiles.must_change_password = false` + cambio real de credencial y el asiento `audit_log 'user.password_changed'`.
   *Aceptación:* un usuario nuevo no alcanza ninguna otra ruta hasta guardar; tras guardar, `must_change_password = false`, existe la fila en `audit_log` y volver a `/entrar/contrasena` redirige al tablero.
3. **Rol y aislamiento.** El rol se cambia con el conmutador del prototipo; en producción se lee de `profiles` (`app_current_role()`) y el aislamiento entre vendedores lo impone RLS, no el cliente. Todo el filtrado por `owner_id` que hoy hace el navegador debe desaparecer en favor de las políticas.
   *Aceptación:* con la sesión de un vendedor, `select` directo sobre `customers` devuelve solo su cartera y `/equipo` responde la pantalla de permisos — sin que el cliente filtre nada (comprobaciones C16, C17 y C20).
4. **Auditoría.** Ninguna acción escribe en `audit_log`; la tabla de Auditoría muestra 8 filas de ejemplo. Faltan las 14 acciones permitidas por `audit_log_action_allowed`.
   *Aceptación:* cada una de las 14 acciones deja exactamente una fila con `actor_id = auth.uid()`, y la pestaña Auditoría la muestra sin recargar la página.
5. **Resumen matutino.** La hoja simula el proceso con `setTimeout` y el desenlace lo decide la prop `digestOutcome`. Falta `POST /api/n8n/*`, la fila en `automation_runs`, el «Último envío» leído de esa tabla y el **límite real de 10 minutos** (`settings.morning_digest.manual_cooldown_minutes`), hoy fingido por la prop.
   *Aceptación:* el disparo crea una fila `automation_runs` (`trigger_type='manual'`, `triggered_by` no nulo) que pasa a `success` con `emails_sent = número de vendedores activos`, el pie muestra esa hora y ese recuento, y un segundo disparo antes de los 10 minutos no abre la hoja y anuncia la hora exacta de reapertura.
6. **Agregados del equipo.** `v1` y `v2` se calculan de verdad a partir de los datos de ejemplo; los vendedores `v3`–`v10` llevan cifras sembradas en el perfil (`closed`, `won`, `overdue`), y el bloque «Motivos de pérdida del mes» está **codificado a mano**. Sustituir por `v_seller_month_progress`, `v_team_month_progress` y `v_loss_reasons_month`.
   *Aceptación:* ninguna cifra de Equipo ni de la PWA procede de literales; los totales cuadran con las vistas y los vendedores desactivados no aparecen ni suman.
7. **Reloj.** `Component.NOW` está congelado en `04/09/2026 09:42`. El cálculo de atraso, «Para hoy» y el mes en curso deben pasar a la hora del servidor en `Europe/Madrid`.
   *Aceptación:* con el navegador en otra zona horaria, «Para hoy», las horas de próxima acción y los días sin actividad coinciden con lo que devuelve `v_opportunity_board`.

### Interacciones a medias

8. **Teléfono duplicado.** La comprobación es local contra el array de clientes. Debe ser un endpoint que responda **solo** «existe / es tuyo / es de otro» — sin nombre, empresa ni propietario (frontera de aislamiento del brief §14.6).
   *Aceptación:* la respuesta del endpoint inspeccionada en red no contiene ningún dato del cliente ajeno, y «Crear cliente» queda deshabilitado con el aviso exacto del brief.
9. **Ordenación de columnas.** Las cabeceras de la tabla densa están marcadas como ordenables en el brief pero **no son pulsables** todavía.
   *Aceptación:* las siete columnas ordenables ordenan en servidor en ambos sentidos, con indicador visible y el criterio reflejado en la URL.
10. **Paginación.** El pie dice «50 por página» pero muestra siempre el conjunto completo: falta paginar de 50 en 50.
    *Aceptación:* con más de 50 resultados se piden 50 filas por página, el pie declara el rango real y la página viaja en la URL.
11. **Campos de fecha y hora en diálogos.** En «Registrar actividad» (modal), «Nueva oportunidad» y en los filtros de fecha de Auditoría son `input` de texto o no filtran; en la ficha sí son `datetime-local` reales. Unificar en un selector de fecha y hora (formato `dd/mm/aaaa hh:mm`, 24 h).
    *Aceptación:* el mismo control en las cuatro ubicaciones, con teclado, formato `dd/mm/aaaa hh:mm` y almacenamiento en UTC desde `Europe/Madrid`.
12. **Filtros de Auditoría.** Solo funcionan «Entidad» y «Usuario»; el rango de fechas no filtra.
    *Aceptación:* el rango filtra en servidor por `created_at` en horario de Madrid, incluyendo ambos extremos.
13. **Cuotas.** El selector de mes y año no recarga datos (siempre edita el mes en curso) y «Guardar cambios» escribe en memoria; falta `upsert quotas` por `(profile_id, period_year, period_month)` y el asiento `quota.changed`.
    *Aceptación:* cambiar de mes recarga las metas de ese periodo, guardar hace `upsert` sin duplicar filas (ínice `quotas_profile_period_uk`) y deja un asiento por meta modificada.
14. **Usuarios.** «Restablecer contraseña» y «Generar contraseña» devuelven la cadena fija `Kx7-tela-9RM`; el alta no crea el usuario en `auth.users` (requiere clave de servicio en el servidor, nunca en el cliente).
    *Aceptación:* la contraseña se genera en el servidor, se muestra una única vez, el usuario nace con `must_change_password = true`, y la clave de servicio no aparece en ningún bundle de cliente.
15. **Copiar al portapapeles.** «Copiar teléfono», «Copiar» de usuario y contraseña solo muestran un aviso; falta la llamada real al portapapeles.
    *Aceptación:* el valor queda en el portapapeles del sistema y el aviso solo aparece si la escritura tuvo éxito.
16. **Estados de carga y error.** Hoy los gobierna la prop `dataState`; deben derivarse de la petición real (esqueletos con la forma del contenido ya están construidos, incluido el error de permisos sin botón de reintentar, que **todavía no está diseñado como caso aparte**).
    *Aceptación:* cada pantalla con datos recorre sus cinco estados desde la petición real — esqueleto con la forma del contenido, vacío por primera vez, vacío tras filtrar, error con «Reintentar» y error de permisos sin «Reintentar» — y la prop `dataState` desaparece.
17. **Editar cliente.** El diálogo escribe nombre, empresa y canal en memoria; el teléfono no es editable por diseño (es el identificador único) — confirmar que esa decisión se mantiene (valor por defecto en §6).
    *Aceptación:* guardar persiste los tres campos con su asiento `customer.updated`, y el campo de teléfono no es editable en ninguna ruta.
18. **Accesibilidad pendiente.** El foco visible, las etiquetas visibles y el orden de tabulación están resueltos; falta **atrapar el foco en los diálogos y cerrarlos con `Esc`** (salvo la hoja en estado «corriendo»), y anunciar los errores de validación con `aria-describedby` + `role="alert"` asociados a su campo.
    *Aceptación:* con solo teclado se abre, recorre y cierra cada diálogo, el foco vuelve al disparador, la hoja en estado «corriendo» ignora `Esc`, y un lector de pantalla anuncia cada error junto a su campo.

### Reglas de datos que el cliente NO debe reimplementar

Ya viven en la base y el frontend solo las refleja: una sola oportunidad abierta por cliente
(`opportunities_one_open_per_customer_uk` — de ahí que «+ Nueva oportunidad» no exista cuando
hay una abierta), teléfono único en todo el sistema (`customers_phone_uk`), coherencia de
cierre (`opportunities_won_coherent` / `_lost_coherent`), inmutabilidad de `activities` y
`audit_log` (sin `update` ni `delete` para nadie — por eso el historial no tiene acciones) y
`last_activity_at` mantenido por el disparador `activities_sync`.
