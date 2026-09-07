import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const destino = path.join(aqui, '..', 'capturas');

const PANTALLAS = [
  ['c01', '01-escritorio-inicio-sesion'],
  ['c02', '02-escritorio-credenciales-incorrectas'],
  ['c03', '03-escritorio-cambiar-contrasena'],
  ['c04', '04-vendedor-tablero-del-dia'],
  ['c05', '05-vendedor-tablero-sin-atrasos'],
  ['c06', '06-vendedor-oportunidades'],
  ['c07', '07-vendedor-clientes'],
  ['c08', '08-vendedor-ficha-de-cliente'],
  ['c09', '09-vendedor-confirmar-venta'],
  ['c10', '10-supervisor-equipo'],
  ['c11', '11-supervisor-admin-usuarios'],
  ['c12', '12-supervisor-contrasena-una-sola-vez'],
  ['c13', '13-supervisor-admin-cuotas'],
  ['c14', '14-supervisor-admin-auditoria'],
  ['c15', '15-pwa-inicio-sesion'],
  ['c16', '16-pwa-panel'],
  ['c17', '17-pwa-detalle-vendedor'],
  ['c18', '18-pwa-hoja-a-confirmacion'],
  ['c19', '19-pwa-hoja-b-enviando'],
  ['c20', '20-pwa-hoja-c-enviado'],
  ['c21', '21-pwa-estado-e-bloqueado'],
  ['c22', '22-correo-resumen-matutino'],
];

const navegador = await chromium.launch({
  // El navegador que trae el entorno, no el que espera esta versión de Playwright.
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const pagina = await navegador.newPage({ deviceScaleFactor: 2 });

await pagina.goto('file://' + path.join(aqui, 'pantallas.html'));
// Sin esperar a la tipografía, las capturas salen con la fuente de reserva.
// `font-display: swap` pinta primero con la fuente de reserva. Sin forzar la
// carga de cada peso, las capturas salen con la tipografía equivocada: pasó.
await pagina.evaluate(async () => {
  await Promise.all(
    ['300', '400', '600', '700'].map((peso) =>
      document.fonts.load(`${peso} 40px "Source Serif 4"`),
    ),
  );
  await document.fonts.ready;
});
await pagina.waitForTimeout(600);

for (const [id, nombre] of PANTALLAS) {
  const elemento = await pagina.$('#' + id);
  if (!elemento) {
    console.log(' FALTA', id);
    continue;
  }
  const archivo = path.join(destino, nombre + '.png');
  await elemento.screenshot({ path: archivo });
  const caja = await elemento.boundingBox();
  console.log(`  ${nombre}.png`.padEnd(50), `${Math.round(caja.width)}×${Math.round(caja.height)}`);
}

await navegador.close();
console.log('\n' + PANTALLAS.length + ' capturas generadas.');
