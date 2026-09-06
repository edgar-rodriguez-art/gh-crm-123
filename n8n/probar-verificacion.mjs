/**
 * Pasa el nodo «Verificar firma» por los mismos casos que la prueba 21-24 de
 * BUILD_PLAN §4.7, firmando con el MISMO algoritmo que packages/core/src/hmac.ts.
 */
import fs from 'node:fs';
import nodeCrypto from 'node:crypto';
import { createRequire } from 'node:module';

const flujo = JSON.parse(fs.readFileSync(new URL('./morning-digest.json', import.meta.url), 'utf8'));
const codigoDe = (nombre) => flujo.nodes.find((n) => n.name === nombre).parameters.jsCode;

const jsCode = codigoDe('Verificar firma');
const prepararCode = codigoDe('Preparar contexto');
const firmarCode = codigoDe('Firmar petición de datos');

/**
 * Los dos entornos donde tiene que funcionar el mismo código.
 *
 * `n8n Cloud` es el que rompió en producción: su sandbox no expone `crypto`
 * como variable global —da «crypto is not defined»— pero sí deja usar
 * `require('crypto')`. Se simula quitando el global Y sombreando `globalThis`,
 * porque si no, el de Node se colaría y la prueba no probaría nada.
 */
const ENTORNOS = {
  'crypto global': { crypto: globalThis.crypto, globalThis, require: undefined },
  'n8n Cloud (solo require)': {
    crypto: undefined,
    globalThis: {},
    require: createRequire(import.meta.url),
  },
};

const SECRETO = 'a'.repeat(64);

