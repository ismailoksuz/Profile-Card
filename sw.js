/* Dijital kartvizit - service worker
   - Dosyalar ilk açılışta önbelleğe alınır, internet yokken de kart açılır.
   - Sayfa dosyaları "önce ağ": güncelleme yaptığında telefonlar yeni halini alır.
   - Profil fotoğrafı (GitHub) önbelleğe alınmaz: URL çalışmazsa sayfa assets/photo.jpg'ye düşer.
   - Önbelleği sıfırlamak için VERSION değerini değiştirmen yeterli. */
const VERSION = 'kartvizit-v3';

const PRECACHE = [
    './',
    'index.html',
    'style.css',
    'script.js',
    'manifest.webmanifest',
    'assets/photo.jpg',
    'assets/fonts/Manrope-var.woff',
    'assets/app/icon-192.png',
    'assets/app/icon-512.png',
    'assets/app/icon-maskable-512.png',
    'assets/app/apple-touch-icon.png',
    'assets/app/favicon-32.png',
    'vcard/vcard.svg',
    'vcard/vcard.vcf'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(VERSION)
            // Tek bir dosya eksik olsa bile kurulum başarısız olmasın
            .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {}))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

async function networkFirst(request) {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(request, { ignoreSearch: true });
    const network = fetch(request).then((response) => {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
    });
    if (!cached) {
        return network.catch(async () => {
            if (request.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
            return Response.error();
        });
    }
    // Önbellekte varsa ağ yavaşsa 3,5 sn sonra onu göster
    return Promise.race([
        network,
        new Promise((_, reject) => setTimeout(reject, 3500))
    ]).catch(() => cached);
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(request);
    const network = fetch(request).then((response) => {
        if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
        return response;
    }).catch(() => cached);
    return cached || network;
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);

    if (url.origin === self.location.origin) {
        event.respondWith(networkFirst(request));
    } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        event.respondWith(staleWhileRevalidate(request));
    }
});
