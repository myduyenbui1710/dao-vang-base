// Nhân vật thợ mỏ vẽ bằng SVG: có mũ, thân, tay, chân, cầm cuốc. Avatar lưu dạng 'm0'..'m11'.
const MINERS = [
  { skin: '#f6d0b1', shirt: '#2f80ed', pants: '#2b3a55', hat: '#ffc400', hair: '#3b2414', style: 'short' },
  { skin: '#e8b48a', shirt: '#eb5757', pants: '#3a3a3a', hat: '#ff8a00', hair: '#1c1c1c', style: 'long' },
  { skin: '#c68a5e', shirt: '#27ae60', pants: '#24364a', hat: '#ffc400', hair: '#1c1c1c', style: 'beard' },
  { skin: '#f6d0b1', shirt: '#9b51e0', pants: '#2b2b40', hat: '#ffffff', hair: '#c9772b', style: 'long' },
  { skin: '#8d5a3b', shirt: '#f2994a', pants: '#2b3a55', hat: '#e53935', hair: '#111', style: 'short' },
  { skin: '#e8b48a', shirt: '#00a6a6', pants: '#3b2f2f', hat: '#ffc400', hair: '#6b3e1f', style: 'bun' },
  { skin: '#f6d0b1', shirt: '#6d4c41', pants: '#263238', hat: '#43a047', hair: '#d9d9d9', style: 'beard' },
  { skin: '#c68a5e', shirt: '#e91e63', pants: '#2b2b40', hat: '#ffffff', hair: '#1c1c1c', style: 'bun' },
  { skin: '#8d5a3b', shirt: '#1e88e5', pants: '#4e342e', hat: '#ff8a00', hair: '#111', style: 'beard' },
  { skin: '#e8b48a', shirt: '#fdd835', pants: '#37474f', hat: '#1e88e5', hair: '#3b2414', style: 'short' },
  { skin: '#f6d0b1', shirt: '#546e7a', pants: '#212121', hat: '#e53935', hair: '#f2c94c', style: 'long' },
  { skin: '#c68a5e', shirt: '#8bc34a', pants: '#3e2723', hat: '#ffc400', hair: '#5d4037', style: 'short' },
];
const MINER_IDS = MINERS.map((_, i) => 'm' + i);

const isFace = id => /^p\d+$/.test(String(id)) && typeof FACES !== 'undefined' && !!FACES[+String(id).slice(1)];
let faceClipN = 0;

// Mỗi nhân vật một màu riêng cho dây và áo, để nhìn là biết dây của ai
function ropeColor(id) {
  const n = (+String(id).slice(1) || 0) + (String(id)[0] === 'm' ? 25 : 0);
  return `hsl(${Math.round(n * 137.5) % 360}, 90%, ${[52, 40, 66][n % 3]}%)`;
}

