# CRM-123 — Insumo para los manuales de usuario

**Qué es este documento.** No es un manual. Es la materia prima verificada para
escribirlos: cada pantalla, cada botón, cada regla y cada mensaje que el sistema
puede enseñar, extraídos del código que está en producción.

**De dónde sale.** De `web/`, `pwa/`, `packages/core/` y `n8n/morning-digest.json`
del repositorio `gh-crm-123`, no del diseño original. Durante la construcción hubo
decisiones que cambiaron respecto al brief, y aquí está lo que de verdad se
comporta así.

**Cómo usarlo.** Pásalo entero a quien vaya a redactar. Sugerencia de encargo:

> Con este documento, escribe **tres manuales separados**: uno para el vendedor,
> uno para el supervisor en el ordenador y uno para el supervisor en el móvil.
> Público: equipo comercial de calzado y moda, poca costumbre de software.
> Tono: tú, directo, sin jerga técnica. Nada de «hacer clic en el botón azul»:
> los nombres de los botones están en este documento y son literales.
> Cada procedimiento, en pasos numerados. Cada pantalla, con un apartado de
> «qué hacer si…».

---

## 1. Qué es CRM-123, en un párrafo

Una herramienta para que un equipo de diez vendedores y dos supervisores de
calzado y moda no pierda ninguna venta por olvido. Cada vendedor ve **solo sus
clientes**; el supervisor ve a todo el equipo. El sistema calcula solo qué está
atrasado y, cada mañana laborable a las 07:30, envía a cada vendedor un correo
con lo que tiene que atender ese día.

Vive en dos aplicaciones separadas:

| | Para quién | Para qué |
|---|---|---|
| **Escritorio** (web) | Vendedores y supervisores | Todo el trabajo diario y la gestión |
| **Móvil** (PWA) | **Solo supervisores** | Ver cómo va el equipo y disparar el resumen |

Un vendedor que intente entrar en la aplicación móvil recibe:
*«Esta aplicación es solo para supervisores. Entra desde el escritorio.»*

---

## 2. Vocabulario del sistema

El manual **debe usar estas palabras exactas**, porque son las que aparecen en
pantalla. No hay sinónimos.

### Etapas de una oportunidad
`Nuevo` · `Contactado` · `Propuesta enviada` · `Negociación` · `Cerrado`

### Estados de una oportunidad
`Abierta` · `Ganada` · `Perdida`

### Canales de captación del cliente
`Tienda física` · `WhatsApp` · `Instagram` · `Feria / showroom` · `Referido` ·
`Llamada entrante` · `Otro`

### Motivos de pérdida
`Precio` · `No responde` · `Compró a la competencia` · `Sin presupuesto` ·
`No era el momento` · `Cancelación` · `Otro`

### Tipos de actividad
`Llamada` · `WhatsApp` · `Email` · `Visita` · `Nota`

### Roles
`Vendedor` · `Supervisor`

### Palabras prohibidas en el manual
El sistema **nunca dice «eliminar» ni «borrar»**, porque no se borra nada. Se
usa siempre:

- Un cliente se **archiva** (y se puede **desarchivar**).
- Un usuario se **desactiva** (y se puede **reactivar**).
- Una oportunidad se **cierra** como ganada o perdida.

---

## 3. Las reglas que el manual tiene que explicar

Son las que más preguntas van a generar. Están escritas aquí en lenguaje de
usuario, no de programador.

