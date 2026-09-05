/*
 * Service worker de CRM-123.  README.handoff §5.
 *
 * ALCANCE: la raíz del sitio. Se sirve desde `/` precisamente para que su
 * `scope` no quede limitado a una subcarpeta: el manifest y este archivo
 * aplican a TODA la aplicación, no a un subconjunto de rutas.
 *
 * ── La regla que manda aquí ───────────────────────────────────────────
 * NUNCA se cachea una respuesta con datos del CRM. `customers`,
 * `opportunities`, `activities`, `profiles` y `audit_log` están aislados por
 * RLS y no pueden quedar en el disco de un dispositivo compartido. Todo lo
 * que sea `/api/` o una navegación va a red y solo a red.
 *
 * Se cachea el armazón: documento de arranque, estáticos e iconos, para que
 * sin cobertura salga un aviso propio en lugar del error del navegador.
 */

const CACHE = 'crm123-shell-v1';

const ARMAZON = ['/sin-conexion.html', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ARMAZON)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;

  // Solo GET del mismo origen. Ninguna escritura pasa por aquí: no hay cola
  // de reintentos ni escritura sin conexión, por diseño.
  if (peticion.method !== 'GET') return;
  if (new URL(peticion.url).origin !== self.location.origin) return;

  // Datos del CRM y sesión: SOLO RED. Sin excepción, sin respaldo de caché.
  if (new URL(peticion.url).pathname.startsWith('/api/')) return;

  // Navegaciones: red primero; sin cobertura, el aviso propio.
  if (peticion.mode === 'navigate') {
    evento.respondWith(fetch(peticion).catch(() => caches.match('/sin-conexion.html')));
    return;
  }

  // Estáticos del armazón: se sirve lo cacheado y se revalida por detrás.
  evento.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cacheado = await cache.match(peticion);
      const red = fetch(peticion)
        .then((res) => {
          if (res.ok && res.type === 'basic') cache.put(peticion, res.clone());
          return res;
        })
        .catch(() => cacheado);
      return cacheado || red;
    }),
  );
});

/* Al cerrar sesión, la aplicación manda borrar lo cacheado. */
self.addEventListener('message', (evento) => {
  if (evento.data === 'crm123:cerrar-sesion') {
    evento.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))));
  }
});
