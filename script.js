/* ---------- Açılış ekranı (fotoğraflı halka) ---------- */
// Her şeyin yüklenmesini beklemez: halka en az LOADER_MIN ms görünür,
// fotoğraf geç gelirse en fazla LOADER_MAX ms beklenir.
// Hazır olmayan içerik varsa sayfanın kendi halkası devralır.
const LOADER_MIN = 1400;
const LOADER_MAX = 3000;
(function () {
    const loader = document.getElementById('loader');
    const photo = loader.querySelector('img');
    const photoReady = new Promise((resolve) => {
        if (photo.complete) return resolve();
        photo.addEventListener('load', resolve, { once: true });
        photo.addEventListener('error', resolve, { once: true });
    });
    const cap = new Promise((resolve) => setTimeout(resolve, LOADER_MAX));
    Promise.race([photoReady, cap]).then(() => {
        const wait = Math.max(0, LOADER_MIN - performance.now());
        setTimeout(() => loader.classList.add('hidden'), wait);
    });
})();

/* ---------- Sayfalar arası geçiş: İletişim <-> QR ---------- */
const pager = document.getElementById('pager');
const pages = Array.from(pager.querySelectorAll('.page'));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let currentPage = 0;
let animating = false;
let animFrame = null;

/* --- İçerik hazır mı? (yazı tipleri, ikon fontu, görseller) --- */
const FONT_CHECKS = [
    ['500 16px Manrope', 'İşğÖÜ abc']
];

const LOAD_TIMEOUT = 8000; // hiçbir şey sonsuza dek halkada kalmasın

function fontsReady() {
    try {
        return FONT_CHECKS.every(([spec, text]) => document.fonts.check(spec, text));
    } catch (e) {
        return true;
    }
}

function imagesReady(page) {
    return Array.from(page.querySelectorAll('img')).every((img) => img.complete);
}

function whenReady(page) {
    const imgs = Array.from(page.querySelectorAll('img'))
        .filter((img) => !img.complete)
        .map((img) => new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
        }));
    const fonts = FONT_CHECKS.map(([spec, text]) => document.fonts.load(spec, text).catch(() => {}));
    const timeout = new Promise((resolve) => setTimeout(resolve, LOAD_TIMEOUT));
    return Promise.race([Promise.all([...fonts, ...imgs]), timeout]);
}

function checkPage(page) {
    if (fontsReady() && imagesReady(page)) {
        page.classList.remove('is-loading');
        return;
    }
    if (page.classList.contains('is-loading')) return;
    page.classList.add('is-loading');
    whenReady(page).then(() => {
        page.classList.remove('is-loading');
        page.classList.add('is-revealing');
        setTimeout(() => page.classList.remove('is-revealing'), 350);
    });
}

function setActivePage(index) {
    currentPage = index;
    // Görünmeyen sayfadaki bağlantılara Tab / ekran okuyucu ulaşmasın
    pages.forEach((page, i) => { page.inert = i !== index; });
    checkPage(pages[index]);
}

/* --- Masaüstü değiştirir gibi kayma: hızlı başlar, yumuşak yavaşlar --- */
function cubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t) => ((ay * t + by) * t + cy) * t;
    const slopeX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
        let t = x;
        for (let i = 0; i < 8; i++) {
            const err = sampleX(t) - x;
            if (Math.abs(err) < 1e-5) break;
            const d = slopeX(t);
            if (Math.abs(d) < 1e-6) break;
            t -= err / d;
        }
        return sampleY(Math.min(1, Math.max(0, t)));
    };
}

// yumuşak başlar, uzun ve nazik yavaşlar (masaüstü geçişi hissi)
const slideEase = cubicBezier(0.4, 0, 0.1, 1);

function stopSlide() {
    cancelAnimationFrame(animFrame);
    if (animating) {
        animating = false;
        pager.style.scrollSnapType = '';
    }
}

function goToPage(index, instant) {
    stopSlide();
    const target = index * pager.clientWidth;
    const start = pager.scrollLeft;
    if (instant || reduceMotion.matches || Math.abs(target - start) < 1) {
        pager.scrollLeft = target;
        return;
    }
    const distance = target - start;
    const duration = 650;
    const t0 = performance.now();
    animating = true;
    pager.style.scrollSnapType = 'none';
    const step = (now) => {
        const t = Math.min(1, (now - t0) / duration);
        pager.scrollLeft = start + distance * slideEase(t);
        if (t < 1) {
            animFrame = requestAnimationFrame(step);
        } else {
            pager.scrollLeft = target;
            animating = false;
            pager.style.scrollSnapType = '';
        }
    };
    animFrame = requestAnimationFrame(step);
}

function updateHash(index) {
    try {
        history.replaceState(null, '', index === 1 ? '#qr' : location.pathname + location.search);
    } catch (e) {}
}

function changePage(index) {
    if (index === currentPage && !animating) return;
    setActivePage(index);
    updateHash(index);
    goToPage(index);
}

document.querySelectorAll('[data-go]').forEach((btn) => {
    btn.addEventListener('click', () => changePage(Number(btn.dataset.go)));
});

// Parmak ya da tekerlek devreye girerse kayma animasyonu hemen bırakılır
['touchstart', 'pointerdown', 'wheel'].forEach((type) => {
    pager.addEventListener(type, stopSlide, { passive: true });
});

// Parmakla kaydırmada: yarıyı geçince aktif sayfa değişir
pager.addEventListener('scroll', () => {
    if (animating) return;
    const index = Math.round(pager.scrollLeft / pager.clientWidth);
    if (index === currentPage) return;
    setActivePage(index);
    updateHash(index);
}, { passive: true });

window.addEventListener('hashchange', () => {
    changePage(location.hash === '#qr' ? 1 : 0);
});

window.addEventListener('resize', () => {
    if (!animating) goToPage(currentPage, true);
});

const startPage = location.hash === '#qr' ? 1 : 0;
setActivePage(startPage);
pages.forEach(checkPage);
if (startPage) goToPage(startPage, true);
window.addEventListener('load', () => {
    pages.forEach(checkPage);
    if (startPage && currentPage === startPage) goToPage(startPage, true);
});

/* ---------- Uygulama (PWA): service worker kaydı ---------- */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}
