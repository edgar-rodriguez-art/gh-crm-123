# DESIGN_BRIEF.md — CRM-123

**Brief de diseño para Claude Design.**

| Dato | Valor |
|---|---|
| Producto | CRM-123 |
| Sector | Venta de calzado y moda |
| Mercado | España · español de España |
| Moneda | EUR, formato `1.250,00 €`, **sin IVA** |
| Fechas | `dd/mm/aaaa` · horas en 24 h · zona `Europe/Madrid` |
| Aplicaciones | Escritorio (vendedores) y PWA móvil (supervisor) |
| Equipo | 10 vendedores · 2 supervisores |

> **Dependencia normativa:** los campos, estados y valores de lista provienen de
> `SCRIPTS-SQL.md`. **No se pueden cambiar, renombrar ni ampliar.** Si una pantalla
> parece necesitar un campo que no existe, se detiene el diseño y se pregunta.
> Este documento no contiene código ni SQL.
>
> **Lo que sí decide Claude Design:** el sistema de diseño completo — tipografía,
> paleta exacta, escala de espaciado, radios, sombras, iconografía y componentes.
> Una vez decidido, Claude Code Web lo respeta sin reinterpretarlo.

---

## 1. Índice

1. Índice
2. Principios
3. Las dos aplicaciones
4. Vocabulario en pantalla
5. Formatos
6. Estados globales
7. Escritorio — Mapa de pantallas
8. Escritorio — Pantalla por pantalla
9. PWA — Mapa de pantallas
10. PWA — Pantalla por pantalla
11. Flujos completos
12. Dirección visual
13. Accesibilidad
14. Qué no debe existir

---

## 2. Principios

**Denso arriba, tranquilo abajo.** El escritorio es una herramienta de trabajo, no una
página de marketing. La información cabe sin desplazamiento en lo que importa. No hay
héroes, ni ilustraciones decorativas, ni tarjetas gigantes con un solo número.

**Una pantalla, una pregunta.** El tablero del día responde «¿qué hago ahora?». La tabla
responde «¿dónde está todo?». El panel del supervisor responde «¿cómo va el equipo?».
Ninguna pantalla intenta responder las tres.

**El atraso es la única alarma.** Si todo grita, nada grita. El rojo se reserva para las
oportunidades que necesitan atención hoy. Nada más en toda la aplicación usa ese color.

**Mínimo funcional, no mínimo bonito.** Se quitan campos, no se esconden. Si un dato está,
se ve; si no aporta, no está.

**El móvil no gestiona, mira.** La PWA del supervisor es de consulta rápida y un solo
botón de acción. No hay formularios largos ni tablas de doce columnas.

---

## 3. Las dos aplicaciones

| | Escritorio | PWA móvil |
|---|---|---|
| Quién | Vendedores (10) y supervisores (2) | Supervisores (2) |
| Para qué | Trabajo diario y administración | Consulta rápida y disparo del resumen |
| Densidad | Alta | Baja, una cosa por pantalla |
| Anchura base | 1440 px, mínimo usable 1280 px | 390 px |
| Escritura | Toda la del CRM | Solo el botón de disparo |

El supervisor usa **ambas**. La gestión pesada (crear usuarios, fijar cuotas, reasignar,
archivar) vive solo en el escritorio.

---

## 4. Vocabulario en pantalla

Estas etiquetas son obligatorias y no se traducen de otra manera.

### Etapas del embudo
Nuevo · Contactado · Propuesta enviada · Negociación · Cerrado

### Estado de la oportunidad
Abierta · Ganada · Perdida

### Motivos de pérdida
Precio · No responde · Compró a la competencia · Sin presupuesto · No era el momento · Cancelación · Otro

### Canales de origen
Tienda física · WhatsApp · Instagram · Feria / showroom · Referido · Llamada entrante · Otro

### Tipos de actividad
Llamada · WhatsApp · Email · Visita · Nota

### Roles
Vendedor · Supervisor

### Palabras prohibidas
**Nunca** aparecen en ninguna pantalla, botón, menú, aviso o mensaje de confirmación:

