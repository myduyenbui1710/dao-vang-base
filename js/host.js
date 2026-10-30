// Màn host (chiếu lên TV). Host là "trọng tài": điều khiển pha, tính điểm, ghi bảng xếp hạng.
DB.init();
modeBanner();

const app = document.getElementById('app');
const TIMED = ['ready', 'mine', 'topic']; // các bước tự chuyển; cược, trả lời, đáp án, bảng xếp hạng đều chờ host bấm Next
const NEXT = { ready: 'mine', mine: 'topic', topic: 'bet', bet: 'answer', answer: 'reveal', reveal: 'board' };
const LAST = QUESTIONS.length - 1;

let room = null, state = null, players = {}, scores = {}, acts = {}, board = null, results = {};
let unsubs = [], actUnsub = null, advancing = false, lastRendered = '', lastTickSec = -1;
const R = p => `rooms/${room}/${p}`;
const isBetQ = (qi = state.q) => !!(state && state.betQs && state.betQs['q' + qi]);
let minerPrev = {};

function joinUrl() {
  const base = location.href.replace(/host\.html.*$/, '').replace(/[?#].*$/, '');
  return `${base}index.html?room=${room}`;
}

// ---------- Khởi tạo phòng ----------
async function setup() {
  const saved = localStorage.getItem('daovang_host_room');
  let resumable = null;
  if (saved) {
    const st = await DB.get(`rooms/${saved}/state`);
    if (st && st.phase !== 'final') resumable = saved;
  }
  app.innerHTML = `
    <div class="center-screen">
      <div class="logo">⛏️ <span>Đào Vàng</span> Base CRM</div>
      <p class="sub">Đào · Hé chủ đề · Đặt cược · Trả lời. Người hiểu bài thành người dám liều.</p>
      <button class="btn btn-gold btn-xl" id="newRoom">Tạo phòng mới</button>
      ${resumable ? `<button class="btn btn-ghost" id="resume">Tiếp tục phòng ${resumable}</button>` : ''}
    </div>`;
  document.getElementById('newRoom').onclick = async () => {
    Sound.unlock();
    room = String(rand(1000, 9999));
    // Câu cuối (Đêm vàng) luôn có cược + ngẫu nhiên thêm các câu khác cho đủ BET_COUNT.
    const picks = [...Array(LAST).keys()].sort(() => Math.random() - 0.5).slice(0, RULES.BET_COUNT - 1);
    const betQs = { ['q' + LAST]: true }; picks.forEach(qi => { betQs['q' + qi] = true; });
    await DB.set(`rooms/${room}`, { state: { phase: 'lobby', q: -1, endsAt: 0, betQs, createdAt: DB.now() } });
    localStorage.setItem('daovang_host_room', room);
    start();
    if (DEMO) startDemo();
  };
  const r = document.getElementById('resume');
  if (r) r.onclick = () => { Sound.unlock(); room = resumable; start(); };
}

// ---------- Chế độ demo: host.html?demo=19 tạo người chơi ảo để xem thử khi đông người ----------
const DEMO = Math.min(24, +new URLSearchParams(location.search).get('demo') || 0);
const DEMO_NAMES = ['Hùng', 'Lan', 'Quân', 'Thảo', 'Minh', 'Tuấn', 'Mai', 'Nam', 'Hà', 'Long', 'Vy', 'Khoa', 'Trang', 'Đức', 'Linh', 'Phong', 'Ngọc', 'Bảo', 'An', 'Sơn', 'Yến', 'Tâm', 'Kiên', 'Dũng'];
function startDemo() {
  const bots = {};
  DEMO_NAMES.slice(0, DEMO).forEach((name, i) => { bots['bot' + i] = { name, avatar: 'p' + i, joinedAt: i + 1 }; });
  DB.update(R('players'), bots);
  const ids = Object.keys(bots), mined = {}, grabs = {};
  let key = '', pool = [], lost = {};
  setInterval(() => {
    if (!state || state.q < 0) return;
    const q = state.q, k = state.phase + ':' + q;
    if (k !== key) {
      key = k;
      if (state.phase === 'ready' || state.phase === 'mine') { pool = Claw.previewPool(room + ':' + q, q); lost = {}; ids.forEach(b => { mined[b] = 0; grabs[b] = 0; }); }
      if (state.phase === 'bet') ids.forEach(b => setTimeout(() => {
        if (state.phase === 'bet') DB.update(R(`actions/${q}/${b}`), { bet: [0, 25, 25, 50, 50, 100][rand(0, 5)], confirmed: true });
      }, 500 + Math.random() * 6000));
      if (state.phase === 'answer') ids.forEach(b => setTimeout(() => {
        const a = Math.random() < 0.65 ? QUESTIONS[q].a : rand(0, 3);
        if (state.phase === 'answer') DB.update(R(`actions/${q}/${b}`), { ans: a, t: DB.now() });
      }, 1500 + Math.random() * 11000));
    }
    if (state.phase !== 'mine') return;
    ids.forEach(b => {
      if (Math.random() > 0.09) return;
      const free = pool.filter(o => !lost[o.id]).slice(0, 14);
      const it = free[rand(0, free.length - 1)]; if (!it) return;
      lost[it.id] = true;
      DB.claim(R(`claims/${q}/${it.id}`), { p: b, v: it.v }).then(ok => {
        if (!ok) return;
        mined[b] = clamp(mined[b] + it.v, 0, RULES.MAX_MINE); grabs[b]++;
        DB.update(R(`actions/${q}/${b}`), { mined: mined[b], ev: { n: grabs[b], kind: it.kind, type: it.type, v: it.v, icon: it.icon || null } });
      });
    });
  }, 300);
}

function start() {
  unsubs.forEach(u => u()); unsubs = [];
  unsubs.push(DB.on(R('state'), v => { if (v) { state = v; watchActions(); render(); } }));
  unsubs.push(DB.on(R('players'), v => { players = v || {}; ensureScores(); render(true); }));
  unsubs.push(DB.on(R('scores'), v => { scores = v || {}; }));
  unsubs.push(DB.on(R('board'), v => { board = v; render(true); }));
  unsubs.push(DB.on(R('results'), v => { results = v || {}; }));
}

function ensureScores() {
  Object.keys(players).forEach(pid => {
    if (!scores[pid]) {
      scores[pid] = { bank: RULES.START_BANK, rank: 0, correctCount: 0, allInCount: 0 };
      DB.set(R(`scores/${pid}`), scores[pid]);
    }
  });
}

function watchActions() {
  if (actUnsub && actUnsub.q === state.q) return;
  if (actUnsub) actUnsub();
  acts = {};
  if (state.q < 0) { actUnsub = null; return; }
  const u = DB.on(R(`actions/${state.q}`), v => { acts = v || {}; updateLive(); checkAllAnswered(); });
  actUnsub = () => u(); actUnsub.q = state.q;
}

// ---------- Điều khiển pha ----------
async function goPhase(phase, q = state.q) {
  const now = DB.now();
  const dur = RULES.DUR[phase] || 0;
  const s = { ...state, phase, q, endsAt: dur ? now + dur * 1000 : 0 };
  if (phase === 'answer') s.answerStart = now;
  state = s;
  await DB.set(R('state'), s);
}

async function advance() {
  if (advancing) return;
  advancing = true;
  try {
    const p = state.phase;
    if (p === 'lobby') await goPhase('ready', 0);
    else if (p === 'answer') { await computeReveal(); await goPhase('reveal'); }
    else if (p === 'board') { if (state.q >= LAST) await goPhase('final'); else await goPhase('ready', state.q + 1); }
    else if (p === 'topic') await goPhase(isBetQ() ? 'bet' : 'answer');
    else if (NEXT[p]) await goPhase(NEXT[p]);
  } finally { advancing = false; }
}

function checkAllAnswered() {
  // Trả lời luôn chạy đủ 15s. Riêng bước cược: mọi người đã xác nhận thì mở câu hỏi luôn.
  if (!state || state.phase !== 'bet') return;
  const pids = Object.keys(players);

}

setInterval(() => {
  if (!state || !(TIMED.includes(state.phase) || state.phase === 'answer')) return;
  const left = state.endsAt - DB.now();
  const sec = Math.max(0, Math.ceil(left / 1000));
  const cd = document.getElementById('cd');
  if (cd) cd.textContent = sec;
  const bar = document.getElementById('cdbar');
  if (bar) bar.style.width = clamp(left / ((RULES.DUR[state.phase]) * 1000) * 100, 0, 100) + '%';
  if (state.phase === 'answer' && sec <= 5 && sec !== lastTickSec && sec > 0) { lastTickSec = sec; Sound.tick(); }
  if (state.phase === 'answer') { updateAnswerBtn(); return; }
  if (left <= 0) advance();
}, 150);

// ---------- Tính điểm ----------
async function computeReveal() {
  const qi = state.q, Q = QUESTIONS[qi], last = qi === LAST;
  const a = (await DB.get(R(`actions/${qi}`))) || {};
  const betQ = isBetQ(qi);
  const ansDur = RULES.DUR.answer * 1000;
  const dist = [0, 0, 0, 0];
  const rows = Object.keys(players).map(pid => {
    const p = players[pid];
    const s = scores[pid] || { bank: RULES.START_BANK, correctCount: 0, allInCount: 0, rank: 0 };
    const act = a[pid] || {};
    const pocket = clamp(Math.round(act.mined || 0), 0, RULES.MAX_MINE);
    const base = last ? pocket + s.bank : pocket;
    const pct = betQ ? (act.bet || 0) : 0;
    const bet = Math.round(base * pct / 100);
    const answered = act.ans != null;
    if (answered) dist[act.ans]++;
    const correct = answered && act.ans === Q.a;
    const frac = correct ? clamp((state.answerStart + ansDur - (act.t || 0)) / ansDur, 0, 1) : 0;
    // Có cược: đúng nhận số cược (+thưởng tốc độ), sai mất số cược. Không cược: đúng được thưởng cố định + tốc độ.
    const speed = correct ? Math.round((bet ? bet * RULES.SPEED_BONUS : RULES.CORRECT_BONUS) * frac) : 0;
    const gain = bet ? (correct ? bet * (last ? RULES.LAST_MULT : 1) + speed : -bet) : (correct ? RULES.CORRECT_BONUS + speed : 0);
    const bank = Math.max(0, s.bank + pocket + gain);
    const allIn = pct === 100 && bet > 0;
    let title = '';
    if (allIn && !correct) title = 'All-in thất bại 💀';
    else if (allIn && correct) title = 'Thần tài ⚡';
    return {
      pid, name: p.name, avatar: p.avatar, prevBank: s.bank, prevRank: s.rank || 0,
      pocket, pct, bet, answered, ans: answered ? act.ans : null, correct, speed, gain, bank, allIn, title,
      correctCount: (s.correctCount || 0) + (correct ? 1 : 0),
      allInCount: (s.allInCount || 0) + (allIn ? 1 : 0),
    };
  });
  rows.sort((x, y) => y.bank - x.bank || x.name.localeCompare(y.name));
  rows.forEach((r, i) => { r.rank = i + 1; if (!r.prevRank) r.prevRank = r.rank; });

  const upd = {};
  rows.forEach(r => {
    upd[r.pid] = {
      q: qi, bank: r.bank, rank: r.rank, prev: r.prevRank, pocket: r.pocket, pct: r.pct, bet: r.bet,
      answered: r.answered, correct: r.correct, speed: r.speed, gain: r.gain, title: r.title,
      correctCount: r.correctCount, allInCount: r.allInCount, total: rows.length,
    };
  });
  await DB.update(R('scores'), upd);
  const pick = r => ({ pid: r.pid, name: r.name, avatar: r.avatar, bank: r.bank, rank: r.rank, prev: r.prevRank, gain: r.gain, bet: r.bet });
  const correctN = rows.filter(r => r.correct).length;
  const b = {
    q: qi,
    top: rows.slice(0, 5).map(pick),
    fails: rows.filter(r => r.allIn && !r.correct).map(pick),
    heroes: rows.filter(r => r.allIn && r.correct).map(pick),
    dist, correctN, total: rows.length,
  };
  await DB.set(R('board'), b);
  await DB.set(R(`results/${qi}`), { dist, correctN, total: rows.length });
}

// ---------- Hiển thị ----------
function header() {
  const q = state.q;
  return `<div class="host-top">
    <div class="pill">Phòng <b>${room}</b></div>
    ${q >= 0 && state.phase !== 'final' ? `<div class="pill">Câu <b>${q + 1}</b>/${QUESTIONS.length}${q === LAST ? ' · <span class="hot">ĐÊM VÀNG x2</span>' : ''}${isBetQ(q) ? ' · <span class="hot">🎲 Câu có cược</span>' : ''}</div>` : ''}
    <div class="pill">👥 ${Object.keys(players).length}</div>
    <button class="pill btn-icon" id="musicBtn">${Sound.musicOn ? '🔊' : '🔇'}</button>
  </div>`;
}
const timerBar = () => `<div class="cd-wrap"><div class="cd-bar" id="cdbar"></div></div><div class="cd-num" id="cd"></div>`;

function avatarsGrid() {
  const list = Object.values(players).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  if (!list.length) return '<p class="muted">Chưa có ai vào phòng…</p>';
  return `<div class="ava-grid">${list.map(p => `<div class="ava-chip"><span class="ava">${ava(p.avatar)}</span>${esc(p.name)}</div>`).join('')}</div>`;
}

function boardData() {
  const b = board && board.q === state.q ? board : {};
  const d = b.dist || [];
  return { top: b.top || [], fails: b.fails || [], heroes: b.heroes || [], correctN: b.correctN || 0, total: b.total || 0,
    dist: [0, 1, 2, 3].map(i => d[i] || 0) };
}

function rankArrow(r) {
  const d = (r.prev || r.rank) - r.rank;
  if (d > 0) return `<span class="up">▲${d}</span>`;
  if (d < 0) return `<span class="down">▼${-d}</span>`;
  return '<span class="same">•</span>';
}

function render(soft = false) {
  try { renderInner(soft); } catch (e) { console.error(e); }
}

function renderInner(soft = false) {
  if (!state) return;
  const key = state.phase + ':' + state.q;
  if (soft && key === lastRendered && !['lobby', 'reveal', 'board', 'final'].includes(state.phase)) { updateLive(); return; }
  const firstTime = key !== lastRendered;
  lastRendered = key;
  const Q = QUESTIONS[state.q];
  let body = '';
  switch (state.phase) {
    case 'lobby':
      Sound.play('lobby');
      body = `<div class="lobby">
        <div class="qr-box"><div id="qr"></div><div class="join-url">${esc(joinUrl())}</div>
          <div class="room-code">Mã phòng <b>${room}</b></div></div>
        <div class="lobby-right">
          <h2>Quét QR để vào mỏ vàng ⛏️</h2>
          ${avatarsGrid()}
          <div class="rules-mini">
            <div>🪝 <b>Kéo vàng ${RULES.DUR.mine}s</b>: chạm điện thoại để thả móc. Vàng to nặng kéo chậm, kim cương nhẹ mà đắt, đá thì nặng mà rẻ</div>
            <div>👀 <b>Hé chủ đề 3s</b></div>
            <div>🎲 <b>${RULES.BET_COUNT} câu có cược</b>: Không cược · 25% · 50% · ALL-IN số vàng vừa đào, bấm Xác nhận</div>
            <div>❓ <b>Trả lời 15s</b>: có cược thì đúng nhận số cược, sai mất số cược. Không cược thì đúng được +${RULES.CORRECT_BONUS}</div>
            <div>🌙 <b>Câu cuối Đêm vàng</b>: được cược cả Két, thắng x2</div>
          </div>
          <button class="btn btn-gold btn-xl" id="startBtn" ${Object.keys(players).length ? '' : 'disabled'}>Bắt đầu ▶</button>
        </div></div>`;
      break;
    case 'ready':
      Sound.play('tense');
      body = `<div class="phase-big"><p class="sub">Màn ${state.q + 1}/${QUESTIONS.length}${state.q === LAST ? ' · ĐÊM VÀNG x2' : ''}</p>
        <h1>${THEMES[state.q % THEMES.length].icon} ${THEMES[state.q % THEMES.length].name}</h1><div class="ready-num pop" id="cd"></div>
        <p class="sub">Cầm điện thoại lên, chạm để thả móc kéo vàng 🪝</p></div>`;
      break;
    case 'mine':
      Sound.play('mine');
      minerPrev = {};
      body = mineScene();
      break;
    case 'topic':
      Sound.play('tense');
      body = `<div class="phase-big"><p class="sub">Chủ đề câu ${state.q + 1}</p><h1 class="topic pop">${esc(Q.topic)}</h1>${timerBar()}</div>`;
      break;
    case 'bet':
      body = `<div class="bet-screen"><div class="bet-head"><div><h1>🎲 ĐẶT CƯỢC</h1>
        <p class="sub">Chủ đề: <b>${esc(Q.topic)}</b>${state.q === LAST ? ' · <span class="hot">🌙 Đêm vàng: cược cả Két, thắng x2</span>' : ''}</p></div>
        <button class="btn btn-gold btn-xl" id="openQ">Next ▶ Mở câu hỏi</button></div>
        <div class="bet-summary" id="betSum"></div><div class="bet-list" id="betList"></div></div>`;
      break;
    case 'answer':
      lastTickSec = -1;
      body = `<div class="question-screen"><div class="q-text">${esc(Q.q)}</div>${timerBar()}
        <div class="opts">${Q.opts.map((o, i) => `<div class="opt opt-${i}"><span class="shape">${OPT_SHAPES[i]}</span><b>${OPT_LABELS[i]}</b> ${esc(o)}</div>`).join('')}</div>
        <div class="live" id="live"></div>
        <button class="btn btn-gold btn-xl" id="toReveal" disabled>Next ▶ Công bố đáp án</button></div>`;
      break;
    case 'reveal': {
      if (firstTime) Sound.reveal();
      const b = boardData();
      const max = Math.max(1, ...b.dist);
      body = `<div class="question-screen"><div class="q-text">${esc(Q.q)}</div>
        <div class="opts">${Q.opts.map((o, i) => `<div class="opt opt-${i} ${i === Q.a ? 'is-correct' : 'is-dim'}">
          <span class="shape">${OPT_SHAPES[i]}</span><b>${OPT_LABELS[i]}</b> ${esc(o)}
          <span class="dist"><span class="dist-bar" style="width:${b.dist[i] / max * 100}%"></span>${b.dist[i]}</span></div>`).join('')}</div>
        <p class="sub"><b>${b.correctN}/${b.total}</b> người trả lời đúng</p>
        <button class="btn btn-gold btn-xl" id="toBoard">Next ▶ Bảng xếp hạng</button></div>`;
      break;
    }
    case 'board': {
      Sound.play('board');
      const b = boardData();
      if (firstTime) { if (b.fails.length) Sound.allin(); else Sound.fanfare(); }
      body = `<div class="board">
        <h1>Bảng xếp hạng sau câu ${state.q + 1}</h1>
        <div class="top5">${b.top.map((r, i) => `<div class="row slide-in" style="animation-delay:${i * 0.12}s">
          <span class="rk">#${r.rank}</span>${rankArrow(r)}<span class="ava">${ava(r.avatar)}</span>
          <span class="nm">${esc(r.name)}</span><span class="gain ${r.gain >= 0 ? 'pos' : 'neg'}">${r.gain >= 0 ? '+' : ''}${fmt(r.gain)}</span>
          <span class="bk">💰 ${fmt(r.bank)}</span></div>`).join('')}</div>
        ${b.fails.length ? `<div class="shame pop">💀 ALL-IN THẤT BẠI: ${b.fails.map(r => `<b>${ava(r.avatar)} ${esc(r.name)}</b> (−${fmt(r.bet)})`).join(' · ')}</div>` : ''}
        ${b.heroes.length ? `<div class="hero pop">⚡ THẦN TÀI: ${b.heroes.map(r => `<b>${ava(r.avatar)} ${esc(r.name)}</b> (+${fmt(r.gain)})`).join(' · ')}</div>` : ''}
        <button class="btn btn-gold btn-xl" id="nextBtn">${state.q >= LAST ? 'Xem kết quả cuối 🏆' : `Sẵn sàng câu ${state.q + 2} ▶`}</button>
      </div>`;
      break;
    }
    case 'final':
      renderFinal(firstTime);
      return;
  }
  app.innerHTML = (state.phase === 'mine' ? '' : header()) + body;
  bindCommon();
  if (state.phase === 'lobby') {
    const qr = document.getElementById('qr');
    if (qr && window.QRCode) new QRCode(qr, { text: joinUrl(), width: 280, height: 280, colorDark: '#1a1208', colorLight: '#ffffff' });
    const sb = document.getElementById('startBtn'); if (sb) sb.onclick = () => { Sound.unlock(); advance(); };
  }
  const nb = document.getElementById('nextBtn'); if (nb) nb.onclick = () => advance();
  const oq = document.getElementById('openQ'); if (oq) oq.onclick = () => advance();
  ['toReveal', 'toBoard'].forEach(id => { const b = document.getElementById(id); if (b) b.onclick = () => advance(); });
  updateLive();
}

function bindCommon() {
  const m = document.getElementById('musicBtn');
  if (m) m.onclick = () => { Sound.unlock(); Sound.toggleMusic(); m.textContent = Sound.musicOn ? '🔊' : '🔇'; };
}

function updateLive() {
  if (state && state.phase === 'mine') return updateMiners();
  if (state && state.phase === 'bet') return updateBets();
  const el = document.getElementById('live'); if (!el || !state) return;
  const n = Object.keys(players).length;
  const list = Object.values(acts);

  if (state.phase === 'answer') { el.innerHTML = `${list.filter(a => a.ans != null).length}/${n} đã trả lời`; updateAnswerBtn(); }
}

// ---------- Màn mỏ vàng toàn màn hình: mỗi thợ mỏ một sợi dây ----------
function mineScene() {
  const list = Object.keys(players).map(pid => ({ pid, ...players[pid] }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  const n = Math.max(1, list.length);
  // Luôn 1 hàng; đông người thì nhân vật thu nhỏ để vừa màn hình
  const ledges = [n > 10 ? 30 : 42];
  const scale = clamp(10 / n, 0.4, 1);
  const slot = i => ({ x: 1 + (i + 0.5) / n * 98, y: ledges[0] });
  const th = THEMES[state.q % THEMES.length];
  const pos = i => `left:${(i * 37 + 11) % 94 + 3}%;top:${8 + (i * 53) % 84}%`;
  const types = ['gold_s', 'gold_m', 'gold_s', 'gold_l', 'rock_s', 'gold_m', 'gold_s', 'rock_l', 'bag', 'gold_m'];
  const urls = {}; types.forEach(t => { urls[t] = urls[t] || Claw.itemURL(state.q, t); });
  const decor = [...Array(22)].map((_, i) => `<img class="dec" src="${urls[types[i % types.length]]}" style="${pos(i)}" alt="">`).join('')
    + [0, 1, 2, 3, 4, 5].map(i => `<span class="dec-emoji" style="${pos(i * 4 + 23)}">${i < 2 ? '💣' : i < 3 ? th.special.icon : th.walls[0]}</span>`).join('')
    + [...Array(6)].map((_, i) => `<span class="walker" style="top:${12 + i * 14}%;animation-duration:${9 + (i * 5) % 9}s;animation-delay:-${i * 2.3}s"><span class="walker-in" style="animation-duration:${9 + (i * 5) % 9}s;animation-delay:-${i * 2.3}s">${th.animals[i % th.animals.length].icon}</span></span>`).join('');
  return `<div class="mine-scene" style="--s:${scale}">
    <div class="scene-sky" style="height:${ledges[ledges.length - 1]}%;background:linear-gradient(180deg,${th.sky[0]},${th.sky[1]})"><div class="scene-hud">
      <div class="hud-box">Câu <b>${state.q + 1}</b>/${QUESTIONS.length}${isBetQ() ? ' · 🎲' : ''}</div>
      <div class="hud-title">${th.icon} ${th.name}</div>
      <div class="hud-box">⏱ <b id="cd"></b>s &nbsp; 💰 <b id="mineSum">0</b></div>
    </div><div class="scene-bar"><div class="cd-bar" id="cdbar"></div></div></div>
    <div class="scene-ground" style="top:${ledges[ledges.length - 1]}%;background:linear-gradient(180deg,${th.dirt[0]},${th.dirt[1]} 55%,${th.dirt[2]})">${decor}</div>
    <div class="rope-row">${list.map((p, i) => `<div class="rm${p.pid === localStorage.getItem('daovang_pid_' + room) ? ' me' : ''}" id="sm-${p.pid}" data-y="${slot(i).y}" style="left:${slot(i).x}%;top:${slot(i).y}%;--rc:${ropeColor(p.avatar)}">
      <div class="rm-tag"><span class="sm-crown">👑</span><span class="sm-name">${esc(p.name)}</span><span class="sm-gold">0</span></div>
      <div class="rm-fig">${/^[mp]\d+$/.test(p.avatar) ? minerSVG(p.avatar) : `<span class="sm-ava">${esc(p.avatar)}</span>`}</div>
      <div class="rm-pulley"></div>
      <div class="rope" style="animation-delay:-${(i * 0.37) % 2.4}s"><div class="rope-line"></div><div class="claw-hook"><span class="hook-item"></span></div></div>
      <div class="sm-fx"></div>
    </div>`).join('')}</div>
  </div>`;
}

let lastCoinSfx = 0;
function pullRope(el, ev) {
  const rope = el.querySelector('.rope'), item = el.querySelector('.hook-item'), fig = el.querySelector('.rm-fig');
  const room = innerHeight * (1 - (+el.dataset.y || 42) / 100);
  const depth = Math.round(room * (0.35 + Math.random() * 0.55));
  const bad = ev.kind === 'bomb' || ev.kind === 'wall';
  rope.style.setProperty('--depth', depth + 'px');
  item.className = 'hook-item'; item.innerHTML = '';
  rope.classList.remove('pull'); void rope.offsetWidth; rope.classList.add('pull');
  fig.classList.remove('dig', 'boom'); void fig.offsetWidth; fig.classList.add('dig');
  setTimeout(() => {
    item.className = 'hook-item show' + (ev.kind === 'bomb' ? ' blast' : '');
    if (ev.kind === 'bomb') { item.textContent = '💥'; Sound.boom(); fig.classList.add('boom'); }
    else if (ev.kind === 'wall') { item.textContent = '⚡'; Sound.clang(); }
    else if (ev.icon) item.textContent = ev.icon;
    else item.innerHTML = `<img src="${Claw.itemURL(state.q, ev.type)}" alt="">`;
  }, 500);
  if (bad) setTimeout(() => { item.className = 'hook-item'; item.innerHTML = ''; }, 800);
  setTimeout(() => {
    item.className = 'hook-item'; item.innerHTML = '';
    const t = document.createElement('span');
    t.className = 'sm-plus' + (ev.v >= 300 ? ' big' : '') + (ev.kind === 'rock' || bad ? ' bad' : '');
    t.textContent = ev.kind === 'bomb' ? '💥 -' + fmt(-ev.v) : ev.kind === 'wall' ? 'Keng!' : '+' + fmt(ev.v);
    el.querySelector('.sm-fx').appendChild(t); setTimeout(() => t.remove(), 1100);
    if (!bad && Date.now() - lastCoinSfx > 150) { lastCoinSfx = Date.now(); ev.kind === 'rock' ? Sound.rock() : ev.v >= 300 ? Sound.big() : Sound.coin(); }
  }, 1250);
}

// Nút công bố đáp án mở khi tất cả đã chọn, hoặc đã hết 15 giây (phòng khi có người không trả lời)
function updateAnswerBtn() {
  const b = document.getElementById('toReveal'); if (!b) return;
  const pids = Object.keys(players);
  const all = pids.length > 0 && pids.every(pid => acts[pid] && acts[pid].ans != null);
  b.disabled = !(all || state.endsAt - DB.now() <= 0);
}

function updateMiners() {
  let sum = 0, leader = null, best = 0;
  Object.keys(players).forEach(pid => {
    const a = acts[pid] || {}, mined = a.mined || 0;
    sum += mined;
    if (mined > best) { best = mined; leader = pid; }
    const el = document.getElementById('sm-' + pid); if (!el) return;
    const prevN = minerPrev[pid] || 0;
    if (a.ev && a.ev.n > prevN) {
      minerPrev[pid] = a.ev.n;
      pullRope(el, a.ev);
      setTimeout(() => { el.querySelector('.sm-gold').textContent = fmt(mined); }, 1250);
    }
  });
  document.querySelectorAll('.rm.lead').forEach(e => e.classList.remove('lead'));
  if (leader) { const l = document.getElementById('sm-' + leader); if (l) l.classList.add('lead'); }
  const ms = document.getElementById('mineSum'); if (ms) ms.textContent = fmt(sum);
}

// ---------- Màn cược: ai cược thế nào ----------
function updateBets() {
  const box = document.getElementById('betList'); if (!box) return;
  const last = state.q === LAST;
  const rows = Object.keys(players).map(pid => {
    const a = acts[pid] || {}, s = scores[pid] || {};
    const base = (a.mined || 0) + (last ? (s.bank || 0) : 0);
    return { ...players[pid], a, amount: Math.round(base * (a.bet || 0) / 100) };
  }).sort((x, y) => (y.a.confirmed ? 1 : 0) - (x.a.confirmed ? 1 : 0) || (y.a.bet || 0) - (x.a.bet || 0));
  const label = a => !a.confirmed ? '<span class="bt wait">⏳ Đang chọn…</span>'
    : a.bet === 100 ? '<span class="bt allin">ALL-IN 🔥</span>'
    : a.bet ? `<span class="bt pct">${a.bet}%</span>` : '<span class="bt none">Không cược</span>';
  box.innerHTML = rows.map(r => `<div class="bet-row ${r.a.confirmed ? 'done' : ''} ${r.a.bet === 100 && r.a.confirmed ? 'is-allin' : ''}">
    <span class="ava">${ava(r.avatar)}</span><span class="nm">${esc(r.name)}</span>${label(r.a)}
    <span class="amt">${r.a.confirmed && r.a.bet ? '💰 ' + fmt(r.amount) : ''}</span></div>`).join('');
  const done = rows.filter(r => r.a.confirmed).length, allin = rows.filter(r => r.a.confirmed && r.a.bet === 100).length;
  const tot = rows.reduce((t, r) => t + (r.a.confirmed ? r.amount : 0), 0);
  document.getElementById('betSum').innerHTML = `Đã xác nhận <b>${done}/${rows.length}</b> · Tổng cược 💰 <b>${fmt(tot)}</b>${allin ? ` · <span class="hot">🔥 ${allin} người ALL-IN</span>` : ''}`;
}

async function renderFinal(firstTime) {
  if (firstTime) { Sound.play('board'); Sound.fanfare(); confetti(6000); }
  const sc = (await DB.get(R('scores'))) || {};
  const res = (await DB.get(R('results'))) || {};
  const rows = Object.keys(players).map(pid => ({ pid, ...players[pid], ...(sc[pid] || {}) }))
    .sort((a, b) => (b.bank || 0) - (a.bank || 0));
  const pod = [rows[1], rows[0], rows[2]];
  app.innerHTML = header() + `<div class="final">
    <h1>🏆 Vinh danh thợ mỏ</h1>
    <div class="podium">${pod.map((r, i) => r ? `<div class="pod pod-${[2, 1, 3][i]}">
      <div class="ava big">${ava(r.avatar)}</div><div class="nm">${esc(r.name)}</div><div class="bk">💰 ${fmt(r.bank)}</div>
      <div class="block">${[2, 1, 3][i]}</div></div>` : '<div class="pod"></div>').join('')}</div>
    <div class="final-actions">
      <button class="btn btn-gold" id="csvBtn">⬇ Xuất CSV</button>
      <button class="btn btn-ghost" id="keyBtn">📋 Đáp án</button>
      <button class="btn btn-ghost" id="againBtn">Chơi ván mới</button>
    </div>
    <table class="rank-table"><thead><tr><th>#</th><th>Người chơi</th><th>Vàng</th><th>Đúng</th><th>All-in</th></tr></thead>
    <tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${ava(r.avatar)} ${esc(r.name)}</td><td>${fmt(r.bank)}</td><td>${r.correctCount || 0}/${QUESTIONS.length}</td><td>${r.allInCount || 0}</td></tr>`).join('')}</tbody></table>
    <div id="answerKey" class="answer-key">
      <h2>📋 Danh mục câu hỏi và đáp án</h2>
      ${QUESTIONS.map((Q, i) => {
        const r = res[i];
        const pct = r && r.total ? Math.round(r.correctN / r.total * 100) : null;
        return `<div class="key-item"><div class="key-q"><span class="key-n">${i + 1}</span>${esc(Q.q)}
          <span class="key-topic">${esc(Q.topic)}</span></div>
          <div class="key-a">✅ <b>${OPT_LABELS[Q.a]}.</b> ${esc(Q.opts[Q.a])}${pct != null ? `<span class="key-pct">${pct}% trả lời đúng</span>` : ''}</div></div>`;
      }).join('')}
    </div></div>`;
  bindCommon();
  document.getElementById('csvBtn').onclick = () => exportCsv(rows);
  document.getElementById('keyBtn').onclick = () => document.getElementById('answerKey').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('againBtn').onclick = () => { localStorage.removeItem('daovang_host_room'); location.reload(); };
}

function exportCsv(rows) {
  const head = ['Hạng', 'Tên', 'Avatar', 'Vàng', 'Số câu đúng', 'Số lần All-in'];
  const lines = [head].concat(rows.map((r, i) => [i + 1, r.name, r.avatar, r.bank || 0, r.correctCount || 0, r.allInCount || 0]))
    .map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `ket-qua-dao-vang-phong-${room}.csv`; a.click();
}

setup();
