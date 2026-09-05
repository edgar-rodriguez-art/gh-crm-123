# BUILD_PLAN.md — CRM-123

**Plan de construcción en 4 hitos.**

| Hito | Quién lo ejecuta | Dónde | Qué produce |
|---|---|---|---|
| **1** | Claude.ai Chat + conector MCP de Supabase | Otra conversación | La base de datos creada y verificada |
| **2** | Claude Code Web | Rama `gh-crm-123` | Ingreso, navegación y tablero vacío, desplegado |
| **3** | Claude Code Web | Rama `gh-crm-123` | El núcleo comercial diario |
| **4** | Claude Code Web | Rama `gh-crm-123` | Supervisión y el resumen matutino |

> **Regla que rige todo el plan:** **ningún hito avanza al siguiente sin confirmación
> explícita del humano.** Al terminar cada hito se entrega el procedimiento, se listan las
> variables y se espera. No se empieza el siguiente porque «ya está todo listo».

---

## 0. Antes de empezar — Las cuentas

Antes del Hito 1, el humano debe tener creadas y a mano estas cuatro cuentas. Ninguna
requiere pago para empezar.

| Servicio | Para qué | Dónde |
|---|---|---|
| **Supabase** | Base de datos y sesión | supabase.com |
| **GitHub** | Guardar el código | github.com |
| **Vercel** | Publicar las aplicaciones | vercel.com |
| **n8n cloud** | El resumen matutino | n8n.io |
| **Resend** | Enviar los correos | resend.com |

En Supabase, el proyecto debe llamarse **`dbcrm123`** y hay que **apuntar la contraseña de
la base de datos**, que solo se muestra al crearlo.

En Resend hay que **verificar un dominio** de correo. Si no hay dominio propio, Resend
permite enviar desde un remitente de pruebas, suficiente para los tres primeros hitos.

---

## 1. HITO 1 — La base de datos

**Quién:** Claude.ai Chat, en **otra conversación**, con el conector MCP de Supabase.
**Qué construye:** la base de datos completa, verificada. **Nada de interfaz.**

### 1.1 Qué debe llevar el humano a esa conversación

Los tres documentos, en este orden de importancia:

1. **`SCRIPTS-SQL.md`** — la estructura oficial y las 24 comprobaciones. **Es el documento central de este hito.**
2. **`CLAUDE.md`** — las diez reglas innegociables.
3. **`TECHNICAL_SPEC.md`** — el contexto de para qué sirve cada tabla.

### 1.2 Instrucción exacta para esa conversación

> Tienes el conector MCP de Supabase conectado al proyecto `dbcrm123`.
>
> Te adjunto tres documentos. **`SCRIPTS-SQL.md` es la estructura oficial e inmutable**:
> no cambies ni un nombre de tabla, columna, tipo, valor de enumeración, índice o política.
> Si algo te parece mejorable, dímelo pero **no lo cambies**.
>
> Tu tarea tiene tres partes:
>
> **Parte A — Crear.** Ejecuta los Scripts 01 a 10 en el orden de la sección 18, uno a uno.
> Después de cada script confirma que terminó sin error antes de pasar al siguiente. Si uno
> falla, para, explícame el error en lenguaje sencillo y no sigas.
>
> **Parte B — Verificar la estructura.** Ejecuta las comprobaciones C1 a C12, C23 y C24 de la
> sección 17. Para cada una dime: el nombre, el resultado esperado, el resultado real y si
> pasa o falla. **Si alguna falla, para y explícame qué está mal.** Las comprobaciones C3,
> C4, C5, C6, C7 y C8 son innegociables: si alguna de esas falla, la base de datos no sirve.
>
> **Parte C — Verificar el comportamiento.** Ejecuta el Script 11 (datos de ejemplo) y luego
> las comprobaciones C13 a C22. Estas prueban que las reglas de seguridad funcionan de
> verdad: que un vendedor no puede ver los clientes de otro, que no puede robarle un cliente,
> que nadie puede alterar el historial y que el supervisor lo ve todo. Para las pruebas que
> exigen estar autenticado como un usuario concreto, dime exactamente cómo hacerlo.
>
> Al final, dame una tabla con las 24 comprobaciones y su resultado. **Si las 24 pasan, la
> base de datos está lista. Si alguna falla, no lo está.**

### 1.3 Variables de entorno de este hito