> eliminar · borrar · suprimir · quitar definitivamente · papelera

La acción equivalente se llama siempre **«Archivar»**. Para usuarios, **«Desactivar»**.

---

## 5. Formatos

| Dato | Formato | Ejemplo |
|---|---|---|
| Importe | Separador de miles con punto, decimal con coma, símbolo al final | `1.250,00 €` |
| Importe sin decimales en listas densas | Se permite redondear en tablas | `1.250 €` |
| Fecha | `dd/mm/aaaa` | `04/09/2026` |
| Fecha relativa reciente | Se prefiere en el historial | `Hace 2 días` |
| Hora | 24 h | `07:30` |
| Teléfono | Agrupado en tres bloques | `+34 612 345 678` |
| Porcentaje de cuota | Un decimal | `68,4 %` |
| Cuota sin fijar | Nunca `0 %` | `—` |
| Días sin actividad | Con la unidad | `4 días` |

**Aviso de IVA:** el texto *«Importes sin IVA»* aparece **una sola vez por pantalla**, en
tamaño pequeño y color secundario, junto al primer importe editable. No se repite en cada
campo.

---

## 6. Estados globales

Cada pantalla que carga datos debe diseñarse en **cinco** estados. Ninguno se improvisa.

### 6.1 Cargando
Esqueletos con la forma real del contenido (filas de tabla, tarjetas), no un girador
centrado. El esqueleto ocupa el mismo espacio que el contenido final para que nada salte.

### 6.2 Vacío por primera vez
Título breve, una línea de explicación y **una sola** acción principal.
Sin ilustraciones grandes. Ejemplo: *«Aún no tienes clientes»* / *«Registra tu primer cliente para empezar a trabajar.»* / **[ Nuevo cliente ]**

### 6.3 Vacío tras filtrar
Distinto del anterior. Título: *«Sin resultados»*, explicación de qué filtros están puestos
y un enlace **[ Quitar filtros ]**. Nunca ofrece «crear»: el usuario está buscando, no creando.

### 6.4 Error
Título directo, una línea de qué pasó, botón **[ Reintentar ]**. Sin códigos técnicos ni
mensajes crudos de la base de datos. Si el error es de permisos, el mensaje es
*«No tienes permiso para ver esto.»* y no ofrece reintentar.

### 6.5 Proceso corriendo
Solo aplica al disparo del resumen matutino en la PWA. Se detalla en la sección 10.3.

### Estado adicional: guardando
Todo botón que escribe pasa a estado deshabilitado con texto **«Guardando…»** mientras dura
la petición. Nunca se permite el doble envío.

---

## 7. Escritorio — Mapa de pantallas

```
LOGIN
  └─> CAMBIO DE CONTRASEÑA (obligatorio la primera vez, sin escapatoria)
        │
        ├─ Vendedor ──> TABLERO DEL DÍA          (inicio)
        │                 ├─> OPORTUNIDADES      (tabla densa)
        │                 └─> FICHA DE CLIENTE
        │
        └─ Supervisor ─> TABLERO DEL DÍA
                          ├─> OPORTUNIDADES
                          ├─> FICHA DE CLIENTE
                          ├─> PANEL DEL EQUIPO
                          └─> ADMINISTRACIÓN
                                ├─ Usuarios
                                ├─ Cuotas
                                └─ Auditoría
```

### Estructura común

**Barra lateral izquierda, 240 px, fija.** Contiene la marca CRM-123 arriba, la navegación
en medio y el usuario abajo (nombre, rol y salir).

Navegación del **vendedor**: Tablero del día · Oportunidades · Clientes
Navegación del **supervisor**: lo anterior + Equipo · Administración

**No hay barra superior.** La cabecera de cada pantalla vive dentro del área de contenido:
título a la izquierda, acciones a la derecha, en una sola línea.

---

## 8. Escritorio — Pantalla por pantalla

### 8.1 Inicio de sesión

**Pregunta que responde:** ¿quién eres?

