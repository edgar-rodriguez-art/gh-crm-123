# Maqueta de las capturas

Genera las imágenes de `docs/capturas/` que ilustran los manuales de usuario.

## Qué son y qué no son

Son **maquetas fieles**, no capturas de la aplicación en marcha. Usan el mismo
Tailwind, los mismos tokens de Broadsheet y las mismas clases y textos que el
código de `web/` y `pwa/`, pero el marcado está escrito a mano en
`pantallas.html`.

Se hicieron así porque el entorno donde se construyeron no tenía salida de red
hacia la aplicación desplegada ni hacia Supabase, y un manual no debe llevar
datos reales de todas formas. Los nombres, importes y fechas son inventados.

**Si la interfaz cambia, estas maquetas no se enteran.** Cuando exista un
entorno de demostración estable, lo correcto es sustituirlas por capturas de
verdad tomadas de ahí.

## Cómo regenerarlas

```bash
node docs/maqueta-capturas/preparar-fuente.mjs      # 1 · la tipografía
npx tailwindcss -c docs/maqueta-capturas/tailwind.config.ts \
                -i docs/maqueta-capturas/entrada.css \
                -o docs/maqueta-capturas/salida.css --minify   # 2 · el CSS
node docs/maqueta-capturas/capturar.mjs             # 3 · las 21 imágenes
```

## Dos cosas que costaron y conviene no repetir

**La tipografía se incrusta en base64.** Chromium bloquea por CORS las fuentes
cargadas desde `file://`, así que un `@font-face` que apunte a un archivo del
disco se registra pero nunca llega a aplicarse, y las capturas salen con la
fuente del sistema sin que nada avise.

**Hay que descargar el subconjunto `latin`, no solo `latin-ext`.** Con solo
`latin-ext` se registran caras que no cubren U+0000‑00FF, o sea las letras
corrientes, y el resultado es el mismo: fuente de reserva en silencio.
`preparar-fuente.mjs` lo comprueba y falla si falta.

**Y hay que forzar la carga antes de capturar.** Con `font-display: swap` el
navegador pinta primero con la fuente de reserva; `capturar.mjs` espera a que
cada peso esté cargado.

## Archivos

| | |
|---|---|
| `pantallas.html` | Las 21 pantallas. Es lo único que se edita a mano |
| `entrada.css` | Tokens + directivas de Tailwind |
| `tailwind.config.ts` | El mismo tema que `web/`, con otro `content` |
| `preparar-fuente.mjs` | Descarga Source Serif 4 y la incrusta |
| `capturar.mjs` | Renderiza cada pantalla a PNG con Chromium |
| `salida.css`, `fuente-local.css` | Generados. No se versionan |