| Regla | Cómo contarla |
|---|---|
| **Un teléfono, un cliente** | No pueden existir dos clientes con el mismo teléfono en toda la empresa. Si intentas registrar uno que ya existe, el sistema avisa. **Si el cliente es de otro vendedor, no te dice de quién es ni te enseña ningún dato**: solo que ese teléfono ya está registrado. Habla con tu supervisor. |
| **Teléfonos españoles** | Se guardan siempre como `+34` seguido de nueve dígitos que empiezan por 6, 7, 8 o 9. Puedes escribirlo con espacios o sin ellos, con prefijo o sin él: el sistema lo ordena. |
| **Una oportunidad abierta por cliente** | Un cliente no puede tener dos negociaciones a la vez. Para abrir otra, primero cierra la que tienes como ganada o perdida. |
| **Cerrar es definitivo** | Al ganar hay que poner el **importe final**. Al perder hay que elegir un **motivo**. Una vez cerrada, **no se puede reabrir**. Si te equivocas, abre una oportunidad nueva. |
| **La actividad no se corrige** | Lo que registras en el historial se queda. No hay editar ni borrar. Si te equivocaste, escribe otra nota aclarándolo. |
| **Cada uno ve lo suyo** | Un vendedor no puede ver, buscar ni deducir nada de los clientes de otro. No es una cuestión de pantallas: el sistema no se los entrega. |
| **Reasignar es cosa del supervisor** | Solo el supervisor puede pasar un cliente de un vendedor a otro. |
| **Sin meta no hay porcentaje** | Si el supervisor no ha fijado tu meta del mes, el avance muestra `—`. **Nunca `0 %`**, porque no es lo mismo «no tienes meta» que «llevas cero». |
| **Todos los importes son sin IVA** | Aparece escrito en pantalla donde hay dinero: *«Importes sin IVA»*. |
| **Nada de DNI** | El sistema no pide ni guarda documentos de identidad en ningún sitio. |

### Cuándo una oportunidad está «atrasada»

Es la única alarma del sistema y conviene explicarla bien. Una oportunidad
aparece como atrasada si se cumple **cualquiera** de estas dos:

1. **Lleva demasiados días sin actividad**, según su etapa:

   | Etapa | Se considera atrasada a partir de |
   |---|---|
   | Nuevo | 3 días sin actividad |
   | Contactado | 3 días sin actividad |
   | Propuesta enviada | 2 días sin actividad |
   | Negociación | 2 días sin actividad |

2. **La próxima acción que agendaste ya venció.**

Si se cumplen las dos, el sistema enseña la acción vencida, que es más concreta.
El motivo **siempre va escrito al lado del punto de color**, para quien no
distinga bien los colores.

---

## 4. Quién puede hacer qué

| Acción | Vendedor | Supervisor |
|---|---|---|
| Ver sus propios clientes y oportunidades | Sí | Sí |
| Ver los de **otro** vendedor | **No** | Sí |
| Crear clientes y oportunidades | Sí | Sí |
| Registrar actividad | Sí | Sí |
| Cerrar oportunidad (ganada / perdida) | Sí | Sí |
| Archivar y desarchivar clientes | Sí | Sí |
| **Reasignar** un cliente a otro vendedor | **No** | Sí |
| Ver el panel del **Equipo** | **No** | Sí |
| Crear, desactivar y reactivar usuarios | **No** | Sí |
| Restablecer contraseñas | **No** | Sí |
| Fijar cuotas del mes | **No** | Sí |
| Ver la auditoría | **No** | Sí |
| Entrar en la aplicación **móvil** | **No** | Sí |
| Disparar el resumen matutino a mano | **No** | Sí |

Si un vendedor escribe a mano la dirección de una pantalla que no le
corresponde, ve: *«No tienes permiso para ver esto.»*

---

## 5. Entrar en el sistema

### Iniciar sesión

Se entra con **nombre de usuario**, no con correo. El correo solo sirve para
recibir el resumen matutino.

- Campos: `Usuario` y `Contraseña`.
- Si algo no cuadra: *«Usuario o contraseña incorrectos.»* — el mismo mensaje
  tanto si el usuario no existe, como si la contraseña falla, como si la cuenta
  está desactivada. Es deliberado: así nadie averigua qué usuarios existen.
- Tras varios intentos seguidos: *«Demasiados intentos. Espera unos minutos.»*
- Bajo el formulario: *«Si has olvidado tu contraseña, pídesela a tu supervisor.»*

**No hay «he olvidado mi contraseña» por correo.** La restablece el supervisor y
te la entrega en persona.

