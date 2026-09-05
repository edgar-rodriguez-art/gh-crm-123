# CLAUDE.md — CRM-123

**Contrato de trabajo para Claude Code Web.**
Este archivo se lee al inicio de cada sesión y manda sobre cualquier otra instrucción.

---

## 1. Qué es esto

CRM-123 es un CRM minimalista para un equipo comercial de calzado y moda en España.
10 vendedores, 2 supervisores. Dos aplicaciones: escritorio para vendedores, PWA móvil
para supervisores.

| Dato | Valor |
|---|---|
| Rama | `gh-crm-123` |
| Carpetas | `/web` y `/pwa` |
| Base de datos | Supabase, proyecto `dbcrm123` |
| Despliegue | Vercel, **manual** |
| Zona horaria | `Europe/Madrid` |
| Moneda | EUR, **sin IVA** |
| Idioma | Español de España |

---

## 2. Jerarquía de documentos

Cuando dos documentos se contradicen, gana el de más arriba. **Siempre.**

| # | Documento | Autoridad sobre |
|---|---|---|
| 1 | **`SCRIPTS-SQL.md`** | Estructura de datos. **Inmutable.** |
| 2 | **`CLAUDE.md`** (este archivo) | Reglas de trabajo y prohibiciones |
| 3 | **`TECHNICAL_SPEC.md`** | Arquitectura, endpoints, seguridad |
| 4 | **`DESIGN_BRIEF.md`** | Pantallas, estados, flujos |
| 5 | **`BUILD_PLAN.md`** | Orden de construcción |

**Si algo no está en ningún documento, no se inventa.** Se detiene el trabajo, se explica
qué falta y se pide una decisión al humano. Adivinar cuesta más que preguntar.

---

## 3. Las diez reglas innegociables

No se relajan por comodidad ni por prisa. No hay excepciones «temporales».

### 1. RLS activa en todas las tablas
Incluidas `settings` y `audit_log`. Ninguna excepción.

### 2. Ninguna política de `DELETE`
No hay borrado físico en ninguna tabla desde ninguna capa. Solo archivado lógico.
**Nunca se usa la palabra «eliminar» en la interfaz.**

### 3. `activities` y `audit_log` son solo de inserción
Sin políticas de `UPDATE` ni `DELETE` para nadie, incluido el supervisor. Sin permiso de
`UPDATE` en la base. Sin endpoints. Sin botones. El historial es inmutable.

### 4. Toda política de `UPDATE` lleva `with check`
No solo `using`. Sin él, un vendedor cambia `owner_id` y se queda con la oportunidad de otro.

### 5. Ninguna política con condición `true`
Salvo `settings_select_all`. Es la única excepción del sistema.

### 6. Todas las vistas con `security_invoker = true`
Una vista sin esto filtra los datos de todo el equipo a cualquier vendedor.

### 7. Toda función `security definer` fija `search_path = public`

### 8. `SUPABASE_SERVICE_ROLE_KEY` nunca sale del servidor
Solo en Route Handlers y Server Actions. **Jamás en un componente cliente, ni siquiera
importado sin usar.** Vive en `lib/supabase/admin.ts`, cuya primera línea es
`import 'server-only';`.

### 9. Los secretos se comparan con `crypto.timingSafeEqual`
**Nunca con `===`.** Comparar con `===` filtra la firma byte a byte por diferencia de tiempo.

### 10. El rol se lee de la tabla `profiles`
Nunca de un JWT, de `user_metadata`, de `app_metadata` ni de nada que venga del cliente.

### Y una undécima, del mismo rango
**n8n nunca toca Postgres.** Todo pasa por los endpoints `/api/n8n/*` de la aplicación.
n8n no tiene credenciales de Supabase configuradas.

---

## 4. Prohibiciones adicionales

12. Modificar la estructura definida en `SCRIPTS-SQL.md`: tablas, columnas, tipos, valores de enumeración, índices o restricciones.
13. Pedir, guardar o mostrar DPI, NIT, DNI, NIE, CIF, pasaporte o cualquier identificador fiscal o nacional.
14. Prefijar con `NEXT_PUBLIC_` una variable de servidor.
15. Recalcular el atraso en TypeScript. Se lee de `v_opportunity_board`.
16. Mostrarle a un vendedor cualquier dato de otro vendedor, incluido el nombre.
17. Devolver datos del cliente duplicado al vendedor que intentó registrarlo.
18. Revelar en un error de inicio de sesión si el usuario existe.
19. Escribir `types/database.ts` a mano. Se genera desde la base real.
20. Cachear rutas que devuelven datos de usuario. RLS y caché no se llevan bien.
21. Implementar autoregistro, invitación por correo o recuperación de contraseña por email.
22. Reinterpretar el sistema de diseño que decida Claude Design.

---

## 5. Cómo trabajar

### Antes de escribir código
1. Leer `SCRIPTS-SQL.md` y confirmar que la tabla, columna o vista que se va a usar **existe con ese nombre exacto**.
2. Leer la sección correspondiente de `TECHNICAL_SPEC.md`.
3. Leer la pantalla correspondiente de `DESIGN_BRIEF.md`, incluidos sus cinco estados.
4. Si algo falta o se contradice: **detenerse y preguntar.**

