// Mini-game thả móc kéo vàng trên điện thoại (canvas).
const ITEM_TYPES = {
  gold_s: { r: 13, v: 50, w: 1.4, kind: 'gold' },
  gold_m: { r: 22, v: 120, w: 2.4, kind: 'gold' },
  gold_l: { r: 36, v: 320, w: 4.5, kind: 'gold' },
  rock_s: { r: 17, v: 12, w: 3, kind: 'rock' },
  rock_l: { r: 28, v: 25, w: 5.5, kind: 'rock' },
  gem:    { r: 10, v: 450, w: 1.1, kind: 'gem' },
  bag:    { r: 17, v: 0, w: 1.8, kind: 'bag' },
};
const ITEM_POOL = ['gold_s', 'gold_s', 'gold_s', 'gold_m', 'gold_m', 'gold_l', 'rock_s', 'rock_s', 'rock_l', 'gem', 'bag'];

const Claw = (() => {
  let cv, ctx, W, H, dpr, items, hook, raf, last, onGrab, img, floats, running = false;
  const O = () => ({ x: W / 2, y: 64 });

  function spawn(avoid = []) {
    const t = ITEM_TYPES[ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)]];
    for (let k = 0; k < 30; k++) {
      const x = 24 + Math.random() * (W - 48), y = 140 + Math.random() * (H - 170);
      if (avoid.concat(items).every(o => Math.hypot(o.x - x, o.y - y) > o.r + t.r + 10)) {
        return { ...t, type: Object.keys(ITEM_TYPES).find(k2 => ITEM_TYPES[k2] === t), x, y, seed: Math.random() };
      }
    }
    return null;
  }

  function start(canvas, avatarId, cb) {
    stop();
    cv = canvas; onGrab = cb;
    dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    W = rect.width; H = rect.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    items = []; floats = [];
    const n = Math.round((W * H) / 13000);
    for (let i = 0; i < n; i++) { const it = spawn(); if (it) items.push(it); }
    hook = { state: 'swing', t: Math.random() * 6, a: 0, L: 34, caught: null };
    img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(minerSVG(avatarId).replace('<svg class="mfig"', '<svg'));
    running = true; last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  function tap() {
    if (running && hook.state === 'swing') { hook.state = 'out'; return true; }
    return false;
  }

  function tip() { const o = O(); return { x: o.x + Math.sin(hook.a) * hook.L, y: o.y + Math.cos(hook.a) * hook.L }; }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const speed = H * 1.1;
    if (hook.state === 'swing') {
      hook.t += dt * 1.9;
      hook.a = Math.sin(hook.t) * 1.2;
    } else if (hook.state === 'out') {
      hook.L += speed * dt;
      const p = tip();
      const hit = items.find(o => Math.hypot(o.x - p.x, o.y - p.y) < o.r + 7);
      if (hit) { hook.caught = hit; items = items.filter(o => o !== hit); hook.state = 'in'; Sound.click(); }
      else if (p.x < 0 || p.x > W || p.y > H) hook.state = 'in';
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
          onGrab && onGrab({ v, kind: c.kind, type: c.type });
          const it = spawn(); if (it) items.push(it);
        }
      }
    }
    if (hook.caught) { const p = tip(); hook.caught.x = p.x; hook.caught.y = p.y + hook.caught.r * 0.6; }
    draw(dt);
    raf = requestAnimationFrame(loop);
  }

  function drawItem(o) {
    ctx.save(); ctx.translate(o.x, o.y);
    if (o.kind === 'gold') {
      const g = ctx.createRadialGradient(-o.r * 0.35, -o.r * 0.35, o.r * 0.1, 0, 0, o.r);
      g.addColorStop(0, '#fff7b0'); g.addColorStop(0.4, '#ffd23a'); g.addColorStop(1, '#b07800');
      ctx.fillStyle = g; ctx.beginPath();
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, rr = o.r * (0.85 + 0.15 * Math.sin(i * 2.3 + o.seed * 9)); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.85); }
      ctx.closePath(); ctx.fill();
    } else if (o.kind === 'rock') {
      const g = ctx.createRadialGradient(-o.r * 0.3, -o.r * 0.3, 2, 0, 0, o.r);
      g.addColorStop(0, '#c2b4a0'); g.addColorStop(1, '#5a4c3e');
      ctx.fillStyle = g; ctx.beginPath();
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, rr = o.r * (0.8 + 0.2 * Math.sin(i * 3.1 + o.seed * 7)); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.8); }
      ctx.closePath(); ctx.fill();
    } else if (o.kind === 'gem') {
      ctx.fillStyle = '#5fd4ff'; ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -o.r); ctx.lineTo(o.r, -o.r * 0.2); ctx.lineTo(0, o.r); ctx.lineTo(-o.r, -o.r * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.shadowColor = '#7fe0ff'; ctx.shadowBlur = 12; ctx.stroke();
    } else if (o.kind === 'bag') {
      ctx.fillStyle = '#a0703a'; ctx.beginPath(); ctx.ellipse(0, 3, o.r, o.r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a5226'; ctx.fillRect(-5, -o.r + 2, 10, 6);
      ctx.fillStyle = '#ffe9a8'; ctx.font = `bold ${o.r}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 4);
    }
    ctx.restore();
  }

  function draw(dt) {
    // nền
    const sky = ctx.createLinearGradient(0, 0, 0, 90);
    sky.addColorStop(0, '#ffb347'); sky.addColorStop(1, '#ffcf7a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 90);
    const dirt = ctx.createLinearGradient(0, 90, 0, H);
    dirt.addColorStop(0, '#c98a3c'); dirt.addColorStop(0.5, '#9a5e24'); dirt.addColorStop(1, '#5a3110');
    ctx.fillStyle = dirt; ctx.fillRect(0, 90, W, H - 90);
    ctx.fillStyle = '#7a4a14'; ctx.fillRect(0, 86, W, 6);
    items.forEach(drawItem);
    // thợ mỏ + ròng rọc
    const o = O();
    if (img.complete) ctx.drawImage(img, o.x - 70, 4, 60, 66);
    ctx.fillStyle = '#5d4037'; ctx.fillRect(o.x - 14, o.y - 8, 28, 10);
    ctx.fillStyle = '#9aa4ad'; ctx.beginPath(); ctx.arc(o.x, o.y - 3, 7, 0, Math.PI * 2); ctx.fill();
    // dây + móc
    const p = tip();
    ctx.strokeStyle = '#3b2414'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    if (hook.caught) drawItem(hook.caught);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-hook.a);
    ctx.strokeStyle = '#6b7780'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-12, 4, -9, 14); ctx.moveTo(0, 0); ctx.quadraticCurveTo(12, 4, 9, 14); ctx.stroke();
    ctx.restore();
    // chữ bay
    floats = floats.filter(f => (f.life -= dt) > 0);
    floats.forEach(f => {
      ctx.globalAlpha = Math.min(1, f.life * 1.5);
      ctx.font = `800 ${f.big ? 30 : 22}px 'Baloo 2', sans-serif`; ctx.textAlign = 'left';
      ctx.fillStyle = f.bad ? '#ff6369' : '#fff3a0'; ctx.strokeStyle = '#4a2a00'; ctx.lineWidth = 4;
      const y = f.y - (1 - f.life) * 40;
      ctx.strokeText(f.text, f.x, y); ctx.fillText(f.text, f.x, y);
      ctx.globalAlpha = 1;
    });
  }

  return { start, stop, tap };
})();
