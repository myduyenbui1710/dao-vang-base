// Mini-game thả móc kéo vàng: 10 màn, mỗi màn một loại vàng, con vật và vật cản riêng.
const THEMES = [
  { name: 'Mỏ Vàng Cổ', icon: '⛏️', sky: ['#ffb347', '#ffcf7a'], dirt: ['#c98a3c', '#9a5e24', '#5a3110'], shape: 'nugget', pal: ['#fff7b0', '#ffd23a', '#b07800'],
    special: { icon: '💰', v: 450 }, animals: [{ icon: '🐭', v: 40, sp: 70 }, { icon: '🐢', v: 90, sp: 22 }], walls: ['📦'] },
  { name: 'Hang Pha Lê', icon: '🔮', sky: ['#2b1650', '#4a2a80'], dirt: ['#3d2468', '#2a1850', '#160c30'], shape: 'crystal', pal: ['#ffe0ff', '#c77dff', '#6a2fb0'],
    special: { icon: '💎', v: 500 }, animals: [{ icon: '🦇', v: 60, sp: 95 }, { icon: '🕷️', v: 40, sp: 40 }], walls: ['🗿'] },
  { name: 'Đáy Đại Dương', icon: '🌊', sky: ['#0f6fb0', '#2ba6d9'], dirt: ['#1a7fa8', '#10587f', '#08304f'], shape: 'pearl', pal: ['#ffffff', '#ffe3ef', '#c79ab5'],
    special: { icon: '🐚', v: 450 }, animals: [{ icon: '🐟', v: 40, sp: 90 }, { icon: '🐙', v: 80, sp: 35 }, { icon: '🦀', v: 50, sp: 50 }], walls: ['⚓'] },
  { name: 'Sa Mạc Cổ', icon: '🏜️', sky: ['#ffa24d', '#ffe0a0'], dirt: ['#e8bf70', '#c8934a', '#8a5f2a'], shape: 'coin', pal: ['#fff3b0', '#f5c033', '#a67a10'],
    special: { icon: '🏺', v: 480 }, animals: [{ icon: '🦂', v: 50, sp: 60 }, { icon: '🐍', v: 60, sp: 75 }, { icon: '🐫', v: 90, sp: 25 }], walls: ['🌵'] },
  { name: 'Vùng Băng Giá', icon: '❄️', sky: ['#a8dcf5', '#e4f6ff'], dirt: ['#bfe6f7', '#7fbfe0', '#3f7fa8'], shape: 'ice', pal: ['#ffffff', '#ffe98a', '#6fb5d8'],
    special: { icon: '💎', v: 500 }, animals: [{ icon: '🐧', v: 60, sp: 50 }, { icon: '🐰', v: 40, sp: 85 }], walls: ['⛄'] },
  { name: 'Núi Lửa', icon: '🌋', sky: ['#4a1208', '#a02a10'], dirt: ['#6a2410', '#3f140a', '#1c0804'], shape: 'lava', pal: ['#fff0a0', '#ff8a1f', '#c21f05'],
    special: { icon: '💎', v: 520 }, animals: [{ icon: '🦎', v: 50, sp: 80 }, { icon: '🐉', v: 110, sp: 45 }], walls: ['🔥'] },
  { name: 'Rừng Rậm', icon: '🌴', sky: ['#3fa34d', '#9fdc7a'], dirt: ['#5c8a3a', '#3f6327', '#223a14'], shape: 'crystal', pal: ['#d8ffd0', '#34d17a', '#0f7a45'],
    special: { icon: '🏆', v: 480 }, animals: [{ icon: '🐒', v: 60, sp: 85 }, { icon: '🐊', v: 90, sp: 30 }], walls: ['🌳'] },
  { name: 'Vũ Trụ', icon: '🚀', sky: ['#05051a', '#1a1a4a'], dirt: ['#1a1a40', '#10102c', '#050514'], shape: 'meteor', pal: ['#e8f4ff', '#8fb4e8', '#3f5a90'],
    special: { icon: '⭐', v: 500 }, animals: [{ icon: '👽', v: 70, sp: 55 }, { icon: '🛸', v: 110, sp: 100 }], walls: ['🌑'] },
  { name: 'Đảo Hải Tặc', icon: '🏴‍☠️', sky: ['#2f9fd0', '#a6e1f5'], dirt: ['#e0c080', '#b08a4c', '#6b4a20'], shape: 'coin', pal: ['#fff0a0', '#ffc61a', '#99690a'],
    special: { icon: '👑', v: 550 }, animals: [{ icon: '🦜', v: 60, sp: 90 }, { icon: '🐀', v: 40, sp: 70 }], walls: ['💀'] },
  { name: 'Đêm Vàng', icon: '🌙', sky: ['#0a0a2a', '#2a1a55'], dirt: ['#2a1c50', '#1a1038', '#0a0620'], shape: 'lava', pal: ['#fffbd0', '#ffd700', '#b8860b'],
    special: { icon: '👑', v: 650 }, animals: [{ icon: '👻', v: 80, sp: 60 }, { icon: '🦉', v: 70, sp: 80 }], walls: ['🎃'] },
];