**Ninguna.** El conector MCP se autentica solo. Pero al terminar hay que **recoger tres
valores** que harán falta desde el Hito 2:

| Valor | Dónde se obtiene |
|---|---|
| **Project URL** | Supabase → Settings → API → *Project URL*. Empieza por `https://` y acaba en `.supabase.co` |
| **anon public key** | Supabase → Settings → API → *Project API keys* → `anon` `public` |
| **service_role key** | Supabase → Settings → API → *Project API keys* → `service_role` → botón *Reveal* |

> **Aviso sobre la `service_role`:** esta clave se salta todas las reglas de seguridad de la
> base de datos. Quien la tenga puede leer y escribir cualquier cosa. **Nunca se pega en un
> chat, ni en un documento compartido, ni en el código.** Solo se pega en Vercel, en el
> apartado de variables de entorno.

### 1.4 Cierre del hito

**No se avanza al Hito 2 hasta que:**

- [ ] Los scripts 01 a 10 se ejecutaron sin error.
- [ ] Las 24 comprobaciones pasan.
- [ ] Los datos de ejemplo están cargados y las pruebas de aislamiento (C16 a C21) demostraron que un vendedor no ve lo de otro.
- [ ] Los tres valores de Supabase están recogidos y guardados en un sitio seguro.
- [ ] **El humano lo ha confirmado explícitamente.**

---

## 2. HITO 2 — Entrar y desplegar

**Quién:** Claude Code Web, rama `gh-crm-123`.
**Documentos que debe leer:** `CLAUDE.md` y `TECHNICAL_SPEC.md`.

**Qué construye:** el proyecto, **solo el ingreso**, el armazón de navegación y el tablero
del día vacío.

### 2.1 Variables de entorno — **se avisa AL INICIO del hito**

Antes de escribir una línea de código, Claude Code Web debe:
1. Listar estas variables.
2. Explicar dónde se obtiene cada valor.
3. **Verificar que están configuradas** leyendo `lib/env.ts` al arrancar.
4. Si falta alguna, **avisarlo al humano al final del hito, antes de las pruebas**.

| Variable | Valor | Dónde se obtiene |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cadena larga | Supabase → Settings → API → `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Cadena larga | Supabase → Settings → API → `service_role` → *Reveal* |
| `APP_BASE_URL` | `https://crm-123-web.vercel.app` | La URL que Vercel asigna tras el primer despliegue |
| `APP_TIMEZONE` | `Europe/Madrid` | Se escribe tal cual |
| `APP_LOCALE` | `es-ES` | Se escribe tal cual |
| `APP_CURRENCY` | `EUR` | Se escribe tal cual |

`N8N_SHARED_SECRET` y `N8N_WEBHOOK_MORNING_DIGEST_URL` **no hacen falta todavía**. Se piden
en el Hito 4. Para que la aplicación arranque en este hito, `lib/env.ts` las marca como
opcionales hasta entonces.

> **Nota sobre `APP_BASE_URL`:** es circular — hace falta desplegar para conocer la URL, y la
> URL hace falta para configurar. Se resuelve así: se despliega sin ella, Vercel asigna la
> URL, se pega y se vuelve a desplegar. Es normal y solo pasa una vez.

### 2.2 Qué se construye

**Estructura**
- Repositorio en GitHub, rama `gh-crm-123`, con las carpetas `/web` y `/pwa`.
- Next.js con App Router y TypeScript estricto en ambas.
- Tailwind y shadcn/ui instalados y configurados con el sistema de diseño de Claude Design.
- `types/database.ts` generado desde la base real con `supabase gen types typescript`.
- `lib/env.ts` que valida las variables al arrancar y **no deja arrancar si falta una**.
- Los tres clientes de Supabase, con `admin.ts` marcado `import 'server-only'`.

**Ingreso (`/web`)**
- Pantalla de inicio de sesión según `DESIGN_BRIEF.md` §8.1.
- `POST /api/auth/login`: traduce usuario a email con la clave de servicio, inicia sesión.
- Error idéntico para los tres casos de fallo.
- Límite de 10 intentos cada 15 minutos por IP.
- Pantalla de cambio de contraseña obligatorio (§8.2), impuesta por el middleware.
- `POST /api/auth/logout`.

**Armazón**
- Barra lateral de 240 px con la navegación, distinta para vendedor y supervisor.
- Middleware con las cinco reglas de rutas de `TECHNICAL_SPEC.md` §6.
- El rol se lee de `profiles` en cada petición.