function minerSVG(id) {
  const idx = +String(id).slice(1) || 0;
  const m = { ...(isFace(id) ? MINERS[idx % MINERS.length] : (MINERS[idx] || MINERS[0])), shirt: ropeColor(id) };
  const hair = {
    short: `<path d="M38 30 q12 -8 26 0 v6 h-26z" fill="${m.hair}"/>`,
    long: `<path d="M36 30 q14 -10 28 0 v24 q-3 4 -6 0 v-18 h-16 v18 q-3 4 -6 0z" fill="${m.hair}"/>`,
    beard: `<path d="M38 30 q12 -8 26 0 v5 h-26z" fill="${m.hair}"/><path d="M40 44 q11 14 22 0 q-2 10 -11 11 q-9 -1 -11 -11z" fill="${m.hair}"/>`,
    bun: `<circle cx="38" cy="34" r="6" fill="${m.hair}"/><path d="M38 30 q12 -8 26 0 v6 h-26z" fill="${m.hair}"/>`,
  }[m.style];
  const clip = 'fc' + (++faceClipN);
  const headSVG = isFace(id) ? `<g class="head">
    <clipPath id="${clip}"><circle cx="51" cy="31" r="23"/></clipPath>
    <circle cx="51" cy="31" r="24.5" fill="${m.hat}"/>
    <image href="${FACES[idx]}" x="28" y="8" width="46" height="46" clip-path="url(#${clip})"/>
    <path d="M37 11 q14 -15 28 0z" fill="${m.hat}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>
    <rect x="33" y="8.5" width="36" height="4" rx="2" fill="${m.hat}" stroke="rgba(0,0,0,.25)" stroke-width="1.2"/>
    <circle cx="51" cy="3.5" r="3" fill="#fff59d" stroke="#bfa000" stroke-width="1.2"/>
  </g>` : `<g class="head">
    ${m.style === 'long' ? hair : ''}
    <circle cx="51" cy="38" r="15" fill="${m.skin}"/>
    ${m.style !== 'long' ? hair : ''}
    <circle cx="57" cy="38" r="2" fill="#222"/><circle cx="47" cy="38" r="2" fill="#222"/>
    <circle cx="61" cy="43" r="2.6" fill="#ff9a8a" opacity=".6"/>
    <path d="M47 45 q5 4 10 0" stroke="#222" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M33 31 q18 -26 37 0z" fill="${m.hat}" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>
    <rect x="30" y="29" width="43" height="5" rx="2.5" fill="${m.hat}" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>
    <circle cx="66" cy="23" r="4.5" fill="#fff59d" stroke="#bfa000" stroke-width="1.5"/>
  </g>`;
  return `<svg class="mfig" viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <ellipse cx="52" cy="115" rx="27" ry="4" fill="rgba(0,0,0,.28)"/>
  <g class="legs" fill="none" stroke-linecap="round">
    <path d="M45 84 Q43 95 43 106" stroke="${m.pants}" stroke-width="12"/>
    <path d="M59 84 Q61 95 61 106" stroke="${m.pants}" stroke-width="12"/>
    <path d="M41 88 v14 M63 88 v14" stroke="rgba(255,255,255,.14)" stroke-width="2"/>
  </g>
  <path d="M37 105 h13 v7 h-17 q-1 -5 4 -7z" fill="#5d4037"/><rect x="32" y="111" width="19" height="3.5" rx="1.7" fill="#2a1a10"/>
  <path d="M54 105 h13 q5 2 4 7 h-17z" fill="#5d4037"/><rect x="53" y="111" width="19" height="3.5" rx="1.7" fill="#2a1a10"/>
  <path d="M37 58 L30 70" stroke="${m.shirt}" stroke-width="10" stroke-linecap="round"/>
  <path d="M30 70 L36 81" stroke="${m.skin}" stroke-width="8" stroke-linecap="round"/>
  <circle cx="37" cy="82" r="5.4" fill="#f2b33d" stroke="#b57f16" stroke-width="1"/>
  <path d="M36 57 q0 -7 8 -7 h16 q8 0 8 7 l-2 28 h-28z" fill="${m.shirt}"/>
  <path d="M38 73 h28 l1 14 h-30z" fill="${m.pants}"/>
  <rect x="42" y="60" width="20" height="15" rx="3" fill="${m.pants}"/>
  <path d="M44 61 L41 51 M60 61 L63 51" stroke="${m.pants}" stroke-width="3.5" stroke-linecap="round"/>
  <rect x="47" y="64" width="10" height="6.5" rx="1.5" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
  <circle cx="44.5" cy="62" r="1.3" fill="#ffc400"/><circle cx="59.5" cy="62" r="1.3" fill="#ffc400"/>
  ${headSVG}
  <g class="arm">
    <path d="M79 84 L92 22" stroke="#8d5a2b" stroke-width="5" stroke-linecap="round"/>
    <path d="M79 84 L92 22" stroke="rgba(255,255,255,.2)" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M75 29 Q92 8 108 26 Q92 17 75 29z" fill="#aab4bd" stroke="#5f6a73" stroke-width="2" stroke-linejoin="round"/>
    <rect x="88" y="16" width="8" height="8" rx="2" fill="#5f6a73"/>
    <path d="M66 57 L76 66" stroke="${m.shirt}" stroke-width="10" stroke-linecap="round"/>
    <path d="M76 66 L85 58" stroke="${m.skin}" stroke-width="8" stroke-linecap="round"/>
    <circle cx="86" cy="57" r="5.8" fill="#f2b33d" stroke="#b57f16" stroke-width="1"/>
  </g>
</svg>`;
}

// Hiển thị avatar ở mọi nơi: nhân vật SVG nếu là 'mN', còn lại (dữ liệu cũ) hiển thị như chữ.
function ava(a) {
  if (isFace(a)) return `<img class="face-ava" src="${FACES[+String(a).slice(1)]}" alt="">`;
  return /^m\d+$/.test(String(a)) ? `<span class="mava">${minerSVG(a)}</span>` : esc(a);
}

// Lựa chọn lúc vào phòng: mặt từng người + vài thợ mỏ hoạt hình cho người không có trong ảnh
const AVATAR_CHOICES = (typeof FACES !== 'undefined' ? FACES.map((_, i) => 'p' + i) : []).concat(MINER_IDS.slice(0, 4));