const ITEM_TYPES = {
  gold_s: { r: 13, v: 50, w: 1.4, kind: 'gold' },
  gold_m: { r: 22, v: 120, w: 2.4, kind: 'gold' },
  gold_l: { r: 36, v: 320, w: 4.5, kind: 'gold' },
  rock_s: { r: 17, v: 12, w: 3, kind: 'rock' },
  rock_l: { r: 28, v: 25, w: 5.5, kind: 'rock' },
  bag:    { r: 17, v: 0, w: 1.8, kind: 'bag' },
};
const ITEM_POOL = ['gold_s', 'gold_s', 'gold_s', 'gold_m', 'gold_m', 'gold_l', 'rock_s', 'rock_l', 'bag', 'special', 'bomb'];
const BOMB_PENALTY = 100, BOMB_STUN = 1.5, BOMB_RADIUS = 75;

// Vẽ emoji qua canvas đệm để điện thoại chạy mượt
const emojiCache = {};
function emojiCanvas(icon, size) {
  const key = icon + '|' + size;
  if (emojiCache[key]) return emojiCache[key];
  const c = document.createElement('canvas'), s = size * 1.5;
  c.width = c.height = s * 2;
  const x = c.getContext('2d');
  x.scale(2, 2);
  x.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#000';
  x.fillText(icon, s / 2, s / 2);
  return (emojiCache[key] = c);
}
function drawEmoji(ctx, icon, size, flip) {
  const c = emojiCanvas(icon, size), s = size * 1.5;
  ctx.save(); if (flip) ctx.scale(-1, 1); ctx.drawImage(c, -s / 2, -s / 2, s, s); ctx.restore();
}

function blobPath(ctx, r, n, seed, sq = 0.85) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, rr = r * (0.85 + 0.15 * Math.sin(i * 2.3 + seed * 9));
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * sq);
  }
  ctx.closePath();
}

function drawTreasure(ctx, theme, r, seed) {
  const [l, m, d] = theme.pal;
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
  g.addColorStop(0, l); g.addColorStop(0.45, m); g.addColorStop(1, d);
  ctx.fillStyle = g;
  switch (theme.shape) {
    case 'crystal':
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, -r * 0.3); ctx.lineTo(r * 0.5, r * 0.85); ctx.lineTo(-r * 0.5, r * 0.85); ctx.lineTo(-r * 0.7, -r * 0.3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = l; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r * 0.85); ctx.moveTo(-r * 0.7, -r * 0.3); ctx.lineTo(r * 0.7, -r * 0.3); ctx.stroke();
      break;
    case 'pearl':
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.35, r * 0.2, 0, Math.PI * 2); ctx.fill();
      break;
    case 'coin':
      ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = d; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'ice':
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r * 0.85, -r * 0.75, r * 1.7, r * 1.5, r * 0.25) : ctx.rect(-r * 0.85, -r * 0.75, r * 1.7, r * 1.5); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.stroke();
      break;
    case 'lava':
      ctx.save(); ctx.shadowColor = m; ctx.shadowBlur = r * 0.7; blobPath(ctx, r, 9, seed); ctx.fill(); ctx.restore();
      break;
    case 'meteor':
      blobPath(ctx, r, 10, seed, 0.9); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      [[-.3, -.2, .2], [.3, .15, .16], [-.1, .4, .12]].forEach(([x, y, q]) => { ctx.beginPath(); ctx.arc(x * r, y * r, q * r, 0, Math.PI * 2); ctx.fill(); });
      break;
    default:
      blobPath(ctx, r, 9, seed); ctx.fill();
  }
}