### Al escribir código
- TypeScript en modo estricto. Sin `any`. Sin `@ts-ignore`.
- Toda entrada de usuario validada con Zod **en el servidor**. La validación de cliente es cortesía, no seguridad.
- Los tipos salen de `types/database.ts`, generado.
- Español de España en todo lo que ve la persona. Inglés en nombres de código.
- Los importes se manejan como `number` con dos decimales y se formatean con `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })`.
- Las fechas se comparan siempre teniendo en cuenta `Europe/Madrid`, nunca la zona del servidor.

### Al terminar cada tarea
Antes de darla por hecha, comprobar en voz alta:

- [ ] ¿He tocado `SCRIPTS-SQL.md`? → **Debe ser no.**
- [ ] ¿Hay algún `delete` en el código? → **Debe ser no.**
- [ ] ¿La clave de servicio aparece en algún archivo sin `import 'server-only'`? → **Debe ser no.**
- [ ] ¿He leído el rol de algún sitio que no sea `profiles`? → **Debe ser no.**
- [ ] ¿He comparado un secreto con `===`? → **Debe ser no.**
- [ ] ¿Aparece la palabra «eliminar» en algún texto de interfaz? → **Debe ser no.**
- [ ] ¿Hay algún campo de identificador personal? → **Debe ser no.**
- [ ] ¿Están diseñados los cinco estados de cada pantalla nueva?
- [ ] ¿Puede un vendedor ver algo de otro vendedor? → **Debe ser no.**

### Al terminar cada hito
- Explicar **en lenguaje de negocio** qué se ha construido.
- Listar las variables de entorno necesarias y cómo obtener cada valor.
- Dar el procedimiento de despliegue paso a paso.
- Dar las pruebas de funcionalidad que el humano debe ejecutar.
- **Detenerse y esperar confirmación explícita.** No se avanza al hito siguiente sin ella.

---

## 6. Reglas de negocio que el código debe hacer cumplir

| # | Regla |
|---|---|
| R1 | El teléfono es único en todo el sistema. Al duplicar: aviso ciego, sin revelar dato alguno del cliente ajeno |
| R2 | El teléfono se normaliza a `+34XXXXXXXXX` antes de guardar y de comparar |
| R3 | Un cliente tiene **una sola** oportunidad abierta a la vez |
| R4 | Al ganar: importe final obligatorio. Al perder: motivo obligatorio. Una cerrada no se reabre |
| R5 | Las actividades se insertan y nunca se modifican |
| R6 | Solo el supervisor reasigna clientes |
| R7 | Archivado lógico. Cliente se archiva, usuario se desactiva, oportunidad se cierra |
| R8 | Cuota mensual por vendedor. Sin cuota fijada, el avance muestra `—`, nunca `0 %` |
| R9 | Aislamiento total entre vendedores |
| R10 | Todos los importes son base imponible, sin IVA |
| R11 | Ningún identificador personal, en ningún sitio |
| R12 | Auditoría en los 14 eventos listados en `TECHNICAL_SPEC.md` §4 R12 |

---

## 7. Autenticación en una línea

El vendedor entra con **nombre de usuario y contraseña**. Nunca ve un email. El servidor
traduce el usuario a email con la clave de servicio. En el primer acceso, cambio de
contraseña obligatorio y sin escapatoria. **No hay autoregistro, ni invitación por correo,
ni recuperación por email.** Si alguien la olvida, el supervisor genera otra.

El error de inicio de sesión es **siempre el mismo texto**, distinga o no entre usuario
inexistente, contraseña errónea y cuenta desactivada.

---

## 8. El disparo de n8n en cinco capas

1. **Rol leído de `profiles`.** Nunca del JWT.
2. **Un disparo cada 10 minutos.** Comprobado contra `automation_runs`; la fila se inserta antes de llamar a n8n y hace de cerrojo.
3. **Firma HMAC-SHA256** sobre `timestamp.nonce.cuerpoCrudo`, ventana de 5 minutos, nonce de un solo uso, comparación con `timingSafeEqual`.
4. **n8n no toca Postgres.** Solo `/api/n8n/digest-payload` y `/api/n8n/digest-result`.
5. **Auditoría y bitácora** en `audit_log` y `automation_runs`.

Detalle completo en `TECHNICAL_SPEC.md` §8.

Los endpoints `/api/n8n/*` llevan `export const runtime = 'nodejs'`: el módulo `crypto` de
Node no existe en el entorno de borde.

---

## 9. Comunicación con el humano

El humano **no tiene perfil técnico**. Por tanto:

- Se explica en lenguaje de negocio. Si hace falta un término técnico, se explica en una línea qué implica.
- Cuando haya una decisión que tomar, se proponen opciones con una recomendación clara y el porqué.
- Cuando algo falle, se dice **qué** falló, **por qué** y **qué hacer**, en ese orden.
- No se le pide que lea código para entender un problema.
- No se dan por hechas las variables de entorno: se listan, se explica dónde se obtiene cada valor y se verifica que estén puestas.

---

## 10. Qué hacer ante la duda

En orden:

1. **Buscar en `SCRIPTS-SQL.md`.** Si la respuesta está ahí, es esa.
2. **Buscar en `TECHNICAL_SPEC.md` y `DESIGN_BRIEF.md`.**
3. **Si no está en ninguno: detenerse y preguntar al humano.**

Nunca se inventa una tabla, una columna, un endpoint, una regla de negocio o un texto de
interfaz. **Una pregunta cuesta un minuto. Una suposición cuesta un hito.**
