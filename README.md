# CRM-123

CRM para un equipo comercial de calzado y moda en España. 10 vendedores, 2 supervisores.

| Dato | Valor |
|---|---|
| Rama | `gh-crm-123` |
| Base de datos | Supabase, proyecto `dbcrm123` |
| Despliegue | Vercel, manual, **dos proyectos** |
| Zona horaria | `Europe/Madrid` |
| Moneda | EUR, **sin IVA** |
| Idioma | Español de España |

**Estado: Hito 2 terminado.** Falta que el humano lo despliegue y pase las 13 pruebas.

---

## Los documentos mandan sobre el código

Cuando dos se contradicen, gana el de más arriba. Siempre.

| # | Documento | Autoridad sobre |
|---|---|---|
| 1 | [`SCRIPTS-SQL.md`](SCRIPTS-SQL.md) | Estructura de datos. **Inmutable.** |
| 2 | [`CLAUDE.md`](CLAUDE.md) | Reglas de trabajo y prohibiciones |
| 3 | [`TECHNICAL_SPEC.md`](TECHNICAL_SPEC.md) | Arquitectura, endpoints, seguridad |
| 4 | [`DESIGN_BRIEF.md`](DESIGN_BRIEF.md) | Pantallas, estados, flujos |
| 5 | [`BUILD_PLAN.md`](BUILD_PLAN.md) | Orden de construcción |

En `docs/` está el traspaso de Claude Design: [`README.handoff.md`](docs/README.handoff.md),
el prototipo navegable y el sistema visual Broadsheet. **No es normativo** — no está en la
jerarquía — pero es la fuente de los valores visuales exactos.

---

## Cómo está organizado

```
gh-crm-123/
├── packages/core/     Lo que comparten las dos aplicaciones
│   ├── src/env.ts             valida las variables al arrancar
│   ├── src/supabase/          los tres clientes (navegador, servidor, administrador)
│   ├── src/types/database.ts  GENERADO desde la base. No se edita a mano.
│   ├── src/auth.ts            el perfil, leído siempre de `profiles`
│   ├── src/audit.ts           las 14 acciones de auditoría
│   ├── src/format.ts          euros, fechas y horas en es-ES / Europe/Madrid
│   ├── src/labels.ts          enumeración → etiqueta en pantalla
│   └── styles/tokens.css      los tokens de Broadsheet
│
├── web/               Escritorio · vendedores y supervisores
├── pwa/               Móvil · solo supervisores
└── n8n/               El resumen matutino (Hito 4)
```

Las dos aplicaciones son proyectos de Next.js independientes, como manda
`TECHNICAL_SPEC.md` §11, pero comparten `packages/core`: la sesión, los tipos y las reglas
de formato viven en un solo sitio. Un arreglo de seguridad se hace una vez, no dos.

---

## Trabajar en local

```bash
npm install                       # una sola vez, desde la raíz

cp .env.example web/.env.local    # y rellenar los valores
cp .env.example pwa/.env.local

npm run dev:web                   # http://localhost:3000
npm run dev:pwa                   # en otro terminal
```

Comprobaciones antes de enviar:

```bash
npm run typecheck                 # TypeScript estricto, sin any ni @ts-ignore
npm run lint
npm run build                     # compila las dos aplicaciones
```

### Regenerar los tipos de la base

`packages/core/src/types/database.ts` **no se escribe a mano**. Si la base cambia:

```bash
supabase gen types typescript --project-id sdcaqjzuaayxqioequdb \
  > packages/core/src/types/database.ts
```

---

## Las reglas que no se negocian

Están completas en [`CLAUDE.md`](CLAUDE.md) §3. Las que más se olvidan:

- **La clave de servicio nunca sale del servidor.** Vive en `packages/core/src/supabase/admin.ts`,
  cuya primera línea es `import 'server-only';`. Importarla desde un componente cliente no
  compila.
- **El rol se lee de la tabla `profiles`**, nunca del JWT ni de `user_metadata`.
- **Ninguna tabla admite `delete`.** No hay borrado físico en ninguna capa. La acción se
  llama «Archivar»; para usuarios, «Desactivar».
- **`activities` y `audit_log` son solo de inserción.** El historial es inmutable: no hay
  botones de editar ni de archivar en sus entradas porque no existen en el código.
- **El atraso se lee de `v_opportunity_board`.** No se recalcula en TypeScript.
- **Un vendedor no ve nada de otro vendedor**, ni siquiera su nombre.

---

## Qué hay construido

### Hito 2 · terminado

- Los tres clientes de Supabase y la validación de variables al arrancar.
- Ingreso con nombre de usuario, con el mismo error para los tres casos de fallo y
  límite de intentos por IP.
- Cambio de contraseña obligatorio en el primer acceso, impuesto por el middleware.
- Barra lateral de 240 px, distinta para vendedor y supervisor.
- Tablero del día con sus tres bloques en estado vacío.
- Los cinco estados globales como componentes reutilizables.
- PWA instalable: manifest, iconos, service worker y rechazo de vendedores.

### Pendiente

- **Hito 3** — clientes, oportunidades, actividades, tablero con datos y tabla densa.
- **Hito 4** — panel del equipo, administración, PWA completa y el resumen matutino.

Ninguna pantalla marcada «se construye en el Hito 3/4» lleva lógica que haya que
desmontar: se sustituye el archivo entero.