**Tablero del día, vacío**
- Los tres bloques dibujados con su estructura real, en su **estado vacío**.
- Los cinco estados globales implementados como componentes reutilizables.
- Ninguna consulta de datos todavía, más allá del perfil del usuario.

**PWA (`/pwa`)**
- Proyecto creado, `manifest.json`, iconos, instalable.
- Inicio de sesión con rechazo de vendedores.
- Panel vacío.

### 2.3 Procedimiento de despliegue

**Paso 1 — GitHub.** El código se guarda en la rama `gh-crm-123`.

**Paso 2 — Crear el proyecto web en Vercel.**
1. vercel.com → *Add New* → *Project* → importar el repositorio.
2. **Root Directory:** `web`. *(Este paso es el que más se olvida.)*
3. **Production Branch:** `gh-crm-123`.
4. Framework: Next.js (se detecta solo).
5. *Deploy*.

**Paso 3 — Crear el proyecto PWA en Vercel.** Igual, pero con **Root Directory: `pwa`**. Es
un segundo proyecto sobre el mismo repositorio.

**Paso 4 — Variables.** En **cada uno** de los dos proyectos: *Settings* → *Environment
Variables* → añadir las siete de §2.1, marcando *Production*, *Preview* y *Development*.

**Paso 5 — Volver a desplegar.** Las variables no se aplican al despliegue anterior.
*Deployments* → el último → menú de tres puntos → *Redeploy*.

**Paso 6 — Poner `APP_BASE_URL`.** Copiar la URL que asignó Vercel, pegarla en la variable y
volver a desplegar una vez más.

### 2.4 Variables que el humano debe actualizar

**Se avisa al final del hito, antes de las pruebas:**

- [ ] `APP_BASE_URL` en el proyecto web, con su URL real de Vercel.
- [ ] `APP_BASE_URL` en el proyecto PWA, con su URL real de Vercel.

### 2.5 Pruebas de funcionalidad

| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | Abrir la URL sin sesión | Redirige a `/login` |
| 2 | Entrar con `demo.vendedor1` / `Demo1234!` | Entra al tablero vacío |
| 3 | Contraseña incorrecta | *«Usuario o contraseña incorrectos.»* |
| 4 | Usuario que no existe | **El mismo mensaje exacto** |
| 5 | Crear un usuario de prueba y entrar por primera vez | Fuerza el cambio de contraseña |
| 6 | Con la contraseña sin cambiar, escribir `/tablero` en la barra del navegador | Devuelve al cambio de contraseña |
| 7 | Entrar como `demo.supervisor` | La barra lateral muestra *Equipo* y *Administración* |
| 8 | Entrar como vendedor | La barra lateral **no** muestra esas dos secciones |
| 9 | Como vendedor, escribir `/admin/usuarios` a mano | Deniega el acceso |
| 10 | Cerrar sesión | Vuelve a `/login` |
| 11 | Abrir la PWA en el móvil e intentar entrar como vendedor | Rechaza con el mensaje de solo supervisores |
| 12 | Instalar la PWA desde el navegador móvil | Se instala con su icono |
| 13 | Ver el código fuente de la página en el navegador y buscar la clave `service_role` | **No aparece** |

### 2.6 Cierre del hito

- [ ] Las 13 pruebas pasan.
- [ ] Los dos proyectos están desplegados en Vercel.
- [ ] La clave de servicio no aparece en el código del navegador.
- [ ] **El humano lo ha confirmado explícitamente.**

---

## 3. HITO 3 — Núcleo comercial

**Quién:** Claude Code Web.
**Documentos:** `CLAUDE.md` y `TECHNICAL_SPEC.md`.

**Qué construye:** todo lo que un vendedor usa cada día, **añadido a lo que ya existe**.

### 3.1 Variables de entorno — **se avisa AL INICIO del hito**

**Las mismas siete del Hito 2. Ninguna nueva.** Claude Code Web debe igualmente listarlas al
inicio y verificar que siguen configuradas antes de empezar.

### 3.2 Qué se construye

**Clientes**
- Ventana de nuevo cliente con los cuatro campos.
- Normalización del teléfono a `+34XXXXXXXXX`.
- `POST /api/customers/check-phone` con el **aviso ciego**: se avisa de que existe, no se revela nada más.
- Ficha de cliente completa según `DESIGN_BRIEF.md` §8.5.
- Edición de nombre, empresa y canal.

