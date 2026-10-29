// Màn host (chiếu lên TV). Host là "trọng tài": điều khiển pha, tính điểm, ghi bảng xếp hạng.
DB.init();
modeBanner();

const app = document.getElementById('app');
const TIMED = ['ready', 'mine', 'topic', 'bet', 'answer', 'reveal'];
const NEXT = { ready: 'mine', mine: 'topic', topic: 'bet', bet: 'answer', answer: 'reveal', reveal: 'board' };
const LAST = QUESTIONS.length - 1;

let room = null, state = null, players = {}, scores = {}, acts = {}, board = null, results = {};
let unsubs = [], actUnsub = null, advancing = false, lastRendered = '', lastTickSec = -1;
const R = p => `rooms/${room}/${p}`;

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
    const order = [...Array(LAST).keys()].sort(() => Math.random() - 0.5).slice(0, RULES.FORCED_COUNT);
    const levels = [25, 50, 100].sort(() => Math.random() - 0.5);
    const forced = {}; order.forEach((qi, i) => { forced[qi] = levels[i % 3]; });
    await DB.set(`rooms/${room}`, { state: { phase: 'lobby', q: -1, endsAt: 0, forced, createdAt: DB.now() } });
    localStorage.setItem('daovang_host_room', room);
    start();
  };
  const r = document.getElementById('resume');
  if (r) r.onclick = () => { Sound.unlock(); room = resumable; start(); };
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
    else if (NEXT[p]) await goPhase(NEXT[p]);
  } finally { advancing = false; }
}

function checkAllAnswered() {
  if (!state || state.phase !== 'answer') return;
  // Giữ đủ thời gian trả lời, không kết thúc sớm khi mọi người đã chọn.
  return;
}

setInterval(() => {
  if (!state || !TIMED.includes(state.phase)) return;
  const left = state.endsAt - DB.now();
  const sec = Math.max(0, Math.ceil(left / 1000));
  const cd = document.getElementById('cd');
  if (cd) cd.textContent = sec;
  const bar = document.getElementById('cdbar');
  if (bar) bar.style.width = clamp(left / ((RULES.DUR[state.phase]) * 1000) * 100, 0, 100) + '%';
  if (state.phase === 'answer' && sec <= 5 && sec !== lastTickSec && sec > 0) { lastTickSec = sec; Sound.tick(); }
  if (left <= 0) advance();
}, 150);

