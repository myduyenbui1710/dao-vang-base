// Tiện ích chung: định dạng số, hiệu ứng chữ bay, pháo giấy.
const fmt = n => Math.round(n || 0).toLocaleString('vi-VN');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function floatText(x, y, text, cls = '') {
  const el = document.createElement('div');
  el.className = 'float ' + cls; el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function confetti(duration = 4000) {
  const c = document.createElement('canvas');
  c.className = 'confetti'; document.body.appendChild(c);
  const ctx = c.getContext('2d');
  const resize = () => { c.width = innerWidth; c.height = innerHeight; };
  resize();
  const colors = ['#f5b301', '#ffd75e', '#e5484d', '#3e8ef7', '#30a46c', '#8e4ec6', '#fff'];
  const parts = Array.from({ length: 180 }, () => ({
    x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.5,
    vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4,
    r: 4 + Math.random() * 6, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3,
    col: colors[Math.floor(Math.random() * colors.length)],
  }));
  const end = performance.now() + duration;
  (function frame(t) {
    ctx.clearRect(0, 0, c.width, c.height);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.col;
      ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
    });
    if (t < end) requestAnimationFrame(frame); else c.remove();
  })(performance.now());
}

function modeBanner() {
  if (DB.mode() === 'local') {
    const b = document.createElement('div');
    b.className = 'mode-banner';
    b.textContent = 'Chế độ thử: chỉ chơi được giữa các tab trên máy này. Dán config Firebase vào js/config.js để chơi online.';
    document.body.appendChild(b);
  }
}