**Oportunidades**
- Crear, con el bloqueo de una sola abierta por cliente. El botón **no aparece** si ya hay una.
- Selector visual de las cinco etapas.
- Cierre como ganada, con confirmación del importe final.
- Cierre como perdida, con motivo obligatorio de los siete valores.
- Historial de oportunidades cerradas en la ficha del cliente.

**Actividades**
- Formulario de registro con los cinco tipos.
- Campo opcional de próxima acción.
- Línea de tiempo, más reciente primero.
- **Sin botones de editar ni archivar.** No existen en el código.

**Tablero del día, con datos**
- Los tres bloques leyendo de `v_opportunity_board` y `v_seller_month_progress`.
- La ventana de registro de actividad **abierta desde el tablero, sin navegar** (flujo F1 del brief).
- Bloque «Mi mes» con las cuatro cifras y la barra.

**Tabla densa**
- Las nueve columnas de `DESIGN_BRIEF.md` §8.4.
- Filtros, orden, búsqueda y paginación de 50 en 50.
- La columna y el filtro de Vendedor **solo se dibujan para el supervisor**.

**Auditoría**
- Se escribe en `audit_log` en los eventos de cliente, oportunidad y actividad.

### 3.3 Procedimiento de despliegue

**Paso 1.** Confirmar los cambios en la rama `gh-crm-123`.
**Paso 2.** Vercel despliega solo al detectar el envío. Si no, *Redeploy* manual.
**Paso 3.** Comprobar que el despliegue terminó en verde.
**Paso 4.** Si se añadió alguna columna a `types/database.ts`, regenerarlo antes de enviar.

**No hay variables nuevas que crear en Vercel en este hito.**

### 3.4 Pruebas de funcionalidad

| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | Crear un cliente con `612345678` | Lo guarda como `+34612345678` |
| 2 | Crear otro cliente con el mismo teléfono, siendo **otro vendedor** | *«Este cliente ya existe en el sistema y lo lleva otro compañero.»* **Sin nombre, sin empresa, sin propietario** |
| 3 | Crear un cliente con el teléfono de uno propio | *«Ya tienes a este cliente registrado.»* con enlace a la ficha |
| 4 | Teléfono inválido (`12345`) | Lo rechaza con mensaje claro |
| 5 | Crear una oportunidad | Nace en etapa Nuevo |
| 6 | Intentar crear una segunda para el mismo cliente | **El botón no existe** |
| 7 | Registrar una actividad | Aparece en la línea de tiempo, y la oportunidad sale de «Atrasadas» |
| 8 | Buscar un botón de editar o archivar en una actividad | **No existe ninguno** |
| 9 | Marcar como ganada | Pide el importe final, precargado con el estimado |
| 10 | Ganar por `1.180 €` con `1.250 €` estimados | El bloque «Mi mes» suma **1.180 €** |
| 11 | Marcar como perdida sin elegir motivo | El botón de confirmar está apagado |
| 12 | Perder con motivo *Cancelación* | Se cierra y pasa al historial |
| 13 | Buscar un botón para reabrir una oportunidad cerrada | **No existe** |
| 14 | Como vendedor 1, buscar en la tabla un cliente del vendedor 2 | No aparece |
| 15 | Como vendedor, buscar la columna o el filtro «Vendedor» | **No se dibujan** |
| 16 | Como supervisor, abrir la tabla | Aparecen la columna y el filtro |
| 17 | Buscar la palabra «eliminar» o «borrar» en toda la interfaz | **No aparece en ningún sitio** |
| 18 | Dejar una oportunidad en Propuesta sin actividad 2 días | Aparece en «Atrasadas» con `2 días sin actividad` |
| 19 | Poner una próxima acción de ayer | Aparece en «Atrasadas» con `Acción vencida el ...` |
| 20 | Como supervisor, reasignar un cliente | Se traspasan también sus oportunidades |
| 21 | Como vendedor, buscar el botón de reasignar | No existe |
| 22 | Como supervisor, revisar la auditoría | Están registradas las acciones de las pruebas anteriores |

### 3.5 Cierre del hito

- [ ] Las 22 pruebas pasan.
- [ ] La prueba 2 confirma que el aislamiento no se rompe.
- [ ] La prueba 17 confirma que la palabra prohibida no aparece.
- [ ] **El humano lo ha confirmado explícitamente.**