Tarjeta centrada, ancho máximo 400 px, sobre fondo neutro. Contiene:
- Marca CRM-123.
- Campo **Usuario** (texto, en minúsculas automáticamente, foco al cargar).
- Campo **Contraseña** con icono de mostrar/ocultar.
- Botón principal a todo el ancho: **Entrar**.

**Lo que no lleva:** enlace de registro, enlace de «he olvidado mi contraseña», acceso con
Google, casilla de «recordarme», ni ningún texto de marketing.

**Estados:**
- *Error:* franja bajo los campos, sin color de alarma agresivo, con el texto exacto *«Usuario o contraseña incorrectos.»* — idéntico para usuario inexistente, contraseña errónea y cuenta desactivada. Los campos se marcan pero la contraseña **no se borra**.
- *Enviando:* botón deshabilitado con **«Entrando…»**.
- *Bloqueo temporal:* *«Demasiados intentos. Espera unos minutos.»*

Si el usuario olvidó su contraseña, el texto de ayuda al pie dice: *«Si has olvidado tu contraseña, pídesela a tu supervisor.»*

---

### 8.2 Cambio de contraseña obligatorio

**Pregunta que responde:** elige tu contraseña antes de empezar.

Mismo formato de tarjeta centrada. **Sin barra lateral, sin navegación, sin botón de volver.**
No hay forma de saltarla.

- Título: *«Elige tu contraseña»*.
- Línea de contexto: *«Es tu primer acceso. Crea una contraseña personal para continuar.»*
- Campo **Contraseña nueva** con indicador de requisitos que se van marcando en verde: mínimo 10 caracteres, no puede contener tu nombre de usuario.
- Campo **Repite la contraseña** con validación en vivo.
- Botón: **Guardar y continuar**.

No pide la contraseña actual.

---

### 8.3 Tablero del día — pantalla de inicio del vendedor

**Pregunta que responde:** ¿qué hago ahora?

Cabecera: *«Buenos días, {nombre}»* a la izquierda; a la derecha, la fecha de hoy y el botón principal **[ + Nuevo cliente ]**.

Tres bloques apilados, en este orden exacto:

#### Bloque 1 — Atrasadas (el más prominente)
Título con contador: **Atrasadas (7)**. Es lo primero que ve y lo que más pesa visualmente.

Lista de filas compactas, una por oportunidad. Cada fila muestra:
- **Nombre del cliente** en negrita; debajo, la empresa en texto secundario si existe.
- **Etapa** como etiqueta.
- **Importe estimado**.
- **Motivo del atraso**, que es el dato clave y va destacado:
  - Si venció la próxima acción: *«Acción vencida el 02/09»*.
  - Si lleva demasiado sin actividad: *«5 días sin actividad»* (el umbral es 3 días en Nuevo y Contactado, 2 días en Propuesta enviada y Negociación).
  - Si se cumplen ambas, se muestra la acción vencida, que es más concreta.
- Al final, dos botones: **[ Registrar actividad ]** (principal) y **[ Abrir ]**.

Orden: primero las acciones vencidas, por antigüedad; después las de más días sin actividad.

Si hay más de 8, se muestran 8 y un enlace **[ Ver las 14 atrasadas ]** que lleva a la tabla ya filtrada.

*Vacío:* *«Nada atrasado. Todo tu embudo está al día.»* Este vacío es una **buena noticia** y se presenta como tal, sereno, sin ofrecer ninguna acción.

#### Bloque 2 — Para hoy
Título con contador: **Para hoy (3)**.

Mismas filas, ordenadas por la hora de la próxima acción, mostrando esa hora en lugar del motivo de atraso. Sin color de alarma: esto está bajo control.

*Vacío:* *«No tienes acciones agendadas para hoy.»*

#### Bloque 3 — Mi mes
Franja horizontal, más baja que los bloques anteriores, con cuatro cifras en línea:

| Cerrado | Meta | Falta | Avance |
|---|---|---|---|
| `12.300,00 €` | `18.000,00 €` | `5.700,00 €` | `68,3 %` |

Debajo, una barra de progreso fina de ancho completo. Y en texto pequeño: *«3 oportunidades ganadas este mes.»*