### El primer acceso

La primera vez que entras con la contraseña que te dio tu supervisor, el sistema
**te obliga a cambiarla** antes de dejarte hacer nada. Lo mismo ocurre después de
que el supervisor te la restablezca.

Requisitos de la contraseña nueva, que se comprueban mientras escribes:

- Mínimo **10 caracteres**.
- **No puede contener tu nombre de usuario.**

### Cerrar sesión

El botón está al final de la barra lateral (escritorio) o al final del panel
(móvil).

---

## 6. Manual del vendedor — escritorio

La barra lateral tiene tres entradas: **Tablero del día**, **Oportunidades** y
**Clientes**.

### 6.1 Tablero del día

*Responde a: ¿qué hago hoy?* Es la pantalla de inicio.

De arriba abajo:

1. **Saludo y fecha.**
2. **Avance de tu meta del mes** — cerrado, meta, porcentaje y cuánto falta. Si
   no te han fijado meta, muestra `—`.
3. **Atrasadas** — las oportunidades que reclaman atención, con el motivo escrito.
   Si no hay ninguna: *«Nada atrasado. Todo tu embudo está al día.»*
4. **Para hoy** — las acciones que agendaste para hoy. Si no hay:
   *«No tienes acciones agendadas para hoy.»*
5. Enlace **«Ver todas mis oportunidades»**.

### 6.2 Oportunidades

*Responde a: ¿en qué estoy trabajando?* Una tabla densa con todas tus
oportunidades abiertas.

- Se puede **filtrar** por etapa y por si está atrasada.
- Cada fila lleva un punto de señal si está atrasada, con su explicación.
- Pulsar una fila abre la ficha del cliente.

### 6.3 Clientes

La lista de tus clientes, con buscador.

- Botón **«Nuevo cliente»**.
- Si aún no tienes ninguno: *«Aún no tienes clientes. Registra tu primer cliente
  para empezar a trabajar.»*
- Los clientes archivados no aparecen salvo que los pidas.

### 6.4 Ficha de cliente

*Responde a: todo lo que sé de esta persona.* Es la pantalla donde se trabaja.

Contiene:

- **Identidad**: nombre, empresa, teléfono, canal de captación, vendedor y
  «Cliente desde».
- **La oportunidad abierta**, si la hay: etapa, importe estimado, próxima acción.
  Si no hay ninguna: botón **«Nueva oportunidad»**.
- **Actividad**: el historial completo, del más reciente al más antiguo, con el
  aviso *«El historial no se puede modificar.»* Si está vacío:
  *«Sin actividad todavía.»*
- **Ventas cerradas**. Si no hay: *«Sin ventas cerradas todavía.»*

### 6.5 Los procedimientos del vendedor

Cada uno de estos merece un apartado con pasos numerados en el manual.

**Registrar un cliente nuevo** — Botón «Nuevo cliente». Campos: `Nombre`
(obligatorio), `Empresa`, `Teléfono` (obligatorio), `Canal`. Mientras escribes el
teléfono el sistema comprueba si ya existe (*«Comprobando…»*). Si está duplicado
avisa sin revelar de quién es.

**Abrir una oportunidad** — Desde la ficha del cliente. Campos: `Importe
estimado` y `Próxima acción` (fecha y hora). Nace en la etapa `Nuevo`.

**Registrar lo que ha pasado** — Formulario «Registrar actividad» en la ficha.
Campos: `Tipo`, `¿Qué ha pasado?` y, opcionalmente, una nueva `Próxima acción`.
Botón **«Registrar»**. *Esto es lo que quita una oportunidad de «atrasadas»:
conviene decirlo explícitamente en el manual.*

**Mover la etapa** — Desde la oportunidad abierta.

**Cerrar una venta ganada** — Botón «Marcar como ganada» → ventana «Confirmar
venta» → `Importe final` obligatorio. Irreversible.

**Cerrar una oportunidad perdida** — Botón «Marcar como perdida» → `Motivo`
obligatorio de la lista. Irreversible.