---

## 4. HITO 4 — Supervisión y el resumen matutino

**Quién:** Claude Code Web.
**Documentos:** `CLAUDE.md` y `TECHNICAL_SPEC.md`.

**Qué construye:** el panel del equipo, la administración, y el flujo de n8n en JSON listo
para importar.

### 4.1 Variables de entorno — **se avisa AL INICIO del hito**

Este es el hito que **sí trae variables nuevas**. Se avisan antes de empezar.

#### Nuevas en Vercel, en **los dos proyectos**

| Variable | Cómo se obtiene su valor |
|---|---|
| `N8N_SHARED_SECRET` | **Se genera.** Ver §4.2 |
| `N8N_WEBHOOK_MORNING_DIGEST_URL` | Se obtiene de n8n tras crear el flujo. Ver §4.3 |

#### Nuevas en n8n

| Variable | Cómo se obtiene su valor |
|---|---|
| `N8N_SHARED_SECRET` | **El mismo valor exacto** que se puso en Vercel |
| `APP_BASE_URL` | La URL del proyecto web en Vercel, sin barra al final |
| `RESEND_API_KEY` | resend.com → *API Keys* → *Create API Key* |
| `RESEND_FROM` | El remitente del dominio verificado en Resend, p. ej. `crm123@tudominio.com` |

### 4.2 El secreto compartido, paso a paso

El secreto une la aplicación con n8n. Es el mismo valor en dos sitios, y **solo en esos dos**.

**Paso 1 — Generarlo.** Abre un terminal y ejecuta:

```bash
openssl rand -hex 32
```

Sale una línea de 64 caracteres, algo así:

```
7f3a9c2e1b8d4056a2e7f1c3b9d8e5a4f6c2b1d9e8a7f3c5b2d1e9a8f7c3b5d2
```

*(Si no tienes terminal: en Windows, PowerShell sirve con
`-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })`.)*

**Paso 2 — Pegarlo en Vercel.** Proyecto web → *Settings* → *Environment Variables* → nombre
`N8N_SHARED_SECRET`, valor esa línea. Repetir en el proyecto PWA. **El mismo valor.**

**Paso 3 — Pegarlo en n8n.** *Settings* → *Variables* → `N8N_SHARED_SECRET`, esa misma línea.

**Paso 4 — Olvidarlo.** No lo guardes en un documento, no lo envíes por correo, no lo pegues
en un chat. Si algún día hace falta cambiarlo, se genera uno nuevo y se repiten los pasos 2
y 3 **a la vez**: mientras los dos lados no coincidan, el resumen matutino fallará. Eso es
exactamente lo que debe pasar.

> **Por qué esto no puede ser automático:** Vercel y n8n son dos empresas distintas con dos
> cuentas distintas. No hay forma de que uno le escriba una variable al otro sin darle acceso
> completo, que sería peor. Es un copiar y pegar, dos veces, **una sola vez en la vida del
> proyecto**.

### 4.3 Obtener la URL del webhook

1. En n8n, importar `n8n/morning-digest.json` que entrega este hito.
2. Abrir el nodo **Webhook manual**.
3. Copiar la **Production URL** (no la de pruebas).
4. Pegarla en Vercel como `N8N_WEBHOOK_MORNING_DIGEST_URL`, en los dos proyectos.
5. **Activar el flujo** con el interruptor de arriba a la derecha. Sin activarlo, la URL de producción no responde.

### 4.4 Qué se construye

**Panel del equipo (escritorio)**
- Franja del equipo con las cuatro cifras.
- Tabla de vendedores con avance y atrasadas.
- Motivos de pérdida del mes.

**Administración (escritorio)**
- Usuarios: alta con contraseña mostrada una sola vez, edición, desactivar y reactivar, restablecer contraseña.
- Cuotas: tabla editable por mes, con copia del mes anterior.
- Auditoría: tabla de solo lectura con filtros.

**PWA del supervisor**
- Panel completo según `DESIGN_BRIEF.md` §10.1.
- Detalle de vendedor, solo lectura.
- Botón de disparo con los **cinco estados** de §10.3, incluido el bloqueo de 10 minutos.