*Sin cuota fijada:* la barra no se dibuja; en su lugar, *«Tu supervisor aún no ha fijado tu meta de este mes.»* y el avance muestra `—`.

Al pie del tablero, un enlace discreto: **[ Ver todas mis oportunidades ]**.

---

### 8.4 Oportunidades — tabla densa

**Pregunta que responde:** ¿dónde está todo?

Esta es la pantalla más densa de la aplicación y así debe verse.

**Barra de filtros** en una sola línea sobre la tabla:
- Buscador por nombre de cliente, empresa o teléfono.
- Desplegable **Etapa** (Todas · Nuevo · Contactado · Propuesta enviada · Negociación).
- Desplegable **Estado** (Abiertas · Ganadas · Perdidas · Todas). Por defecto: **Abiertas**.
- Interruptor **Solo atrasadas**.
- A la derecha, el contador de resultados: *«24 oportunidades»*.

**Columnas**, en este orden:

| Columna | Contenido | Ordenable |
|---|---|---|
| (señal) | Punto de atraso, sin texto | No |
| Cliente | Nombre en negrita, empresa debajo en secundario | Sí |
| Teléfono | `+34 612 345 678` | No |
| Etapa | Etiqueta de color neutro | Sí |
| Importe | Alineado a la derecha | Sí |
| Última actividad | `Hace 3 días` | Sí |
| Próxima acción | `05/09 10:00`, en rojo si venció | Sí |
| Canal | Texto secundario | Sí |
| (acciones) | Botón de tres puntos | No |

Filas de 44 px, alternancia sutil de fondo, cabecera fija al desplazar. Toda la fila es
pulsable y abre la ficha del cliente.

Menú de tres puntos: **Registrar actividad** · **Cambiar etapa** · **Marcar como ganada** ·
**Marcar como perdida** · **Abrir ficha**.

Paginación de 50 en 50 al pie.

**Para el supervisor**, y solo para él, aparecen dos elementos más: una columna **Vendedor**
tras Cliente, y un desplegable **Vendedor** en la barra de filtros. Para el vendedor, ni la
columna ni el filtro existen: no hay nada que ocultar porque nunca se dibujan.

*Vacío por filtro:* *«Sin resultados»* + **[ Quitar filtros ]**.

---

### 8.5 Ficha de cliente

**Pregunta que responde:** todo lo que sé de esta persona.

Dos columnas: izquierda 40 %, derecha 60 %.

#### Columna izquierda — Identidad y oportunidad

**Bloque de identidad.** Nombre grande, empresa debajo. Luego, en pares etiqueta/valor:
Teléfono (con acción de copiar) · Canal · Cliente desde · Vendedor (solo lo ve el supervisor).
Botón discreto **[ Editar ]**.

**Bloque de la oportunidad abierta.** Si existe:
- Etapa actual como **selector de etapa**: cinco pasos horizontales; el vendedor pulsa uno y avanza. La etapa Cerrado no es seleccionable desde aquí.
- Importe estimado, editable en línea.
- Próxima acción con fecha y hora, editable.
- Señal de atraso si aplica.
- Dos botones de cierre, visualmente **secundarios y separados** del resto: **[ Marcar como ganada ]** y **[ Marcar como perdida ]**.

Si no hay oportunidad abierta: **[ + Nueva oportunidad ]**.
Si el cliente tiene una abierta, ese botón **no existe** — no aparece deshabilitado, no aparece en absoluto.

**Bloque de historial de ventas.** Lista de oportunidades cerradas: fecha de cierre,
resultado (Ganada / Perdida), importe si fue ganada, motivo si fue perdida. Es el activo
del negocio: el cliente que repite.

*Vacío:* *«Sin ventas cerradas todavía.»*

**Acciones de supervisor**, al pie de la columna y visualmente apartadas:
**[ Reasignar a otro vendedor ]** · **[ Archivar cliente ]**.

#### Columna derecha — Actividad

