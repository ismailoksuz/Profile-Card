const modal = document.getElementById('shareModal');
const openBtn = document.getElementById('openShareModal');
const closeBtn = document.getElementById('closeShareModal');
const copyBtn = document.getElementById('copyLinkBtn');
const copyText = document.getElementById('copyBtnText');
const waShare = document.getElementById('waShare');
const smsShare = document.getElementById('smsShare');
const tgShare = document.getElementById('tgShare');
const mailShare = document.getElementById('mailShare');
const shareUrl = 'https://ismailoksuz.github.io/Profile-Card';
const shareText = 'İsmail ÖKSÜZ - Bilgisayar Mühendisi';
waShare.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
smsShare.href = `sms:${isIOS ? '&' : '?'}body=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
tgShare.href = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
mailShare.href = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`;
openBtn.addEventListener('click', () => modal.classList.add('active'));
closeBtn.addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
});
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    } 
    else {
        return new Promise((resolve, reject) => {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.top = '0';
            textArea.style.left = '0';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) resolve();
                else reject();
            } catch (err) {
                document.body.removeChild(textArea);
                reject(err);
            }
        });
    }
}
copyBtn.addEventListener('click', () => {
    copyToClipboard(shareUrl).then(() => {
        copyText.textContent = 'Kopyalandı!';
        setTimeout(() => copyText.textContent = 'Bağlantıyı Kopyala', 2000);
    }).catch(() => {
        copyText.textContent = 'Hata oluştu!';
        setTimeout(() => copyText.textContent = 'Bağlantıyı Kopyala', 2000);
    });
});

window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    setTimeout(() => {
        loader.classList.add('hidden');
    }, 2200);
});