// Законы Horizon Drift 1.2.0 в node (без окна): ИИ-соперники AiRacer, генератор трасс, уникальность клавиш.
// Модули игры - те же файлы, что грузит страница (web/horizon_drift_offline/js), через require.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { Worker } = require('worker_threads');

// DRIFT_DIR - копия игры (так tests/web/horizon_drift-mutate.js гоняет эти законы на сломанной копии)
const JS = path.join(process.env.DRIFT_DIR || path.join(__dirname, '..', '..', 'web', 'horizon_drift_offline'), 'js');
const D = require(path.join(JS, 'data.js'));
const C = require(path.join(JS, 'core.js'));
const AI = require(path.join(JS, 'airacer.js'));
const TG = require(path.join(JS, 'trackgen.js'));

// ---------- клавиши ----------
test('клавиши по умолчанию уникальны и не попадают на карту, фото и Esc; фестиваль отдельно от «передачи вверх»', () => {
  const seen = new Map();
  for (const a of D.ACTIONS) {
    const b = D.DEFAULT_BINDINGS[a.id];
    assert.ok(Array.isArray(b) && b.length === 2, 'у действия ' + a.id + ' две клавиши');
    for (const k of b) {
      if (!k) continue;
      assert.ok(!seen.has(k), `клавиша ${k} и у «${seen.get(k)}», и у «${a.name}»`);
      assert.ok(!D.RESERVED_KEYS[k], `клавиша ${k} у «${a.name}» занята: ${D.RESERVED_KEYS[k]}`);
      seen.set(k, a.name);
    }
  }
  assert.deepEqual(Object.keys(D.DEFAULT_BINDINGS).sort(), D.ACTIONS.map((a) => a.id).sort());
  assert.ok(D.DEFAULT_BINDINGS.festival[0], 'у фестиваля есть клавиша');
  assert.notEqual(D.DEFAULT_BINDINGS.festival[0], D.DEFAULT_BINDINGS.shiftUp[0]);
  assert.equal(D.DEFAULT_BINDINGS.shiftUp[0], 'KeyE');
});

test('старые настройки: новое действие не забирает клавишу, которую игрок отдал другому; переназначение меняет местами', () => {
  const old = { bindings: JSON.parse(JSON.stringify(D.DEFAULT_BINDINGS)) };
  delete old.bindings.festival;                                        // настройки версии 1.1.1 - фестиваля в них нет
  assert.deepEqual(C.mergeSettings(old).bindings.festival, D.DEFAULT_BINDINGS.festival, 'свободная клавиша по умолчанию остаётся');
  old.bindings.camera = [D.DEFAULT_BINDINGS.festival[0], ''];          // игрок уже отдал её камере
  const s = C.mergeSettings(old);
  assert.deepEqual(s.bindings.camera, [D.DEFAULT_BINDINGS.festival[0], '']);
  assert.ok(!s.bindings.festival.includes(D.DEFAULT_BINDINGS.festival[0]), 'у фестиваля клавиша камеры пропала');
  const all = []; for (const a in s.bindings) for (const k of s.bindings[a]) if (k) all.push(k);
  assert.equal(new Set(all).size, all.length, 'после слияния клавиши уникальны');
  const r = C.rebind(D.DEFAULT_BINDINGS, 'festival', 0, 'KeyE');
  assert.equal(r.bindings.festival[0], 'KeyE');
  assert.equal(r.bindings.shiftUp[0], D.DEFAULT_BINDINGS.festival[0], 'передача вверх получила прежнюю клавишу фестиваля');
  assert.deepEqual(r.conflict, { action: 'shiftUp', slot: 0 });
});

// ---------- ИИ-соперники ----------
function lap(track, car, ai, o) {
  o = o || {};
  const entries = [{ name: 'N', car, upg: {}, ai }];
  const r = new C.Race({ track, mode: o.mode || 'race', laps: 1, skipCountdown: true, seed: o.seed || 3, entries });
  AI.attachRace(r);
  let resets = 0; const reset = r.resetCar.bind(r); r.resetCar = (c) => { resets++; reset(c); };
  r.run(o.max || 400);
  const c = r.cars[0];
  return { finished: !!c.finished, time: c.finished ? c.finishT : null, resets, c, r };
}