Arriba, siempre visible, el **formulario de registro de actividad**:
- Selector de tipo: cinco botones (Llamada · WhatsApp · Email · Visita · Nota).
- Área de texto **«¿Qué ha pasado?»**, 3 líneas.
- Campo opcional **«Próxima acción»** con fecha y hora.
- Botón **[ Registrar ]**.

Debajo, el **historial** en línea de tiempo vertical, del más reciente al más antiguo:
icono del tipo, texto de la actividad, autor y fecha relativa (`Hace 2 días`).

**El historial no tiene botones de editar ni de archivar en ninguna de sus entradas.** No
están escondidos ni desactivados: no existen. Al pie de la lista, en texto pequeño:
*«El historial no se puede modificar.»*

*Cliente archivado:* franja informativa arriba: *«Este cliente está archivado.»* Toda la
pantalla pasa a solo lectura; el formulario de actividad desaparece. Para el supervisor,
aparece **[ Desarchivar ]**.

---

### 8.6 Ventanas de acción

Todas son diálogos modales pequeños, centrados, con un solo cometido.

#### Nuevo cliente
Campos, en este orden:
1. **Teléfono*** — con `+34` fijo a la izquierda. Se valida al salir del campo.
2. **Nombre*** — texto.
3. **Empresa** — texto, opcional.
4. **Canal** — desplegable, opcional.

Botones: **[ Cancelar ]** · **[ Crear cliente ]**.

**Estado clave: teléfono duplicado.** Al salir del campo de teléfono, si ya existe en el
sistema y pertenece a otro vendedor, aparece bajo el campo:

> ⚠ **Este cliente ya existe en el sistema y lo lleva otro compañero.**

El botón de crear queda deshabilitado. **No se muestra el nombre del cliente, ni la empresa,
ni quién lo lleva, ni ningún otro dato.** Esta ventana es la frontera del aislamiento entre
vendedores y el diseño no puede erosionarla ni por curiosidad ni por amabilidad.

Si el cliente existente **es suyo**, el mensaje cambia: *«Ya tienes a este cliente registrado.»* con un enlace **[ Abrir su ficha ]**.

#### Nueva oportunidad
1. **Importe estimado*** — en euros, con la nota *«Importes sin IVA»* debajo.
2. **Próxima acción** — fecha y hora, opcional.

La etapa arranca siempre en **Nuevo** y no se puede elegir.

#### Marcar como ganada
- Texto: *«Confirma el importe final de la venta.»*
- Campo **Importe final***, precargado con el estimado, editable.
- Nota: *«Este importe cuenta para tu meta del mes. Sin IVA.»*
- Botones: **[ Cancelar ]** · **[ Confirmar venta ]**.

Al cerrarse, aviso de éxito breve: *«Venta registrada: 1.250,00 €. Llevas el 74,2 % de tu meta.»*

#### Marcar como perdida
- **Motivo*** — desplegable obligatorio con los siete valores. Sin opción preseleccionada.
- **Nota** — texto libre, opcional, máximo 500 caracteres.
- Botones: **[ Cancelar ]** · **[ Marcar como perdida ]**.

El botón de confirmar está deshabilitado hasta que se elige un motivo.

#### Reasignar cliente (solo supervisor)
- Desplegable de vendedores activos.
- Aviso: *«Se traspasarán también sus oportunidades y su historial.»*
- Botones: **[ Cancelar ]** · **[ Reasignar ]**.

#### Archivar cliente (solo supervisor)
- Texto: *«El cliente dejará de aparecer en las listas. Su historial se conserva y puedes desarchivarlo cuando quieras.»*
- Botones: **[ Cancelar ]** · **[ Archivar ]**.

**No dice «eliminar». No advierte de que es irreversible, porque no lo es.**

---

### 8.7 Panel del equipo (solo supervisor)

**Pregunta que responde:** ¿cómo va el equipo?

**Franja superior — El equipo este mes.** Cuatro cifras en línea: Cerrado del equipo ·
Meta del equipo · Avance · Oportunidades atrasadas en total.

**Tabla de vendedores.** Una fila por vendedor:

| Vendedor | Cerrado | Meta | Avance | Ganadas | Atrasadas |
|---|---|---|---|---|---|