// ---------- Tính điểm ----------
async function computeReveal() {
  const qi = state.q, Q = QUESTIONS[qi], last = qi === LAST;
  const a = (await DB.get(R(`actions/${qi}`))) || {};
  const forcedPct = state.forced && state.forced[qi];
  const ansDur = RULES.DUR.answer * 1000;
  const dist = [0, 0, 0, 0];
  const rows = Object.keys(players).map(pid => {
    const p = players[pid];
    const s = scores[pid] || { bank: RULES.START_BANK, correctCount: 0, allInCount: 0, rank: 0 };
    const act = a[pid] || {};
    const pocket = clamp(Math.round(act.mined || 0), 0, RULES.MAX_MINE);
    const base = last ? pocket + s.bank : pocket;
    const pct = forcedPct || act.bet || RULES.DEFAULT_BET;
    const bet = Math.round(base * pct / 100);
    const answered = act.ans != null;
    if (answered) dist[act.ans]++;
    const correct = answered && act.ans === Q.a;
    const frac = correct ? clamp((state.answerStart + ansDur - (act.t || 0)) / ansDur, 0, 1) : 0;
    const speed = correct ? Math.round(bet * RULES.SPEED_BONUS * frac) : 0;
    const gain = correct ? bet * (last ? RULES.LAST_MULT : 1) + speed : -bet;
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
  const forced = state.forced && state.forced[q];
  return `<div class="host-top">
    <div class="pill">Phòng <b>${room}</b></div>
    ${q >= 0 && state.phase !== 'final' ? `<div class="pill">Câu <b>${q + 1}</b>/${QUESTIONS.length}${q === LAST ? ' · <span class="hot">ĐÊM VÀNG x2</span>' : ''}${forced ? ` · <span class="hot">Cược bắt buộc ${forced === 100 ? 'ALL-IN' : forced + '%'}</span>` : ''}</div>` : ''}
    <div class="pill">👥 ${Object.keys(players).length}</div>
    <button class="pill btn-icon" id="musicBtn">${Sound.musicOn ? '🔊' : '🔇'}</button>
  </div>`;
}
const timerBar = () => `<div class="cd-wrap"><div class="cd-bar" id="cdbar"></div></div><div class="cd-num" id="cd"></div>`;

function avatarsGrid() {
  const list = Object.values(players).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  if (!list.length) return '<p class="muted">Chưa có ai vào phòng…</p>';
  return `<div class="ava-grid">${list.map(p => `<div class="ava-chip"><span class="ava">${esc(p.avatar)}</span>${esc(p.name)}</div>`).join('')}</div>`;
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
  if (soft && key === lastRendered && !['lobby', 'board', 'final'].includes(state.phase)) { updateLive(); return; }
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
            <div>⛏️ <b>Đào 5s</b>: bấm liên tục, có lúc trúng cục to x5, có lúc đào phải đá</div>
            <div>👀 <b>Hé chủ đề 3s</b></div>
            <div>🎲 <b>Cược 5s</b>: 25% · 50% · ALL-IN số vàng vừa đào. Phần không cược vào Két an toàn</div>
            <div>❓ <b>Trả lời 15s</b>: đúng nhận số cược + thưởng tốc độ, sai mất số cược</div>
            <div>🌙 <b>Câu cuối Đêm vàng</b>: được cược cả Két, thắng x2</div>
          </div>
          <button class="btn btn-gold btn-xl" id="startBtn" ${Object.keys(players).length ? '' : 'disabled'}>Bắt đầu ▶</button>
        </div></div>`;
      break;
    case 'ready':
      Sound.play('tense');
      body = `<div class="phase-big"><p class="sub">Câu ${state.q + 1}/${QUESTIONS.length}${state.q === LAST ? ' · 🌙 ĐÊM VÀNG x2' : ''}</p>
        <h1>CHUẨN BỊ ĐÀO!</h1><div class="ready-num pop" id="cd"></div>
        <p class="sub">Cầm điện thoại lên, sẵn sàng bấm thật nhanh ⛏️</p></div>`;
      break;
    case 'mine':
      Sound.play('mine');
      body = `<div class="mine-screen"><div class="mine-head"><div class="mine-pick shake-loop">⛏️</div>
        <div><h1>ĐÀO VÀNG!</h1><p class="sub">Bấm liên tục vào cục đá trên điện thoại</p></div><div class="cd-num" id="cd"></div></div>
        ${timerBar()}<div class="mine-total-host">Cả mỏ: 💰 <b id="mineSum">0</b></div>
        <div class="miners" id="miners"></div><div class="gold-rain">${'<span>💰</span>'.repeat(14)}</div></div>`;
      break;
    case 'topic':
      Sound.play('tense');
      body = `<div class="phase-big"><p class="sub">Chủ đề câu ${state.q + 1}</p><h1 class="topic pop">${esc(Q.topic)}</h1>${timerBar()}</div>`;
      break;
    case 'bet': {
      const f = state.forced && state.forced[state.q];
      body = `<div class="phase-big"><div class="phase-emoji">🎲</div><h1>ĐẶT CƯỢC!</h1>
        ${f ? `<p class="forced pop">Câu này cược bắt buộc: <b>${f === 100 ? 'ALL-IN' : f + '%'}</b></p>` : '<p class="sub">25% · 50% · ALL-IN</p>'}
        ${state.q === LAST ? '<p class="forced">🌙 Đêm vàng: được cược cả Két, thắng x2</p>' : ''}
        <p class="sub">Chủ đề: <b>${esc(Q.topic)}</b></p>${timerBar()}<div class="live" id="live"></div></div>`;
      break;
    }
    case 'answer':
      lastTickSec = -1;
      body = `<div class="question-screen"><div class="q-text">${esc(Q.q)}</div>${timerBar()}
        <div class="opts">${Q.opts.map((o, i) => `<div class="opt opt-${i}"><span class="shape">${OPT_SHAPES[i]}</span><b>${OPT_LABELS[i]}</b> ${esc(o)}</div>`).join('')}</div>
        <div class="live" id="live"></div></div>`;
      break;
    case 'reveal': {
      if (firstTime) Sound.reveal();
      const b = boardData();
      const max = Math.max(1, ...b.dist);
      body = `<div class="question-screen"><div class="q-text">${esc(Q.q)}</div>
        <div class="opts">${Q.opts.map((o, i) => `<div class="opt opt-${i} ${i === Q.a ? 'is-correct' : 'is-dim'}">
          <span class="shape">${OPT_SHAPES[i]}</span><b>${OPT_LABELS[i]}</b> ${esc(o)}
          <span class="dist"><span class="dist-bar" style="width:${b.dist[i] / max * 100}%"></span>${b.dist[i]}</span></div>`).join('')}</div>
        <p class="sub"><b>${b.correctN}/${b.total}</b> người trả lời đúng</p>${timerBar()}</div>`;
      break;
    }
    case 'board': {
      Sound.play('board');
      const b = boardData();
      if (firstTime) { if (b.fails.length) Sound.allin(); else Sound.fanfare(); }
      body = `<div class="board">
        <h1>Bảng xếp hạng sau câu ${state.q + 1}</h1>
        <div class="top5">${b.top.map((r, i) => `<div class="row slide-in" style="animation-delay:${i * 0.12}s">
          <span class="rk">#${r.rank}</span>${rankArrow(r)}<span class="ava">${esc(r.avatar)}</span>
          <span class="nm">${esc(r.name)}</span><span class="gain ${r.gain >= 0 ? 'pos' : 'neg'}">${r.gain >= 0 ? '+' : ''}${fmt(r.gain)}</span>
          <span class="bk">💰 ${fmt(r.bank)}</span></div>`).join('')}</div>
        ${b.fails.length ? `<div class="shame pop">💀 ALL-IN THẤT BẠI: ${b.fails.map(r => `<b>${esc(r.avatar)} ${esc(r.name)}</b> (−${fmt(r.bet)})`).join(' · ')}</div>` : ''}
        ${b.heroes.length ? `<div class="hero pop">⚡ THẦN TÀI: ${b.heroes.map(r => `<b>${esc(r.avatar)} ${esc(r.name)}</b> (+${fmt(r.gain)})`).join(' · ')}</div>` : ''}
        <button class="btn btn-gold btn-xl" id="nextBtn">${state.q >= LAST ? 'Xem kết quả cuối 🏆' : `Sẵn sàng câu ${state.q + 2} ▶`}</button>
      </div>`;
      break;
    }
    case 'final':
      renderFinal(firstTime);
      return;
  }
  app.innerHTML = header() + body;
  bindCommon();
  if (state.phase === 'lobby') {
    const qr = document.getElementById('qr');
    if (qr && window.QRCode) new QRCode(qr, { text: joinUrl(), width: 280, height: 280, colorDark: '#1a1208', colorLight: '#ffffff' });
    const sb = document.getElementById('startBtn'); if (sb) sb.onclick = () => { Sound.unlock(); advance(); };
  }
  const nb = document.getElementById('nextBtn'); if (nb) nb.onclick = () => advance();
  updateLive();
}

function bindCommon() {
  const m = document.getElementById('musicBtn');
  if (m) m.onclick = () => { Sound.unlock(); Sound.toggleMusic(); m.textContent = Sound.musicOn ? '🔊' : '🔇'; };
}

function updateLive() {
  if (state && state.phase === 'mine') return updateMiners();
  const el = document.getElementById('live'); if (!el || !state) return;
  const n = Object.keys(players).length;
  const list = Object.values(acts);

  if (state.phase === 'bet') {
    const allin = list.filter(a => a.bet === 100).length;
    el.innerHTML = `${list.filter(a => a.bet).length}/${n} đã cược${allin ? ` · <span class="hot">🔥 ${allin} người ALL-IN</span>` : ''}`;
  }
  if (state.phase === 'answer') el.innerHTML = `${list.filter(a => a.ans != null).length}/${n} đã trả lời`;
}

function updateMiners() {
  const box = document.getElementById('miners'); if (!box) return;
  const rows = Object.keys(players).map(pid => ({ ...players[pid], mined: (acts[pid] && acts[pid].mined) || 0 }))
    .sort((a, b) => b.mined - a.mined);
  const max = Math.max(1, ...rows.map(r => r.mined));
  document.getElementById('mineSum').textContent = fmt(rows.reduce((t, r) => t + r.mined, 0));
  box.innerHTML = rows.slice(0, 8).map(r => `<div class="miner"><span class="ava">${esc(r.avatar)}</span><span class="nm">${esc(r.name)}</span>
    <span class="mbar"><span style="width:${r.mined / max * 100}%"></span></span><b>${fmt(r.mined)}</b></div>`).join('')
    + (rows.length > 8 ? `<p class="muted">+${rows.length - 8} thợ mỏ khác đang đào…</p>` : '');
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
      <div class="ava big">${esc(r.avatar)}</div><div class="nm">${esc(r.name)}</div><div class="bk">💰 ${fmt(r.bank)}</div>
      <div class="block">${[2, 1, 3][i]}</div></div>` : '<div class="pod"></div>').join('')}</div>
    <div class="final-actions">
      <button class="btn btn-gold" id="csvBtn">⬇ Xuất CSV</button>
      <button class="btn btn-ghost" id="keyBtn">📋 Đáp án</button>
      <button class="btn btn-ghost" id="againBtn">Chơi ván mới</button>
    </div>
    <table class="rank-table"><thead><tr><th>#</th><th>Người chơi</th><th>Vàng</th><th>Đúng</th><th>All-in</th></tr></thead>
    <tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.avatar)} ${esc(r.name)}</td><td>${fmt(r.bank)}</td><td>${r.correctCount || 0}/${QUESTIONS.length}</td><td>${r.allInCount || 0}</td></tr>`).join('')}</tbody></table>
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