**Las cinco capas de protección** de `TECHNICAL_SPEC.md` §8, completas:
- `POST /api/automation/morning-digest/trigger` con rol leído de `profiles`.
- Límite de 10 minutos contra `automation_runs`.
- Firma HMAC con `timingSafeEqual`, ventana de 5 minutos y nonce de un solo uso.
- `GET /api/n8n/digest-payload` y `POST /api/n8n/digest-result`, ambos con `runtime = 'nodejs'`.
- Auditoría y bitácora.

**El flujo de n8n**
- Archivo `n8n/morning-digest.json`, listo para importar.
- Cron a las 07:30, lunes a viernes, `Europe/Madrid`.
- Webhook para el disparo manual.
- Nodo de firma, llamada al payload, composición del correo, envío por Resend, devolución del resultado firmada.
- **Sin ningún nodo de Postgres.**

### 4.5 Procedimiento de despliegue

1. Confirmar el código en `gh-crm-123`.
2. Generar el secreto (§4.2) y ponerlo en Vercel, en los dos proyectos.
3. Importar `n8n/morning-digest.json` en n8n.
4. Poner las cuatro variables de n8n.
5. Copiar la Production URL del webhook y ponerla en Vercel, en los dos proyectos.
6. **Activar el flujo** en n8n.
7. Volver a desplegar los dos proyectos de Vercel para que tomen las variables nuevas.
8. Verificar que el despliegue terminó en verde.

### 4.6 Variables que el humano debe actualizar

**Se avisa al final del hito, antes de las pruebas:**

- [ ] `N8N_SHARED_SECRET` en el proyecto web de Vercel.
- [ ] `N8N_SHARED_SECRET` en el proyecto PWA de Vercel.
- [ ] `N8N_SHARED_SECRET` en n8n — **el mismo valor**.
- [ ] `N8N_WEBHOOK_MORNING_DIGEST_URL` en los dos proyectos de Vercel.
- [ ] `APP_BASE_URL` en n8n.
- [ ] `RESEND_API_KEY` en n8n.
- [ ] `RESEND_FROM` en n8n.
- [ ] Flujo **activado** en n8n.
- [ ] Los dos proyectos **redesplegados** después de poner las variables.

### 4.7 Pruebas de funcionalidad

**Panel y administración**

| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | Panel del equipo como supervisor | Todos los vendedores con su avance |
| 2 | Panel del equipo como vendedor | Deniega el acceso |
| 3 | Crear un usuario | Muestra la contraseña **una sola vez** con el aviso |
| 4 | Recargar esa página de confirmación | La contraseña **ya no se ve** |
| 5 | Entrar con el usuario nuevo | Fuerza el cambio de contraseña |
| 6 | Desactivar un usuario e intentar entrar con él | *«Usuario o contraseña incorrectos.»* |
| 7 | Buscar un botón de eliminar usuario | **No existe.** Solo *Desactivar* |
| 8 | Fijar una cuota y ver el tablero de ese vendedor | El avance se recalcula |
| 9 | Vendedor sin cuota fijada | Muestra `—`, **nunca `0 %`** |
| 10 | Auditoría | Están todas las acciones, sin botones de edición |

**El disparo del resumen**

| # | Prueba | Resultado esperado |
|---|---|---|
| 11 | Pulsar el botón en la PWA | Hoja de confirmación |
| 12 | Confirmar | Estado *Enviando…*, sin poder cerrar |
| 13 | Esperar | *«N correos enviados a las HH:MM»* |
| 14 | Revisar el correo de un vendedor | Llegan sus atrasadas, sus acciones de hoy y su avance |
| 15 | Revisar ese mismo correo | **No contiene datos de otros vendedores** |
| 16 | Volver a pulsar el botón enseguida | *«Ya has enviado el resumen hace N minutos…»* |
| 17 | Esperar 10 minutos y volver a pulsar | Funciona |
| 18 | Como supervisor en el escritorio, ver `automation_runs` | Las ejecuciones registradas |
| 19 | Revisar la auditoría | `automation.manual_trigger` con el `run_id` |

**Seguridad**

| # | Prueba | Resultado esperado |
|---|---|---|
| 20 | Como vendedor, llamar a `/api/automation/morning-digest/trigger` | **403** |
| 21 | Llamar a `/api/n8n/digest-payload` **sin firma** | **401** |
| 22 | Llamarlo con una firma inventada | **401** |
| 23 | Capturar una llamada válida y repetirla 6 minutos después | **401**, fuera de la ventana |
| 24 | Repetirla dentro de la ventana, con el mismo nonce | **401**, nonce ya usado |
| 25 | Cambiar el secreto solo en Vercel y disparar | Falla. **Esto es lo correcto** |
| 26 | Revisar el flujo de n8n | **Ningún nodo de Postgres ni credencial de Supabase** |
| 27 | Buscar `service_role` en el código del navegador | **No aparece** |