**Archivar un cliente** — Cuando ya no procede. No se borra: deja de aparecer en
la lista y se puede **desarchivar** después.

---

## 7. Manual del supervisor — escritorio

El supervisor ve todo lo del vendedor **más** dos entradas: **Equipo** y
**Administración**.

### 7.1 Equipo

*Responde a: ¿cómo va el equipo?*

- **Franja superior** con cuatro cifras del mes: `Cerrado`, `Meta`, `Avance`,
  `Atrasadas`.
- **Tabla de vendedores**: cerrado, meta, avance con barra, ganadas y atrasadas.
  **Ordenada por avance de menor a mayor** — quien necesita ayuda va arriba, no
  quien va ganando. Merece explicarse en el manual, porque sorprende.
  Pulsar un nombre lleva a sus oportunidades.
- **Motivos de pérdida del mes**, en lista.

Los vendedores desactivados no aparecen ni suman.

### 7.2 Administración → Usuarios

- Botón **«Nuevo usuario»**. Campos: `Nombre completo`, `Nombre de usuario`
  (solo minúsculas, números, punto, guion y guion bajo, de 3 a 32 caracteres),
  `Email`, `Rol` y, si es vendedor, `Meta de este mes`.
- Al crearlo aparece la **`Contraseña inicial`** en una pantalla de confirmación.

  > **Esto es lo más importante del manual del supervisor.** La contraseña se
  > enseña **una sola vez**. Si recargas la página, ya no está. Cópiala y
  > entrégala en persona antes de cerrar esa ventana.

- **Desactivar** un usuario: deja de poder entrar, pero sus clientes, ventas e
  historial se conservan. Se puede **reactivar**.
- **No existe eliminar usuario.** Si alguien lo busca, no lo va a encontrar.
- **No puedes desactivar tu propia cuenta**, y el sistema lo dice.
- **Restablecer contraseña**: genera una nueva, se enseña una sola vez, y la
  persona tendrá que cambiarla al entrar.

### 7.3 Administración → Cuotas

- Selector de **mes** y **año**. Al cambiarlo se recargan las metas de ese
  periodo de verdad.
- Una fila por vendedor activo, con la meta editable en euros.
- **Total del equipo** al pie.
- Botón **«Copiar las metas del mes anterior»**: rellena los campos pero **no
  guarda**. Revisas y pulsas «Guardar cambios».
- Recordatorio en pantalla: *«Importes sin IVA»*.

### 7.4 Administración → Auditoría

Registro de solo lectura de las **catorce acciones** que el sistema vigila:
crear, editar, archivar y reasignar clientes; crear oportunidades, cambiar
etapa, ganar y perder; crear, desactivar y reactivar usuarios; cambiar
contraseñas; cambiar metas; y disparar el resumen a mano.

- Filtros por **fecha desde/hasta**, **tipo** y **usuario**.
- Cada asiento dice quién, qué, sobre qué y cuándo, en lenguaje llano.
- **No se puede editar ni borrar nada**, ni siquiera siendo supervisor. Tampoco
  hay botón de exportar.
- Debajo, las **diez últimas ejecuciones del resumen matutino**: cuándo, si fue
  programado o a mano, si salió bien y cuántos correos.

---

## 8. Manual del supervisor — móvil

La aplicación móvil es **solo para supervisores** y solo para dos cosas: mirar
cómo va el equipo y disparar el resumen. Toda la gestión —crear usuarios, fijar
metas, reasignar, archivar— **vive únicamente en el escritorio**. El manual debe
decirlo desde el principio para que nadie la busque ahí.

Se instala como una aplicación desde el navegador («Añadir a pantalla de
inicio»).

### 8.1 Panel

1. **«El equipo hoy»** y la fecha.
2. **Avance del equipo**: porcentaje grande, barra, y debajo
   `Cerrado … · Meta …`.
3. **Aviso de atrasos**, solo si los hay: *«N oportunidades atrasadas en M
   vendedores.»*