La columna **Avance** es una barra fina con el porcentaje al lado.
La columna **Atrasadas** destaca cuando es alta.
Pulsar una fila lleva a la tabla de oportunidades filtrada por ese vendedor.

**Bloque de motivos de pérdida del mes.** Lista simple, ordenada por frecuencia:
motivo · número de casos · importe estimado perdido. Sin gráfico circular.

*Vacío:* *«Ninguna oportunidad perdida este mes.»*

---

### 8.8 Administración (solo supervisor)

Tres pestañas: **Usuarios** · **Cuotas** · **Auditoría**.

#### Usuarios
Tabla: Usuario · Nombre · Email · Rol · Estado · Último acceso · (acciones).
Botón **[ + Nuevo usuario ]**.

*Ventana de nuevo usuario:* Nombre completo* · Nombre de usuario* (minúsculas, sin espacios,
con validación de disponibilidad en vivo) · Email* (con la nota *«Solo se usa para enviarle el
resumen matutino. El usuario nunca lo verá.»*) · Rol* · Contraseña inicial* (con botón de
generar) · Meta de este mes (opcional).

*Al crear*, una pantalla de confirmación muestra el usuario y la contraseña con un botón de
copiar y el aviso destacado:

> **Entrega esta contraseña al usuario en persona. No volverá a mostrarse.**
> *Se le pedirá cambiarla en su primer acceso.*

Acciones por fila: **Editar** · **Restablecer contraseña** · **Desactivar** / **Reactivar**.
La palabra «eliminar» no aparece.

#### Cuotas
Selector de mes y año arriba. Tabla con una fila por vendedor y la meta editable en línea, en euros. Al pie, el total del equipo. Botón **[ Guardar cambios ]**.

Acción de conveniencia: **[ Copiar las metas del mes anterior ]**.

#### Auditoría
Tabla de solo lectura: Fecha y hora · Quién · Qué hizo · Sobre qué · Detalle.
Filtros: rango de fechas · tipo de entidad · usuario.
Sin acciones por fila. Sin botón de exportar en esta versión.

---

## 9. PWA — Mapa de pantallas

```
LOGIN
  └─> PANEL  (inicio, todo en una pantalla)
        ├─> DETALLE DE VENDEDOR
        └─> ENVÍO DEL RESUMEN  (hoja inferior)
```

Navegación inferior de dos elementos: **Panel** · **Equipo**. Nada más.
Solo entran supervisores. Si un vendedor lo intenta: *«Esta aplicación es solo para supervisores. Entra desde el escritorio.»*

---

## 10. PWA — Pantalla por pantalla

### 10.1 Panel

**Pregunta que responde:** ¿cómo va el equipo, en diez segundos?

De arriba abajo, en una sola columna:

**1. Cabecera.** *«El equipo hoy»* y la fecha.

**2. Tarjeta del equipo.** El avance del mes como una cifra grande y una barra fina.
Debajo, en pequeño: `Cerrado 61.400 € · Meta 90.000 €`.

**3. Tarjeta de alerta.** Solo aparece si hay atrasos:
> **18 oportunidades atrasadas** en 4 vendedores.

**4. Semáforo del equipo.** Una fila por vendedor, con: nombre, barra de avance, porcentaje
y, a la derecha, el número de atrasadas. Ordenados por avance, de menor a mayor —
**el que necesita ayuda va arriba**, no el que va ganando.

**5. Botón de acción**, fijo al pie de la pantalla: **[ Enviar resumen matutino ahora ]**.

**6. Bajo el botón**, en texto pequeño: *«Último envío: hoy a las 07:30 · 10 correos.»*

*Vacío total (sin vendedores con cuota):* *«Aún no has fijado las metas del mes. Hazlo desde el escritorio.»*

---

### 10.2 Detalle de vendedor

Se abre al pulsar una fila del semáforo. Muestra: nombre, avance del mes con las cuatro
cifras, número de oportunidades atrasadas y una lista corta de sus atrasadas (cliente, etapa,
días sin actividad).

**Solo lectura.** No hay ninguna acción de escritura en esta pantalla.