**Prueba final, al día siguiente**

| # | Prueba | Resultado esperado |
|---|---|---|
| 28 | Un martes a las 07:35, revisar los correos | Los resúmenes llegaron solos a las 07:30 |
| 29 | El domingo a las 07:35 | **No llegó nada.** Solo días laborables |

### 4.8 Cierre del proyecto

- [ ] Las 29 pruebas pasan.
- [ ] El resumen automático llegó a las 07:30 de un día laborable.
- [ ] Las pruebas 20 a 27 confirman las cinco capas de protección.
- [ ] Se ejecutó el **Script 12** para borrar los datos de ejemplo.
- [ ] Se crearon los 12 usuarios reales y se les entregó su contraseña en persona.
- [ ] Se fijaron las cuotas del mes en curso.
- [ ] **El humano lo ha confirmado explícitamente.**

---

## 5. Resumen de variables por hito

| Variable | H1 | H2 | H3 | H4 | Dónde vive |
|---|:--:|:--:|:--:|:--:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | — | ✔ | ✔ | ✔ | Vercel, los dos proyectos |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | ✔ | ✔ | ✔ | Vercel, los dos proyectos |
| `SUPABASE_SERVICE_ROLE_KEY` | — | ✔ | ✔ | ✔ | Vercel, los dos proyectos |
| `APP_BASE_URL` | — | ✔ | ✔ | ✔ | Vercel + n8n |
| `APP_TIMEZONE` | — | ✔ | ✔ | ✔ | Vercel |
| `APP_LOCALE` | — | ✔ | ✔ | ✔ | Vercel |
| `APP_CURRENCY` | — | ✔ | ✔ | ✔ | Vercel |
| `N8N_SHARED_SECRET` | — | — | — | ✔ | Vercel + n8n, **mismo valor** |
| `N8N_WEBHOOK_MORNING_DIGEST_URL` | — | — | — | ✔ | Vercel |
| `RESEND_API_KEY` | — | — | — | ✔ | **Solo n8n** |
| `RESEND_FROM` | — | — | — | ✔ | **Solo n8n** |

**Ninguna variable con `SECRET`, `SERVICE_ROLE` o `API_KEY` lleva jamás el prefijo `NEXT_PUBLIC_`.**

---

## 6. Qué hacer si algo va mal

| Síntoma | Causa más probable | Qué hacer |
|---|---|---|
| La aplicación no arranca en Vercel | Falta una variable | El registro dice cuál. Ponerla y redesplegar |
| «Usuario o contraseña incorrectos» con datos correctos | La clave de servicio está mal o el usuario está desactivado | Revisar `SUPABASE_SERVICE_ROLE_KEY` y `profiles.is_active` |
| El vendedor no ve sus clientes | RLS o `is_active = false` | Comprobar C16 de `SCRIPTS-SQL.md` |
| El resumen falla con `401 invalid_signature` | Los secretos no coinciden | Volver a pegar el mismo valor en Vercel y n8n, y redesplegar |
| No llega ningún correo | Resend sin dominio verificado | Verificar el dominio en Resend |
| El resumen no sale a las 07:30 | El flujo no está activado en n8n | Activarlo con el interruptor |
| El botón de disparo da 429 | El límite de 10 minutos | Esperar. **Está funcionando bien** |
| Vercel no encuentra Next.js | El *Root Directory* no está puesto | Ponerlo en `web` o `pwa` según el proyecto |

---

## 7. Después del último hito

Lo que queda fuera de este plan y conviene tener en el radar:

- **Copias de seguridad.** Supabase las hace solo en su plan de pago. Conviene revisarlo.
- **Dominio propio.** Vercel permite conectar uno. Si se hace, hay que actualizar `APP_BASE_URL` en los dos proyectos y en n8n.
- **El primer cierre de mes.** Es cuando se ve si las cuotas están bien planteadas. Merece una revisión con el supervisor.
- **Formación del equipo.** Diez personas aprendiendo un CRM nuevo. Media hora bien invertida evita meses de datos mal capturados.
