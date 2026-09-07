/**
 * Descarga Source Serif 4 (subconjuntos latinos) y la incrusta en un CSS.
 *
 * Se incrusta en base64 a propósito: Chromium bloquea por CORS las tipografías
 * cargadas desde `file://`, así que un @font-face que apunte a un archivo del
 * disco no llega a aplicarse nunca.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const API =
  'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap';

const bajar = (url, salida) =>
  execFileSync('curl', ['-sS', '--max-time', '40', '-A', UA, '-o', salida, url]);

const css = execFileSync('curl', ['-sS', '--max-time', '40', '-A', UA, API]).toString();

// Solo latin y latin-ext: es un manual en español.
const bloques = css
  .split('/*')
  .filter((b) => /^\s*(latin|latin-ext)\s*\*\//.test(b))
  .map((b) => '/*' + b.trim());

const urls = [...new Set(bloques.join('\n').match(/https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2/g))];
console.log('bloques latinos:', bloques.length, '· archivos distintos:', urls.length);

const porUrl = new Map();
urls.forEach((url, i) => {
  const archivo = path.join(aqui, `f${i}.woff2`);
  bajar(url, archivo);
  const datos = fs.readFileSync(archivo);
  if (datos.subarray(0, 4).toString('latin1') !== 'wOF2') {
    throw new Error(`El archivo ${i} no es un woff2 válido (${datos.length} bytes).`);
  }
  porUrl.set(url, `data:font/woff2;base64,${datos.toString('base64')}`);
  fs.unlinkSync(archivo);
  console.log(`  f${i}`, datos.length, 'bytes  ok');
});

let salida = bloques.join('\n\n');
for (const [url, dato] of porUrl) salida = salida.split(url).join(dato);

if (/fonts\.gstatic\.com/.test(salida)) throw new Error('Ha quedado alguna URL remota sin sustituir.');

// Comprobación que se nos escapó la primera vez: sin el subconjunto `latin`
// para los pesos normales, las letras corrientes no tienen fuente y el
// navegador cae a la del sistema sin avisar de nada.
const normalesLatin = salida
  .split('@font-face')
  .filter((b) => /font-style:\s*normal/.test(b) && /U\+0000-00FF|U\+0-FF/.test(b));
if (normalesLatin.length === 0) {
  throw new Error('Falta el subconjunto «latin» para los pesos normales.');
}
console.log('caras normales con el subconjunto latin:', normalesLatin.length);

fs.writeFileSync(path.join(aqui, 'fuente-local.css'), salida + '\n');
console.log('fuente-local.css →', Math.round(salida.length / 1024), 'KB');