function drawRock(ctx, r, seed) {
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
  g.addColorStop(0, '#c2b4a0'); g.addColorStop(1, '#5a4c3e');
  ctx.fillStyle = g; blobPath(ctx, r, 7, seed, 0.8); ctx.fill();
}

function drawBag(ctx, r) {
  ctx.fillStyle = '#a0703a'; ctx.beginPath(); ctx.ellipse(0, 3, r, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a5226'; ctx.fillRect(-5, -r + 2, 10, 6);
  ctx.fillStyle = '#ffe9a8'; ctx.font = `bold ${r}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 4);
}

const Claw = (() => {
  let cv, ctx, W, H, dpr, theme, items, walls, animals, hook, raf, last, onGrab, img, floats, booms, shake, running = false;
  const O = () => ({ x: W / 2, y: 64 });
  const SKY = 90;

  function occupied(x, y, r) {
    return items.concat(walls, animals).every(o => Math.hypot(o.x - x, o.y - y) > (o.r || 16) + r + 8);
  }
  function freeSpot(r) {
    for (let k = 0; k < 30; k++) {
      const x = 24 + Math.random() * (W - 48), y = SKY + 45 + Math.random() * (H - SKY - 75);
      if (occupied(x, y, r)) return { x, y };
    }
    return null;
  }
  function makeItem(typeName) {
    const name = typeName || ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];
    let t;
    if (name === 'special') t = { r: 15, v: theme.special.v, w: 1.15, kind: 'special', icon: theme.special.icon };
    else if (name === 'bomb') t = { r: 16, v: -BOMB_PENALTY, w: 1, kind: 'bomb', icon: '💣' };
    else t = ITEM_TYPES[name];
    const p = freeSpot(t.r);
    return p ? { ...t, type: name, ...p, seed: Math.random() } : null;
  }
  function addItem(typeName) { const it = makeItem(typeName); if (it) items.push(it); }
  function makeAnimal() {
    const a = theme.animals[Math.floor(Math.random() * theme.animals.length)];
    const y = SKY + 50 + Math.random() * (H - SKY - 90);
    const gem = Math.random() < 0.3;
    return { ...a, kind: 'animal', type: 'animal', r: 17, w: gem ? 1.3 : 1.6, x: 20 + Math.random() * (W - 40), y,
      dir: Math.random() < 0.5 ? -1 : 1, gem, v: gem ? 500 : a.v, sp: a.sp * (0.8 + Math.random() * 0.4), seed: Math.random() };
  }

  function start(canvas, avatarId, cb, q = 0) {
    stop();
    cv = canvas; onGrab = cb; theme = THEMES[q % THEMES.length];
    dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    W = rect.width; H = rect.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    items = []; walls = []; animals = []; floats = []; booms = []; shake = 0;
    for (let i = 0; i < 3; i++) {
      const p = freeSpot(20);
      if (p) walls.push({ ...p, r: 20, icon: theme.walls[i % theme.walls.length] });
    }
    for (let i = 0; i < 3; i++) animals.push(makeAnimal());
    const n = Math.round((W * H) / 14000);
    addItem('bomb'); addItem('bomb'); addItem('special');
    for (let i = 0; i < n; i++) addItem();
    hook = { state: 'swing', t: Math.random() * 6, a: 0, L: 34, caught: null, stun: 0 };
    img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(minerSVG(avatarId).replace('<svg class="mfig"', '<svg'));
    running = true; last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  function tap() {
    if (running && hook.state === 'swing' && hook.stun <= 0) { hook.state = 'out'; return true; }
    return false;
  }

  function tip() { const o = O(); return { x: o.x + Math.sin(hook.a) * hook.L, y: o.y + Math.cos(hook.a) * hook.L }; }

  function explode(p) {
    booms.push({ x: p.x, y: p.y, t: 0 });
    shake = 0.45; hook.stun = BOMB_STUN; hook.state = 'in'; hook.caught = null;
    const lost = items.filter(o => Math.hypot(o.x - p.x, o.y - p.y) < BOMB_RADIUS).length;
    items = items.filter(o => Math.hypot(o.x - p.x, o.y - p.y) >= BOMB_RADIUS);
    for (let i = 0; i < lost; i++) addItem();
    floats.push({ text: '💥 -' + BOMB_PENALTY, x: O().x + 34, y: O().y, life: 1.3, big: true, bad: true });
    Sound.boom();
    if (navigator.vibrate) navigator.vibrate([120, 40, 200]);
    onGrab && onGrab({ v: -BOMB_PENALTY, kind: 'bomb', type: 'bomb', icon: '💣' });
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const speed = H * 1.1;
    animals.forEach(a => {
      a.x += a.dir * a.sp * dt;
      if (a.x < 18) { a.x = 18; a.dir = 1; } else if (a.x > W - 18) { a.x = W - 18; a.dir = -1; }
    });
    if (hook.stun > 0) hook.stun -= dt;
    if (shake > 0) shake -= dt;
    if (hook.state === 'swing') {
      if (hook.stun <= 0) { hook.t += dt * 1.9; hook.a = Math.sin(hook.t) * 1.2; }
    } else if (hook.state === 'out') {
      hook.L += speed * dt;
      const p = tip();
      const wall = walls.find(o => Math.hypot(o.x - p.x, o.y - p.y) < o.r + 4);
      const hit = items.find(o => Math.hypot(o.x - p.x, o.y - p.y) < o.r + 7);
      const ani = animals.find(o => Math.hypot(o.x - p.x, o.y - p.y) < o.r + 7);
      if (wall) {
        hook.state = 'in'; Sound.clang();
        floats.push({ text: 'Keng!', x: p.x + 10, y: p.y, life: 0.8, bad: true });
        onGrab && onGrab({ v: 0, kind: 'wall', type: 'wall', icon: wall.icon });
      } else if (hit && hit.kind === 'bomb') {
        items = items.filter(o => o !== hit); explode(p); addItem('bomb');
      } else if (hit) {
        hook.caught = hit; items = items.filter(o => o !== hit); hook.state = 'in'; Sound.click();
      } else if (ani) {
        hook.caught = ani; animals = animals.filter(o => o !== ani); hook.state = 'in'; Sound.squeak();
      } else if (p.x < 0 || p.x > W || p.y > H) hook.state = 'in';
    } else if (hook.state === 'in') {
      hook.L -= (hook.caught ? speed / hook.caught.w : speed * 1.4) * dt;
      if (hook.L <= 34) {
        hook.L = 34; hook.state = 'swing';
        if (hook.caught) {
          const c = hook.caught; hook.caught = null;
          let v = c.v;
          if (c.kind === 'bag') v = [20, 60, 150, 300, 600][Math.floor(Math.random() * 5)];
          floats.push({ text: '+' + v, x: O().x + 40, y: O().y, life: 1, big: v >= 300, bad: c.kind === 'rock' });
          c.kind === 'rock' ? Sound.rock() : v >= 300 ? Sound.big() : Sound.coin();
          if (navigator.vibrate) navigator.vibrate(c.kind === 'rock' ? 120 : 30);
          onGrab && onGrab({ v, kind: c.kind, type: c.type, icon: c.icon });
          if (c.kind === 'animal') animals.push(makeAnimal()); else addItem();
        }
      }
    }
    if (hook.caught) { const p = tip(); hook.caught.x = p.x; hook.caught.y = p.y + hook.caught.r * 0.6; }
    draw(dt);
    raf = requestAnimationFrame(loop);
  }

  function drawItem(o) {
    ctx.save(); ctx.translate(o.x, o.y);
    if (o.kind === 'gold') drawTreasure(ctx, theme, o.r, o.seed);
    else if (o.kind === 'rock') drawRock(ctx, o.r, o.seed);
    else if (o.kind === 'bag') drawBag(ctx, o.r);
    else if (o.kind === 'animal') {
      drawEmoji(ctx, o.icon, 30, o.dir > 0);
      if (o.gem) { ctx.translate(0, -18); drawEmoji(ctx, '💎', 15); }
    } else drawEmoji(ctx, o.icon, 28);
    ctx.restore();
  }

  function draw(dt) {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
    const sky = ctx.createLinearGradient(0, 0, 0, SKY);
    sky.addColorStop(0, theme.sky[0]); sky.addColorStop(1, theme.sky[1]);
    ctx.fillStyle = sky; ctx.fillRect(-10, -10, W + 20, SKY + 10);
    const dirt = ctx.createLinearGradient(0, SKY, 0, H);
    dirt.addColorStop(0, theme.dirt[0]); dirt.addColorStop(0.5, theme.dirt[1]); dirt.addColorStop(1, theme.dirt[2]);
    ctx.fillStyle = dirt; ctx.fillRect(-10, SKY, W + 20, H - SKY + 10);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-10, SKY - 4, W + 20, 6);
    walls.forEach(w => { ctx.save(); ctx.translate(w.x, w.y); drawEmoji(ctx, w.icon, 36); ctx.restore(); });
    items.forEach(drawItem);
    animals.forEach(drawItem);
    const o = O();
    if (img.complete) ctx.drawImage(img, o.x - 92, 0, 80, 87);
    ctx.fillStyle = '#5d4037'; ctx.fillRect(o.x - 14, o.y - 8, 28, 10);
    ctx.fillStyle = '#9aa4ad'; ctx.beginPath(); ctx.arc(o.x, o.y - 3, 7, 0, Math.PI * 2); ctx.fill();
    const p = tip();
    ctx.strokeStyle = hook.stun > 0 ? '#111' : '#3b2414'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    if (hook.caught) drawItem(hook.caught);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-hook.a);
    ctx.strokeStyle = '#8a97a0'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-12, 4, -9, 14); ctx.moveTo(0, 0); ctx.quadraticCurveTo(12, 4, 9, 14); ctx.stroke();
    ctx.restore();
    booms = booms.filter(b => (b.t += dt) < 0.6);
    booms.forEach(b => {
      const k = b.t / 0.6;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#ffb020'; ctx.beginPath(); ctx.arc(b.x, b.y, BOMB_RADIUS * (0.3 + k), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(b.x, b.y, BOMB_RADIUS * (0.15 + k * 0.5), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    });
    if (hook.stun > 0) {
      ctx.save(); ctx.translate(o.x - 40, 12 + Math.sin(hook.stun * 12) * 3); drawEmoji(ctx, '💫', 22); ctx.restore();
    }
    floats = floats.filter(f => (f.life -= dt) > 0);
    floats.forEach(f => {
      ctx.globalAlpha = Math.min(1, f.life * 1.5);
      ctx.font = `800 ${f.big ? 30 : 22}px 'Baloo 2', sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = f.bad ? '#ff6369' : '#fff3a0'; ctx.strokeStyle = '#2a1500'; ctx.lineWidth = 4;
      const y = f.y - (1 - Math.min(1, f.life)) * 40;
      ctx.strokeText(f.text, f.x, y); ctx.fillText(f.text, f.x, y);
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  }

  // Ảnh vật phẩm dùng cho màn chiếu, vẽ cùng kiểu với điện thoại
  function itemURL(q, type) {
    const t = THEMES[q % THEMES.length], spec = ITEM_TYPES[type];
    if (!spec) return '';
    const c = document.createElement('canvas'), size = spec.r * 2 + 20;
    c.width = c.height = size * 2;
    const x = c.getContext('2d');
    x.scale(2, 2); x.translate(size / 2, size / 2);
    if (spec.kind === 'gold') drawTreasure(x, t, spec.r, 0.4);
    else if (spec.kind === 'rock') drawRock(x, spec.r, 0.4);
    else drawBag(x, spec.r);
    return c.toDataURL();
  }

  return { start, stop, tap, itemURL };
})();