4. **Semáforo del equipo**: una fila por vendedor con su barra, su porcentaje y
   sus atrasadas a la derecha, **ordenados de menor a mayor avance**.
5. Botón fijo al pie: **«Enviar resumen matutino ahora»**.
6. Bajo el botón: *«Último envío: hoy a las 07:30 · 10 correos.»*

Si no hay metas fijadas: *«Aún no has fijado las metas del mes. Hazlo desde el
escritorio.»*

### 8.2 Detalle de vendedor

Se abre al pulsar una fila del semáforo. Muestra sus cuatro cifras del mes y sus
oportunidades atrasadas con el motivo.

**Es de solo lectura.** No hay ni un botón que cambie nada. Es intencionado: se
mira desde el móvil y se actúa desde el ordenador.

### 8.3 Enviar el resumen a mano — los cinco estados

Este proceso necesita su propio apartado en el manual, con los cinco casos:

| | Qué ve el supervisor |
|---|---|
| **A · Confirmación** | Sube una hoja: *«Enviar el resumen matutino. Se enviará un correo a cada vendedor activo con sus oportunidades atrasadas, sus acciones de hoy y su avance de meta.»* Botones **Cancelar** y **Enviar ahora**. |
| **B · Enviando** | *«Enviando resúmenes…»* con una barra de progreso. **La hoja no se puede cerrar.** Dice: *«Esto tarda menos de un minuto. Puedes cerrar la aplicación, el envío continuará.»* |
| **C · Terminado bien** | *«✓ Resúmenes enviados — N correos enviados a las HH:MM.»* Botón **Cerrar**. |
| **D · Terminado mal** | *«✕ No se han podido enviar. El envío ha fallado. Vuelve a intentarlo en unos minutos.»* Botones **Cerrar** y **Reintentar**. Sin códigos de error: si hace falta el detalle, está en la Auditoría del escritorio. |
| **E · Bloqueado** | Si ya se envió hace menos de diez minutos, **la hoja no llega a abrirse**. Aparece: *«Ya has enviado el resumen hace N minutos. Podrás volver a enviarlo a las HH:MM.»* |

**El estado E hay que presentarlo como una protección, no como un error.** Existe
para que los vendedores no reciban dos correos iguales seguidos, por un doble
clic o porque los dos supervisores pulsen a la vez.

---

## 9. El resumen matutino

### Cuándo llega

Automáticamente, **de lunes a viernes a las 07:30, hora peninsular española**.
Los fines de semana no se envía. Además, un supervisor puede dispararlo a mano
en cualquier momento desde el móvil.

### Quién lo recibe

**Cada vendedor activo recibe un correo con sus datos y solo los suyos.** Ningún
correo menciona a otro vendedor. Los supervisores no lo reciben: ellos tienen el
panel.

Un vendedor que no tenga nada atrasado **recibe igualmente su correo**, con su
avance de meta. La ausencia de atrasos también es una noticia.

### Qué trae

Asunto: `CRM-123 · Tu resumen del <día en letra>`

```
Hola, <nombre>.

ATRASADAS
· <Cliente> (<Empresa>) — <Etapa> — <Importe> — <acción vencida | N días sin actividad>

PARA HOY
· <hora> — <Cliente> — <Etapa> — <Importe>

TU MES
Cerrado: X € de Y € — Z %
Te faltan W €.

Importes sin IVA.

<enlace a la aplicación>
```

Cuando no hay nada en un bloque, lo dice: *«Nada atrasado…»*, *«No tienes
acciones agendadas para hoy.»* Y si el vendedor no tiene meta fijada:
*«Tu supervisor aún no ha fijado tu meta de este mes.»*

### Qué contar si un vendedor pregunta «no me ha llegado»

En este orden: mirar la carpeta de spam; comprobar con el supervisor que su
usuario está activo y su correo bien escrito; y el supervisor puede ver en
**Administración → Auditoría**, en el bloque del resumen matutino, si el envío
de esa mañana salió y cuántos correos fueron.

---

## 10. Mensajes que puede ver el usuario