---

### 10.3 Envío del resumen — el estado «proceso corriendo»

Este es el único proceso largo de todo el sistema y necesita los cuatro estados diseñados
con cuidado. Se presenta como una **hoja inferior** que sube desde el borde de la pantalla.

#### Estado A — Confirmación
> **Enviar el resumen matutino**
> Se enviará un correo a cada vendedor activo con sus oportunidades atrasadas, sus acciones de hoy y su avance de meta.
>
> **[ Cancelar ]** · **[ Enviar ahora ]**

#### Estado B — Corriendo
La hoja no se puede cerrar. El botón desaparece.
> **Enviando resúmenes…**
> Indicador de progreso indeterminado.
> *«Esto tarda menos de un minuto. Puedes cerrar la aplicación, el envío continuará.»*

#### Estado C — Terminado bien
> ✓ **Resúmenes enviados**
> *10 correos enviados a las 09:42.*
> **[ Cerrar ]**

#### Estado D — Terminado mal
> ✕ **No se han podido enviar**
> *El envío ha fallado. Vuelve a intentarlo en unos minutos.*
> **[ Cerrar ]** · **[ Reintentar ]**

Sin detalles técnicos, sin códigos de error.

#### Estado E — Bloqueado por el límite
Si ya se envió hace menos de 10 minutos, al pulsar el botón principal no se abre la hoja.
Aparece un aviso breve:
> **Ya has enviado el resumen hace 4 minutos.** Podrás volver a enviarlo a las 09:52.

Este estado es importante: protege de los correos duplicados y debe verse como una
protección amable, no como un error.

---

## 11. Flujos completos

### F1 — La mañana del vendedor
Entra → Tablero del día → ve 7 atrasadas → pulsa **[ Registrar actividad ]** en la primera →
ventana rápida: tipo Llamada, texto, próxima acción el jueves → **[ Registrar ]** → la fila
desaparece del bloque de atrasadas → el contador baja a 6.

**Detalle de diseño clave:** registrar la actividad desde el tablero **no debe sacar al
vendedor de la pantalla**. Es una ventana modal, no una navegación. El ritmo de la mañana
depende de poder despachar siete atrasadas sin cambiar de contexto.

### F2 — Cliente nuevo que ya existe
Pulsa **[ + Nuevo cliente ]** → escribe el teléfono → sale del campo → aviso *«Este cliente ya
existe en el sistema y lo lleva otro compañero.»* → el botón de crear se deshabilita → cierra
la ventana. **No ha visto ni un dato del cliente ajeno.**

### F3 — Cierre de una venta
Ficha del cliente → **[ Marcar como ganada ]** → confirma el importe final (`1.180,00 €` en
lugar de los `1.250,00 €` estimados, por un descuento) → **[ Confirmar venta ]** → aviso de
éxito con el nuevo porcentaje de meta → la oportunidad pasa al historial y el botón
**[ + Nueva oportunidad ]** vuelve a aparecer.

### F4 — Cierre de una pérdida
**[ Marcar como perdida ]** → el botón de confirmar está apagado → elige **Precio** → se
enciende → escribe una nota → **[ Marcar como perdida ]** → pasa al historial.

### F5 — El supervisor y el resumen que no llegó
Abre la PWA → ve *«Último envío: falló a las 07:30»* → pulsa **[ Enviar resumen matutino
ahora ]** → confirma → estado corriendo → *«10 correos enviados a las 09:42.»*

### F6 — Primer acceso de un vendedor nuevo
El supervisor le da usuario y contraseña en persona → entra → **cambio de contraseña
obligatorio, sin escapatoria** → tablero del día vacío → *«Aún no tienes clientes»* →
**[ + Nuevo cliente ]**.

---

## 12. Dirección visual

**Claude Design decide el sistema completo.** Lo que sigue es la intención, no la
especificación: define el carácter que debe tener el resultado, no sus valores exactos.

### Carácter
Herramienta de trabajo, sobria y profesional. Cerca de un panel financiero o un sistema de
gestión bien hecho; lejos de una aplicación de consumo con degradados y esquinas muy
redondeadas. El equipo mira estas pantallas seis horas al día: deben cansar poco.