test('нейросеть проходит круг на всех 8 трассах игры: 5 машин, уровни ас / профи / новичок', () => {
  const bad = [], slow = [];
  for (const t of D.TRACKS) {
    for (const car of ['iskra', 'kobalt', 'buran', 'sapsan', 'mirage']) {
      const ref = lap(t.id, car, { pace: 1, mistakes: 0 }).time;            // бот игры с темпом 1
      const times = {};
      for (const pace of [1, 0.9, 0.75]) {
        const res = lap(t.id, car, { pace, neural: { model: 'racer', hands: AI.handsForPace(pace) } });
        times[pace] = res.time;
        if (!res.finished || res.time > ref * 1.6) bad.push(`${t.id} ${car} ${pace}: ${res.finished ? (res.time / ref).toFixed(2) : 'не доехал'}`);
      }
      if (times[1] && times[0.75]) slow.push(times[0.75] / times[1]);
    }
  }
  assert.deepEqual(bad, []);
  slow.sort((a, b) => a - b);
  assert.ok(slow[slow.length >> 1] > 1.04, 'новичок медленнее аса: медиана ' + slow[slow.length >> 1].toFixed(3));
});

test('нейросеть рулит через ввод игрока: помощники игрока, решение раз в 4 шага, сдвиг между соперниками', () => {
  const entries = [0, 1, 2].map((k) => ({ name: 'N' + k, car: 'kobalt', upg: {}, ai: { pace: 0.9 } }));
  AI.neuralize(entries, 'race', 'normal');
  const r = new C.Race({ track: 'coast', mode: 'race', laps: 1, skipCountdown: true, seed: 5, entries });
  assert.equal(AI.attachRace(r), 3);
  r.step(C.DT);
  assert.deepEqual(r.cars.map((c) => c.ai.brain.decisions), [1, 0, 0], 'соперники думают на разных шагах физики');
  for (let i = 1; i < 400; i++) r.step(C.DT);
  for (const c of r.cars) {
    assert.deepEqual(Object.assign({}, c.assist), Object.assign({}, AI.PLAYER_ASSIST), 'помощники - как у игрока');
    assert.equal(c.ai.brain.decisions, 100, 'решение раз в 4 шага физики');
    assert.equal(c.inp.analog, true);
  }
  // уровень по темпу бота: чем медленнее бот, тем осторожнее нейросеть
  assert.equal(AI.handsForPace(1).pace, 1);
  assert.ok(AI.handsForPace(0.8).pace < AI.handsForPace(0.9).pace);
});

test('нейросеть видит только то, что видит водитель: гоночная линия, профиль скорости, темп и далёкие машины не влияют', () => {
  const entries = [{ name: 'N', car: 'kobalt', upg: {}, ai: { pace: 1 } }, { name: 'B', car: 'sapsan', upg: {}, ai: { pace: 0.9 } }];
  const r = new C.Race({ track: 'coast', mode: 'race', laps: 1, skipCountdown: true, seed: 2, entries });
  r.run(6);
  const me = r.cars[0], other = r.cars[1];
  const obs = () => Array.from(AI.observe(r, me));
  const base = obs();
  const line = r.track.line.slice(); r.track.line.fill(5); const prof = me.prof; me.prof = null;
  other.ai.pace = 0.1; other.ai.laneBase = 3;
  assert.deepEqual(obs(), base, 'гоночная линия, профиль и намерения соперника скрыты');
  r.track.line.set(line); me.prof = prof;
  r.teleport(other, me.pr.s + 400, 0, 20);                                        // за 400 м - не видно
  const far = obs();
  other.out = true; const alone = obs(); other.out = false;
  assert.deepEqual(far, alone, 'машина за 400 м не видна: как будто её нет');
  r.teleport(other, me.pr.s + 15, me.pr.d, 20);                                  // 15 м прямо впереди - луч упирается в машину
  const near = obs();
  assert.ok(near[9 + 5] < far[9 + 5], 'центральный луч видит машину впереди');
});

test('одинаковый сид - одинаковый заезд нейросетей (бит в бит); соперник с повреждениями и нитро по правилам игрока', () => {
  const run = () => {
    const entries = [0, 1, 2].map((k) => ({ name: 'N' + k, car: ['kobalt', 'sapsan', 'buran'][k], upg: {}, ai: { pace: 0.92 } }));
    AI.neuralize(entries, 'race', 'normal');
    const r = new C.Race({ track: 'port', mode: 'race', laps: 1, skipCountdown: true, seed: 9, entries });
    AI.attachRace(r);
    let usedNitro = 0;
    for (let i = 0; i < 40 / C.DT; i++) { r.step(C.DT); for (const c of r.cars) if (c.inp.nitro) usedNitro++; }
    return { st: r.cars.map((c) => [c.x, c.z, c.h, c.nitro]), usedNitro };
  };
  const a = run(), b = run();
  assert.deepEqual(a, b);
  assert.ok(a.usedNitro > 0, 'нейросеть жмёт нитро');
});