Para un apéndice de «qué significa esto».

| Mensaje | Cuándo aparece | Qué hacer |
|---|---|---|
| *Usuario o contraseña incorrectos.* | Al entrar | Revisar el usuario; si persiste, pedir a tu supervisor que restablezca la contraseña |
| *Demasiados intentos. Espera unos minutos.* | Varios fallos seguidos | Esperar |
| *Esta aplicación es solo para supervisores. Entra desde el escritorio.* | Un vendedor en la app móvil | Usar el ordenador |
| *No tienes permiso para ver esto.* | Pantalla que no corresponde al rol | Volver atrás |
| *No tienes permiso para esta acción.* | Acción reservada al supervisor | Pedírselo al supervisor |
| *Algo ha fallado. Vuelve a intentarlo.* | Error inesperado | Reintentar; si sigue, avisar a quien administra |
| *No hemos encontrado lo que buscas.* | Ficha inexistente o de otro vendedor | Volver a la lista |
| *Espera unos minutos antes de reintentar.* | Envío del resumen demasiado seguido | Esperar los diez minutos |
| *Importes sin IVA* | Donde hay dinero | Es un recordatorio, no un aviso |
| *El historial no se puede modificar.* | En la actividad | Añadir una nota aclaratoria |

---

## 11. Casos que van a generar preguntas

Cada uno merece una entrada en un apartado de dudas frecuentes.

1. **«He cerrado una venta por error.»** No se puede reabrir. Se abre una
   oportunidad nueva para ese cliente y se explica en una nota.
2. **«Me sale que el teléfono ya existe pero no veo el cliente.»** Ese cliente es
   de otro compañero. El sistema no dice de quién. Habla con tu supervisor, que
   puede reasignarlo.
3. **«Mi avance sale como `—`.»** No te han fijado la meta del mes. No es un
   error.
4. **«Quiero borrar un cliente.»** No se borra: se archiva. Sigue estando y se
   puede recuperar.
5. **«Registré una actividad equivocada.»** No se corrige. Se añade otra nota
   aclarándolo.
6. **«¿Por qué esta oportunidad sale atrasada si hablé ayer?»** Porque hablar no
   basta: hay que **registrar la actividad**. El sistema solo sabe lo que le
   cuentas.
7. **«He pulsado enviar y no me deja otra vez.»** Han pasado menos de diez
   minutos desde el último envío. Es una protección contra correos duplicados.
8. **«El correo del resumen no llega.»** Ver §9.

---

## 12. Lo que el sistema deliberadamente NO hace

Conviene un apartado corto, porque evita expectativas y reclamaciones:

- No borra nada. Archiva, desactiva y cierra.
- No manda contraseñas por correo. Las entrega el supervisor en persona.
- No permite editar el historial de actividad.
- No permite reabrir una oportunidad cerrada.
- No tiene aplicación móvil para vendedores.
- No guarda documentos de identidad.
- No exporta la auditoría.
- No avisa en tiempo real: la información se actualiza al cargar la pantalla.

---

## 13. Notas para quien redacte

- **Los textos entre comillas de este documento son literales de la pantalla.**
  No los reescribas ni los mejores: el manual debe poder seguirse leyendo lo que
  se ve.
- **Español de España**, tuteando. Es el registro del producto.
- El dinero se escribe `1.234,56 €`. Las fechas, `dd/MM/aaaa`. La hora, 24 horas.
- **No inventes capturas de pantalla ni nombres de menú que no estén aquí.** Si
  algo falta, márcalo como pendiente de confirmar en vez de suponerlo.
- Tres manuales separados funcionan mejor que uno: el vendedor no necesita saber
  qué hay en Administración, y mezclarlo solo consigue que no lea ninguno.
- El manual del vendedor cabe en unas seis páginas. El del supervisor en
  escritorio, en ocho. El del móvil, en tres.

---

*Generado a partir del código en producción de `gh-crm-123`. Si la aplicación
cambia, este documento hay que regenerarlo antes de tocar los manuales.*