El sector es calzado y moda, pero **el CRM no es una tienda**. No hay fotografía de producto,
ni tipografía editorial, ni paleta de temporada. La sobriedad es lo que hace que los datos
se lean rápido.

### Color
- **Base neutra dominante.** Grises y blancos hacen casi todo el trabajo.
- **Un solo color de marca**, usado con moderación: acciones principales, elementos activos de navegación, barras de progreso.
- **Rojo o ámbar reservado exclusivamente al atraso.** Ningún otro elemento de la aplicación puede usarlo. Es la regla de color más importante del sistema.
- **Verde solo para el éxito de una venta ganada.** Ni para «todo bien», ni para estados neutros.
- **Las etapas del embudo son neutras**, diferenciadas por peso y no por color. Cinco etapas con cinco colores convierten la tabla en un arcoíris ilegible.

### Tipografía
Una sola familia, sin serifas, con buenos números. **Los importes deben ir en cifras de
ancho fijo** para que las columnas de la tabla se alineen verticalmente; leer una columna de
importes desalineados es el defecto más común de un CRM mal hecho.

Tres tamaños de texto para el cuerpo y dos para los títulos. No más.

### Densidad
- Escritorio: filas de tabla de 44 px, espaciado interior contenido, márgenes estrechos. Cabe mucho y está bien.
- PWA: espaciado generoso, objetivos de pulsación de 48 px como mínimo.

### Movimiento
Casi ninguno. Transiciones de 150 ms en estados de pulsación y en la apertura de ventanas.
Sin animaciones de entrada, sin números que cuentan, sin barras que se llenan solas.

### La señal de atraso
Merece su propia decisión de diseño porque es el elemento más importante de la interfaz.
Debe reconocerse **de un vistazo, desde lejos y sin leer**, y **no puede depender solo del
color**: siempre va acompañada del texto que explica el motivo (`5 días sin actividad`,
`Acción vencida el 02/09`). Un usuario con daltonismo tiene que poder trabajar igual de bien.

---

## 13. Accesibilidad

- Contraste mínimo AA en todo el texto. El texto secundario también.
- **Ninguna información transmitida solo por color.** El atraso siempre lleva texto.
- Todo lo interactivo se alcanza con el teclado y muestra un anillo de foco visible.
- El orden de tabulación en los formularios sigue el orden visual.
- Toda ventana modal atrapa el foco y se cierra con `Esc` — salvo la hoja de envío en estado corriendo.
- Todo campo tiene etiqueta visible. Nunca se usa el texto de marcador de posición como etiqueta.
- Los errores de validación se anuncian a los lectores de pantalla y se asocian a su campo.
- En la PWA, ningún objetivo de pulsación baja de 48 px.

---

## 14. Qué no debe existir

Ninguno de estos elementos aparece en ninguna pantalla, ni siquiera desactivado o escondido:

1. La palabra **eliminar**, **borrar** o **suprimir**, en cualquier contexto.
2. Un icono de papelera.
3. Un botón de editar o de archivar en una entrada del historial de actividades.
4. Cualquier campo de DPI, NIT, DNI, NIE, CIF, pasaporte o identificador fiscal.
5. Un ranking, comparativa o listado de compañeros en la vista del vendedor.
6. El nombre, la empresa o el propietario de un cliente ajeno en el aviso de teléfono duplicado.
7. La columna «Vendedor» o el filtro por vendedor en la vista del vendedor.
8. Un enlace de registro o de recuperación de contraseña en el inicio de sesión.
9. La posibilidad de saltarse el cambio de contraseña del primer acceso.
10. El botón «Nueva oportunidad» cuando el cliente ya tiene una abierta.
11. Un botón para reabrir una oportunidad cerrada.
12. Mensajes de error con códigos técnicos o texto de la base de datos.
13. Formularios de gestión (usuarios, cuotas, reasignación) en la PWA.
14. Cualquier campo, estado o valor de lista que no aparezca en `SCRIPTS-SQL.md`.