test('дрифт: соперник-дрифтер набирает очки по правилам игрока, удар срывает его серию', () => {
  const entries = [{ name: 'N', car: 'vihr', upg: {}, ai: { pace: 0.9, neural: { model: 'drifter', hands: 'drift-ace' } } }];
  const r = new C.Race({ track: 'port', mode: 'drift', laps: 1, skipCountdown: true, seed: 3, entries });
  AI.attachRace(r);
  r.run(40);                                                                     // ещё в заезде: круг дольше 40 с
  const c = r.cars[0];
  assert.ok(r.phase === 'race' && !c.finished);
  assert.ok(AI.driftPoints(c) > 3000, 'очки дрифта: ' + AI.driftPoints(c));
  const sc = c.ai.scorer; sc.active = true; sc.chain = 1000; const pending = sc.pending;
  assert.ok(pending > 0);
  c.hit = 5; c.ai.after(r, c, C.DT);
  assert.equal(sc.pending, 0, 'удар срывает серию');
});

// ---------- генератор трасс ----------
test('код трассы: тот же код - та же трасса; сохранённое описание проверяется, испорченное выбрасывается', () => {
  const a = TG.generate('R1S-7Q', { candidates: 2 }), b = TG.generate('R1S-7Q', { candidates: 2 });
  assert.ok(a && b);
  assert.deepEqual(JSON.parse(JSON.stringify(a.def)), JSON.parse(JSON.stringify(b.def)));
  const saved = TG.sanitizeSaved([{ code: a.code, def: Object.assign(JSON.parse(JSON.stringify(a.def)), { theme: 'нет такой' }) },
    { code: a.code, def: JSON.parse(JSON.stringify(a.def)), savedAt: 5 }, { code: 'X', def: {} }, null,
    { code: a.code, def: a.def }, { code: 'D2M-1', def: Object.assign({}, a.def, { theme: 'нет такой' }) },
    { code: a.code.replace('R1S', 'R2S'), def: Object.assign({}, a.def, { cmds: [['S', 'auto']] }) }]);
  assert.equal(saved.length, 1, 'одна годная запись, дубль и мусор выброшены');
  assert.deepEqual(saved[0].def, JSON.parse(JSON.stringify(a.def)));
  const rec = TG.sanitizeRecords({ [a.code]: { lap: 61.2, time: 'x', drift: -1 }, 'R9S-1': { lap: 1 }, bad: 3 });
  assert.deepEqual(rec, { [a.code]: { lap: 61.2 } });
});

// 200 кодов всех типов, сложностей и длин: генератор с настройками игры (2 варианта) даёт трассу,
// её проверили бот игры или нейросеть, и нейросеть-ас проезжает её круг без сбросов. 4 потока по 50 кодов.
test('трассы проходимы для 200 кодов', { timeout: 15 * 60 * 1000 }, async () => {
  const codes = [];
  const types = ['race', 'drift', 'mountain', 'city'];
  for (let i = 0; i < 200; i++) codes.push(TG.encode({ type: types[i % 4], difficulty: 1 + (Math.floor(i / 4) % 3), length: 'SML'[Math.floor(i / 12) % 3], seed: (7 + i * 104729) >>> 0 }));
  const worker = (part) => new Promise((resolve, reject) => {
    const w = new Worker(`
      const { parentPort, workerData } = require('worker_threads');
      const TG = require(workerData.tg);
      const out = [];
      for (const code of workerData.codes) {
        const r = TG.generate(code, { candidates: 2 });
        if (!r) { out.push({ code, ok: false, why: 'нет трассы' }); continue; }
        const ai = TG.aiCheck(r.def);
        out.push({ code, ok: r.check.ok && ai.finished && ai.resets === 0, by: r.check.by, why: JSON.stringify(ai) });
      }
      parentPort.postMessage(out);`, { eval: true, workerData: { tg: path.join(JS, 'trackgen.js'), codes: part } });
    w.once('message', resolve); w.once('error', reject);
  });
  const parts = [0, 1, 2, 3].map((k) => codes.filter((_, i) => i % 4 === k));
  const res = (await Promise.all(parts.map(worker))).flat();
  assert.equal(res.length, 200);
  assert.deepEqual(res.filter((r) => !r.ok).map((r) => r.code + ' ' + r.why), []);
  assert.ok(res.filter((r) => r.by === 'bot').length >= 150, 'большинство трасс проверил сам бот игры');
});