/** Idéntico a `firmar()` de hmac.ts. */
function firmar(ts, nonce, cuerpo, secreto) {
  return (
    'sha256=' +
    nodeCrypto.createHmac('sha256', secreto).update(`${ts}.${nonce}.${cuerpo}`, 'utf8').digest('hex')
  );
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

/** Ejecuta el jsCode del nodo con el entorno que n8n le da. */
async function ejecutar(code, { vars, item, estado, entorno = ENTORNOS['crypto global'] }) {
  const fn = new AsyncFunction(
    '$vars', '$input', '$getWorkflowStaticData',
    'crypto', 'globalThis', 'require', 'Buffer', 'TextEncoder', 'TextDecoder',
    code,
  );
  return fn(
    vars,
    { first: () => item },
    () => estado,
    entorno.crypto,
    entorno.globalThis,
    entorno.require,
    Buffer,
    TextEncoder,
    TextDecoder,
  );
}

function peticion({ cuerpo, secreto = SECRETO, ts, nonce, sinCabeceras = false, cuerpoEnviado }) {
  const marca = ts ?? String(Math.floor(Date.now() / 1000));
  const n = nonce ?? nodeCrypto.randomUUID();
  const firmado = cuerpoEnviado ?? cuerpo;
  const headers = sinCabeceras
    ? {}
    : {
        'x-crm123-timestamp': marca,
        'x-crm123-nonce': n,
        'x-crm123-signature': firmar(marca, n, cuerpo, secreto),
      };
  return {
    json: { headers },
    binary: { data: { data: Buffer.from(firmado, 'utf8').toString('base64') } },
  };
}

const CUERPO = JSON.stringify({ run_id: '11111111-2222-4333-8444-555555555555', flow: 'morning_digest', trigger: 'manual' });

let fallos = 0;
async function caso(nombre, esperado, fn) {
  let resultado;
  try {
    const salida = await fn();
    resultado = { ok: true, salida };
  } catch (e) {
    resultado = { ok: false, error: e.message };
  }
  const pasa = esperado === 'acepta' ? resultado.ok : !resultado.ok;
  if (!pasa) fallos++;
  const detalle = resultado.ok ? 'aceptada' : resultado.error;
  console.log(`${pasa ? '  ok  ' : ' FALLA'} · ${nombre.padEnd(46)} ${detalle}`);
  return resultado;
}

const estado = {};

console.log('\n— Verificar firma —\n');

const r1 = await caso('firma válida', 'acepta', () =>
  ejecutar(jsCode, { vars: { N8N_SHARED_SECRET: SECRETO }, item: peticion({ cuerpo: CUERPO }), estado }),
);

await caso('sin cabeceras de firma (prueba 21)', 'rechaza', () =>
  ejecutar(jsCode, { vars: { N8N_SHARED_SECRET: SECRETO }, item: peticion({ cuerpo: CUERPO, sinCabeceras: true }), estado }),
);

await caso('firma inventada (prueba 22)', 'rechaza', () =>
  ejecutar(jsCode, {
    vars: { N8N_SHARED_SECRET: SECRETO },
    item: peticion({ cuerpo: CUERPO, secreto: 'b'.repeat(64) }),
    estado,
  }),
);

await caso('capturada y repetida a los 6 min (prueba 23)', 'rechaza', () =>
  ejecutar(jsCode, {
    vars: { N8N_SHARED_SECRET: SECRETO },
    item: peticion({ cuerpo: CUERPO, ts: String(Math.floor(Date.now() / 1000) - 360) }),
    estado,
  }),
);

// Prueba 24: mismo nonce dentro de la ventana.
const nonceFijo = nodeCrypto.randomUUID();
await caso('primer uso de un nonce', 'acepta', () =>
  ejecutar(jsCode, { vars: { N8N_SHARED_SECRET: SECRETO }, item: peticion({ cuerpo: CUERPO, nonce: nonceFijo }), estado }),
);
await caso('mismo nonce, dentro de la ventana (prueba 24)', 'rechaza', () =>
  ejecutar(jsCode, { vars: { N8N_SHARED_SECRET: SECRETO }, item: peticion({ cuerpo: CUERPO, nonce: nonceFijo }), estado }),
);

await caso('cuerpo alterado tras firmar', 'rechaza', () =>
  ejecutar(jsCode, {
    vars: { N8N_SHARED_SECRET: SECRETO },
    item: peticion({ cuerpo: CUERPO, cuerpoEnviado: CUERPO.replace('manual', 'scheduled') }),
    estado,
  }),
);

await caso('POST vacío de un desconocido (el agujero)', 'rechaza', () =>
  ejecutar(jsCode, {
    vars: { N8N_SHARED_SECRET: SECRETO },
    item: { json: { headers: {} }, binary: { data: { data: Buffer.from('{}').toString('base64') } } },
    estado,
  }),
);

await caso('secreto cambiado solo en Vercel (prueba 25)', 'rechaza', () =>
  ejecutar(jsCode, {
    vars: { N8N_SHARED_SECRET: 'c'.repeat(64) },
    item: peticion({ cuerpo: CUERPO }),
    estado,
  }),
);

await caso('sin «Raw Body» activado', 'rechaza', () =>
  ejecutar(jsCode, {
    vars: { N8N_SHARED_SECRET: SECRETO },
    item: { json: { headers: peticion({ cuerpo: CUERPO }).json.headers, body: JSON.parse(CUERPO) } },
    estado,
  }),
);

// El nodo siguiente tiene que seguir entendiendo lo que sale de aquí.
console.log('\n— Preparar contexto, con la salida real del nodo anterior —\n');

const salidaPreparar = await ejecutar(prepararCode, {
  vars: {},
  item: r1.salida[0],
  estado,
});
const ctx = salidaPreparar[0].json;
const bienManual =
  ctx.run_id === '11111111-2222-4333-8444-555555555555' && ctx.trigger === 'manual';
if (!bienManual) fallos++;
console.log(`${bienManual ? '  ok  ' : ' FALLA'} · disparo manual conserva run_id y trigger    ${JSON.stringify(ctx)}`);

const salidaCron = await ejecutar(prepararCode, {
  vars: {},
  item: { json: { timestamp: Date.now() } },
  estado,
});
const cron = salidaCron[0].json;
const bienCron = cron.trigger === 'scheduled' && typeof cron.run_id === 'string' && cron.run_id.length === 36;
if (!bienCron) fallos++;
console.log(`${bienCron ? '  ok  ' : ' FALLA'} · el cron sigue generando su run_id            ${JSON.stringify(cron)}`);

/* ────────────────────────────────────────────────────────────────────
 * De dónde sale `crypto`
 *
 * En producción esto reventó con «crypto is not defined [línea 76]»: el
 * sandbox de n8n Cloud no lo expone como global. Los cinco nodos de código
 * tienen que funcionar en los dos entornos, así que se prueban en los dos.
 * ──────────────────────────────────────────────────────────────────── */
for (const [nombre, entorno] of Object.entries(ENTORNOS)) {
  console.log(`\n— Entorno: ${nombre} —\n`);
  const estadoAparte = {};

  await caso(`${nombre} · Verificar firma acepta una firma válida`, 'acepta', () =>
    ejecutar(jsCode, {
      vars: { N8N_SHARED_SECRET: SECRETO },
      item: peticion({ cuerpo: CUERPO }),
      estado: estadoAparte,
      entorno,
    }),
  );

  await caso(`${nombre} · Verificar firma rechaza una inventada`, 'rechaza', () =>
    ejecutar(jsCode, {
      vars: { N8N_SHARED_SECRET: SECRETO },
      item: peticion({ cuerpo: CUERPO, secreto: 'b'.repeat(64) }),
      estado: estadoAparte,
      entorno,
    }),
  );

  await caso(`${nombre} · Preparar contexto genera run_id`, 'acepta', () =>
    ejecutar(prepararCode, { vars: {}, item: { json: {} }, estado: estadoAparte, entorno }),
  );

  // El nodo que firma la salida: su firma tiene que ser la que la aplicación
  // espera, byte a byte. Si no, `digest-payload` respondería 401.
  const salida = await ejecutar(firmarCode, {
    vars: { N8N_SHARED_SECRET: SECRETO, APP_BASE_URL: 'https://crm.ejemplo.es' },
    item: { json: { run_id: 'r-1', flow: 'morning_digest', trigger: 'manual' } },
    estado: estadoAparte,
    entorno,
  });
  const s = salida[0].json;
  const esperada = firmar(s.timestamp, s.nonce, '', SECRETO);
  const cuadra = s.signature === esperada;
  if (!cuadra) fallos++;
  console.log(
    `${cuadra ? '  ok  ' : ' FALLA'} · ${`${nombre} · Firmar petición produce la firma correcta`.padEnd(46)} ${
      cuadra ? s.signature.slice(0, 22) + '…' : `${s.signature} ≠ ${esperada}`
    }`,
  );
}


/* ────────────────────────────────────────────────────────────────────
 * APP_BASE_URL con una ruta pegada
 *
 * En producción la variable llevaba `/login` porque se copió de la barra del
 * navegador. La llamada acabó en `/login/api/n8n/digest-payload` y la
 * aplicación respondió 404, un error que no se parece a su causa.
 * ──────────────────────────────────────────────────────────────────── */
console.log('\n— APP_BASE_URL: se queda con el origen —\n');

for (const [entrada, esperada] of [
  ['https://gh-crm-123-web.vercel.app', 'https://gh-crm-123-web.vercel.app'],
  ['https://gh-crm-123-web.vercel.app/', 'https://gh-crm-123-web.vercel.app'],
  ['https://gh-crm-123-web.vercel.app/login', 'https://gh-crm-123-web.vercel.app'],
  ['https://gh-crm-123-web.vercel.app/tablero?x=1#y', 'https://gh-crm-123-web.vercel.app'],
  ['  https://gh-crm-123-web.vercel.app/login  ', 'https://gh-crm-123-web.vercel.app'],
]) {
  const salida = await ejecutar(firmarCode, {
    vars: { N8N_SHARED_SECRET: SECRETO, APP_BASE_URL: entrada },
    item: { json: { run_id: 'r-1', flow: 'morning_digest', trigger: 'manual' } },
    estado: {},
  });
  const url = salida[0].json.url;
  const bien = url.startsWith(esperada + '/api/n8n/digest-payload');
  if (!bien) fallos++;
  console.log(`${bien ? '  ok  ' : ' FALLA'} · ${entrada.trim().padEnd(46)} → ${url.slice(0, 62)}`);
}

await caso('APP_BASE_URL sin sentido se rechaza', 'rechaza', () =>
  ejecutar(firmarCode, {
    vars: { N8N_SHARED_SECRET: SECRETO, APP_BASE_URL: 'no-es-una-url' },
    item: { json: { run_id: 'r-1', flow: 'morning_digest', trigger: 'manual' } },
    estado: {},
  }),
);

console.log(`\n${fallos === 0 ? 'TODO PASA' : fallos + ' FALLOS'}\n`);
process.exit(fallos === 0 ? 0 : 1);
