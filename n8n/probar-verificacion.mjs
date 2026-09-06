/**
 * Pasa el nodo «Verificar firma» por los mismos casos que la prueba 21-24 de
 * BUILD_PLAN §4.7, firmando con el MISMO algoritmo que packages/core/src/hmac.ts.
 */
import fs from 'node:fs';
import nodeCrypto from 'node:crypto';

const flujo = JSON.parse(fs.readFileSync(new URL('./morning-digest.json', import.meta.url), 'utf8'));
const jsCode = flujo.nodes.find((n) => n.name === 'Verificar firma').parameters.jsCode;
const prepararCode = flujo.nodes.find((n) => n.name === 'Preparar contexto').parameters.jsCode;

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
async function ejecutar(code, { vars, item, estado }) {
  const fn = new AsyncFunction(
    '$vars', '$input', '$getWorkflowStaticData', 'crypto', 'Buffer', 'TextEncoder', 'TextDecoder',
    code,
  );
  return fn(
    vars,
    { first: () => item },
    () => estado,
    globalThis.crypto,
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

console.log(`\n${fallos === 0 ? 'TODO PASA' : fallos + ' FALLOS'}\n`);
process.exit(fallos === 0 ? 0 : 1);
