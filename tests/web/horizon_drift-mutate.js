// Проверка проверок нитро и повреждений «Horizon Drift»: по одному ломает правило в КОПИИ игры во временной папке
// и гоняет на ней свои законы (tests/web/horizon_drift_nitro.spec.js или horizon_drift_damage.spec.js, через
// DRIFT_DIR). Сломанное правило должно уронить хотя бы одну проверку («мутант убит»). Исходник web/horizon_drift_offline
// не меняется, поэтому обрыв скрипта ничего не портит.
// Запуск из корня репозитория: node tests/web/horizon_drift-mutate.js [часть имени мутанта, несколько через |]
// Файл не *.spec.js - Playwright его сам не запускает.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'web', 'horizon_drift_offline');
const NITRO = 'tests/web/horizon_drift_nitro.spec.js', DAMAGE = 'tests/web/horizon_drift_damage.spec.js', WORLD = 'tests/web/horizon_drift_world.spec.js';
const DUEL = 'зона дрифта считается только по ходу зоны';
const REVIEW = 'tests/web/horizon_drift_review.spec.js';
const AISPEC = 'tests/web/horizon_drift_ai.spec.js', UNIT = 'tests-app/unit/drift-ai.test.js';     // UNIT - законы в node (node --test)

// file - файл в js/, from - точный кусок кода (ровно один раз), to - сломанный вариант, spec - чьи законы,
// grep - только проверки с этим названием (большой спек мира целиком не гоняется)
const MUTANTS = [
  { name: 'нитро: пустой баллон не запирается', file: 'core.js', spec: NITRO, from: 'if (inp.nitro && car.nitro > 0 && !car.nitroLock && car.gear > 0', to: 'if (inp.nitro && car.nitro > 0 && car.gear > 0' },
  { name: 'нитро: замок снимается сразу', file: 'core.js', spec: NITRO, from: 'if (car.nitroLock && car.nitro >= NITRO_REARM) car.nitroLock = false;', to: 'if (car.nitroLock && car.nitro >= 0) car.nitroLock = false;' },
  { name: 'нитро: пополнение в заезде 0.02 вместо 0.012', file: 'core.js', spec: NITRO, from: 'c.nitro = Math.min(1, c.nitro + dt * 0.012);', to: 'c.nitro = Math.min(1, c.nitro + dt * 0.02);' },
  { name: 'нитро: занос не пополняет быстрее', file: 'core.js', spec: NITRO, from: 'if (this.drift.drifting) p.nitro = Math.min(1, p.nitro + dt * 0.05);', to: '' },
  { name: 'нитро: в мире пополнение 0.03', file: 'world.js', spec: NITRO, from: 'p.nitro = Math.min(1, p.nitro + dt * 0.02);', to: 'p.nitro = Math.min(1, p.nitro + dt * 0.03);' },
  { name: 'повреждения: нет порога вмятины', file: 'damage.js', spec: DAMAGE, from: 'if (!(dv > T.DEFORM_DV)) return 0;', to: 'if (!(dv > 0)) return 0;' },
  // «только вид» с эффектами в fx - эквивалентный мутант: без «полных» attach не даёт машине dmgFx, и fx до физики не доходит
  { name: 'повреждения: «только вид» получает dmgFx и зону без порога', file: 'damage.js', spec: DAMAGE, from: "if (mode === 'full') car.dmgFx = d.fx; else delete car.dmgFx;", to: 'car.dmgFx = d.fx; d.mode = \'full\';' },
  { name: 'повреждения: удар машин толкает сам', file: 'core.js', spec: DAMAGE, from: 'if (a.dmg) a.dmg.hit(a, k.px, k.pz, k.nx, k.nz, J);', to: 'if (a.dmg) { a.dmg.hit(a, k.px, k.pz, k.nx, k.nz, J); a.vx *= 0.999; }' },
  { name: 'повреждения: перед и зад перепутаны', file: 'damage.js', spec: DAMAGE, from: "(nf < 0 ? 'front' : 'rear')", to: "(nf < 0 ? 'rear' : 'front')" },
  { name: 'повреждения: бампер отлетает от удара зеркала', file: 'damage.js', spec: DAMAGE, from: "if (dv > T.BUMPER_DV || this.zone.front > T.BUMPER_ZONE) this.drop('bumperF'", to: "if (dv > T.MIRROR_DV || this.zone.front > T.BUMPER_ZONE) this.drop('bumperF'" },
  { name: 'повреждения: зеркала перепутаны', file: 'damage.js', spec: DAMAGE, from: "this.drop(zone === 'left' ? 'mirrorL' : 'mirrorR'", to: "this.drop(zone === 'left' ? 'mirrorR' : 'mirrorL'" },
  { name: 'повреждения: деталь отлетает много раз', file: 'damage.js', spec: DAMAGE, from: 'if (this.off[part]) return;', to: '' },
  { name: 'вмятина: двигаются все вершины', file: 'damage.js', spec: DAMAGE, from: 'if (d2 >= r2) continue;', to: 'if (d2 >= r2 * 100) continue;' },
  { name: 'вмятина: нет общего предела', file: 'damage.js', spec: DAMAGE, from: 'if (o > lim) {', to: 'if (false) {' },
  { name: 'вмятина: давит наружу', file: 'damage.js', spec: DAMAGE, from: 'let x = pos[k] + dent.dx * s * crumple', to: 'let x = pos[k] - dent.dx * s * crumple' },
  { name: 'обломки: живут вечно', file: 'damage.js', spec: DAMAGE, from: 'if (d.t >= this.life) { d.on = false; this.n--; continue; }', to: '' },
  { name: 'обломки: не падают', file: 'damage.js', spec: DAMAGE, from: 'd.vy -= 9.81 * dt;', to: '' },
  { name: 'обломки: машина их не отбрасывает', file: 'damage.js', spec: DAMAGE, from: 'd.kick = 0.5;', to: 'd.kick = 0.5; continue;' },
  { name: 'шины: юз не стирает', file: 'damage.js', spec: DAMAGE, from: 'const lock = (car.skidF || 0) >= 1 && brk > 0.85;', to: 'const lock = false;' },
  { name: 'шины: занос не стирает задние', file: 'damage.js', spec: DAMAGE, from: 'let rear = (car.skidR || 0) * T.WEAR_SLIP', to: 'let rear = 0 * T.WEAR_SLIP' },
  { name: 'шины: стираются и в «только вид»', file: 'damage.js', spec: DAMAGE, from: '    if (!this.full) return;\n', to: '\n' },
  { name: 'шины: стёртые держат как новые', file: 'damage.js', spec: DAMAGE, from: 'const gripOf = (w) => 1 - T.GRIP_LOSS * Math.pow(clamp(w, 0, 1), 1.5);', to: 'const gripOf = (w) => 1;' },
  { name: 'шины: сцепление не доходит до физики', file: 'core.js', spec: DAMAGE, from: 'const capF = muF * Nf, capR = muR * Nr * st.rearMul;', to: 'const capF = mu * Nf, capR = mu * Nr * st.rearMul;' },
  { name: 'полные: смятый перед не отнимает мощность', file: 'core.js', spec: DAMAGE, from: 'if (dfx) Fdrive *= dfx.power;', to: '' },
  { name: 'полные: увод руля в другую сторону', file: 'damage.js', spec: DAMAGE, from: 'this.align = clamp(this.align + side * over * T.ALIGN_K', to: 'this.align = clamp(this.align - side * over * T.ALIGN_K' },
  { name: 'полные: увод не доходит до шин', file: 'core.js', spec: DAMAGE, from: 'const steerA = dfx ? car.steer + dfx.pull : car.steer;', to: 'const steerA = car.steer;' },
  { name: 'честность: в карьере «полные»', file: 'damage.js', spec: DAMAGE, from: "if (m === 'full' && (kind === 'career' || raceMode === 'time')) return 'visual';", to: "if (m === 'full' && raceMode === 'time') return 'visual';" },
  { name: 'честность: игра не спрашивает modeFor', file: 'game.js', spec: DAMAGE, from: 'race.damageMode = DM.modeFor(G.settings.damage, meta.kind, cfg.mode);', to: 'race.damageMode = G.settings.damage;' },
  { name: 'ремонт: шины не меняются', file: 'damage.js', spec: DAMAGE, from: 'for (let i = 0; i < 4; i++) this.wear[i] = 0;', to: '' },
  { name: 'мир: соперники и трафик без повреждений', file: 'world.js', spec: DAMAGE, from: "      c.world = a; c.rival = !!rival;\n      if (this.attach) this.attach(c);", to: '      c.world = a; c.rival = !!rival;' },
  { name: 'экран: вмятины не рисуются в заезде', file: 'render.js', spec: DAMAGE, from: 'if (c.dmg) R.damageSync(cm, c, X.debris);', to: '' },
  { name: 'экран: HUD шин и при «только вид»', file: 'game.js', spec: DAMAGE, from: "const d = p && p.dmgFx ? p.dmg : null, el = $('hDmg');", to: "const d = p && p.dmg ? p.dmg : null, el = $('hDmg');" },
  { name: 'клавиша ремонта не работает', file: 'game.js', spec: DAMAGE, from: "if (act === 'repair' && !e.repeat)", to: "if (act === 'repairX' && !e.repeat)" },
  // 11.10: целая машина - простой кузов (мелкая сетка у трафика давала +25% треугольников и вдвое меньше кадров в салоне)
  { name: 'кузов: мелкая сетка у целой машины', file: 'render.js', spec: DAMAGE, from: 'const shell = carShell(shapeKey, false);', to: 'const shell = carShell(shapeKey, true);' },
  { name: 'кузов: вмятина без мелкой сетки', file: 'render.js', spec: DAMAGE, from: '      fineShell(cm);', to: '' },
  // 11.10: дуэль с бродячим соперником - закон теперь жмёт E в стоящем мире
  { name: 'дуэль: клавиша фестиваля не вызывает соперника', file: 'game.js', spec: WORLD, grep: DUEL, from: 'if (w.nearRival) { startWorldDuel(w.nearRival); return true; }', to: '' },
  { name: 'дуэль: соперник рядом только ближе 12 м', file: 'world.js', spec: WORLD, grep: DUEL, from: 'Math.hypot(a.car.x - p.x, a.car.z - p.z) < 30) this.nearRival = a;', to: 'Math.hypot(a.car.x - p.x, a.car.z - p.z) < 12) this.nearRival = a;' },
  // 16.10 независимая проверка: узкое окно, пауза во время загрузки, клавиши мира, подсказки (file без js/ - от папки игры)
  { name: 'окно: гараж не сужается', file: 'index.html', spec: REVIEW, grep: 'гараж в окне', from: '    #gPanel { width: auto; flex: 1 1 0; min-width: 0; }\n', to: '' },
  { name: 'окно: подсказка клавиш в одну строку под спидометр', file: 'index.html', spec: REVIEW, grep: 'HUD в окне', from: '  #hKeys { max-width: calc(100% - 380px); white-space: normal; }', to: '' },
  { name: 'окно: подсказка E на прежнем месте', file: 'index.html', spec: REVIEW, grep: 'HUD в окне', from: '(max-width: 1180px) and (max-height: 760px) { #wPrompt { bottom: 226px; } }', to: '(max-width: 1180px) and (max-height: 760px) { #wPrompt { bottom: 120px; } }' },
  { name: 'окно: кнопка паузы на панели мира', file: 'index.html', spec: REVIEW, grep: 'HUD в окне', from: '    #hPauseBtn { left: auto; right: 16px; transform: none; top: 216px; }', to: '' },
  { name: 'загрузка: просьба о паузе забывается', file: 'game.js', spec: REVIEW, grep: 'во время загрузки', from: 'function pauseLater() { if (G.loading) G.pauseAfterLoad = true; }', to: 'function pauseLater() { }' },
  { name: 'загрузка: мир не включает отложенную паузу', file: 'game.js', spec: REVIEW, grep: 'во время загрузки', from: '      pauseIfAsked();\n      saveWorld();', to: '      saveWorld();' },
  { name: 'загрузка: потеря фокуса не откладывает паузу', file: 'game.js', spec: REVIEW, grep: 'во время загрузки', from: 'clearInput(); if (!G.manual) pauseLater();', to: 'clearInput();' },
  { name: 'клавиши: F и M назначаются действию', file: 'game.js', spec: REVIEW, grep: 'клавиши M и F', from: 'if (WORLD_KEYS[code]) {', to: 'if (false) {' },
  { name: 'подсказки: совет заезда называет R', file: 'game.js', spec: REVIEW, grep: 'подсказки называют', from: ".replace('{reset}', bindName('reset'))", to: ".replace('{reset}', 'R')" },
  { name: 'подсказки: совет мира называет R', file: 'game.js', spec: REVIEW, grep: 'подсказки называют', from: "${bindName('reset')} - вернуться на дорогу", to: 'R - вернуться на дорогу' },
  { name: 'подсказки: справка без вида из салона', file: 'game.js', spec: REVIEW, grep: 'подсказки называют', from: 'с капота, из салона</li>', to: 'с капота</li>' },
  // 1.2.0: соперники - нейросеть AiRacer, генератор трасс, клавиша фестиваля
  { name: 'ИИ: соперники остаются ботом', file: 'game.js', spec: AISPEC, grep: 'соперников ведёт нейросеть', from: '      AI.attachRace(race);', to: '' },
  { name: 'ИИ: у нейросети помощники бота', file: 'airacer.js', spec: UNIT, grep: 'рулит через ввод игрока', from: '      c.assist = Object.assign({}, PLAYER_ASSIST);', to: '' },
  { name: 'ИИ: видит гоночную линию', file: 'airacer.js', spec: UNIT, grep: 'видит только то', from: '    out[o++] = pr.d / tr.W;', to: '    out[o++] = (pr.d - tr.line[pr.i]) / tr.W;' },
  { name: 'ИИ: видит машины за 400 м', file: 'airacer.js', spec: UNIT, grep: 'видит только то', from: 'Math.abs(o.x - car.x) > RAY_MAX || Math.abs(o.z - car.z) > RAY_MAX) continue;', to: 'false) continue;' },
  { name: 'ИИ: все решают на одном шаге', file: 'airacer.js', spec: UNIT, grep: 'рулит через ввод игрока', from: '    let n = phase | 0;', to: '    let n = 0;' },
  { name: 'ИИ: решение каждый шаг', file: 'airacer.js', spec: UNIT, grep: 'рулит через ввод игрока', from: '  const EVERY = 4;', to: '  const EVERY = 1;' },
  { name: 'ИИ: уровень не зависит от темпа', file: 'airacer.js', spec: UNIT, grep: 'нейросеть', from: 'pace: p >= 0.98 ? 1 : p - 0.06, label', to: 'pace: 1, label' },
  { name: 'ИИ: осторожность не тормозит', file: 'airacer.js', spec: UNIT, grep: 'проходит круг', from: '      if (h.pace && h.pace < 1) caution(obs, a, h.pace);', to: '' },
  { name: 'ИИ: нитро не по правилам (не жмёт)', file: 'airacer.js', spec: UNIT, grep: 'одинаковый сид', from: '        nitro: o[3] > 0 ? 1 : 0,', to: '        nitro: 0,' },
  { name: 'ИИ: дрифт соперника без очков', file: 'airacer.js', spec: AISPEC, grep: 'дрифт с соперниками', from: '      c.ai.after = driftAfter;\n      c.assist', to: '      c.assist' },
  { name: 'ИИ: удар не срывает серию соперника', file: 'airacer.js', spec: UNIT, grep: 'дрифт:', from: '    if (c.hit > 2.5) sc.crash();', to: '' },
  { name: 'ИИ: дрифт на переднем приводе', file: 'game.js', spec: AISPEC, grep: 'дрифт с соперниками', from: "if (q.mode === 'drift') { const rwd", to: "if (false) { const rwd" },
  { name: 'генератор: код не определяет трассу', file: 'trackgen.js', spec: UNIT, grep: 'код трассы', from: '    const rng = C.mulberry32((p.seed ^ Math.imul(sub + 1, 0x9E3779B1)) >>> 0);', to: '    const rng = Math.random;' },
  { name: 'генератор: принимает чужую тему', file: 'trackgen.js', spec: UNIT, grep: 'код трассы', from: ' || !D.THEMES[def.theme] ||', to: ' ||' },
  { name: 'генератор: проверка всегда «да»', file: 'trackgen.js', spec: UNIT, grep: '200 кодов', from: 'return Object.assign({ ok: botOk && ai.finished && ai.resets === 0, ai }, b);', to: 'return Object.assign({ ok: true, ai }, b);' },
  { name: 'генератор: поле кода не читается', file: 'game.js', spec: AISPEC, grep: 'код из поля', from: "    else if (genCodeFromInput() === null) {", to: "    else if (false) {" },
  { name: 'генератор: сохранённые не загружаются', file: 'game.js', spec: AISPEC, grep: 'код из поля', from: '  G.genSaved = TG.sanitizeSaved(load(KEY.gen));', to: '  G.genSaved = [];' },
  { name: 'рекорды: новая трасса пишет в рекорды игры', file: 'game.js', spec: AISPEC, grep: 'рекорд круга', from: '    if (gen) {                                  // новая трасса', to: '    if (false) {' },
  { name: 'клавиши: фестиваль на E', file: 'data.js', spec: UNIT, grep: 'клавиши по умолчанию', from: "    festival: ['KeyT', ''],", to: "    festival: ['KeyE', '']," },
  { name: 'клавиши: новое действие забирает клавишу', file: 'core.js', spec: UNIT, grep: 'старые настройки', from: "s.bindings[a] = s.bindings[a].map((k) => (k && used.has(k) ? '' : k));", to: '{}' },
  { name: 'клавиши: фестиваль всё ещё на E в мире', file: 'game.js', spec: AISPEC, grep: 'фестиваль - на своей клавише', from: "if (act === 'festival' && !e.repeat && worldInteract())", to: "if (e.code === 'KeyE' && !e.repeat && worldInteract())" },
  { name: 'подсказки: фестиваль с буквой E', file: 'game.js', spec: AISPEC, grep: 'фестиваль - на своей клавише', from: "const fk = `<kbd>${esc(bindName('festival'))}</kbd>`;", to: "const fk = '<kbd>E</kbd>';" },
];

function copyDir(a, b) {
  fs.mkdirSync(b, { recursive: true });
  for (const e of fs.readdirSync(a, { withFileTypes: true })) {
    const pa = path.join(a, e.name), pb = path.join(b, e.name);
    if (e.isDirectory()) copyDir(pa, pb); else fs.copyFileSync(pa, pb);
  }
}
function runSpec(dir, spec, grep) {
  const cmd = spec === UNIT ? `node --test${grep ? ` --test-name-pattern="${grep}"` : ''} ${spec}`
    : `npx playwright test ${spec} --workers=1 --max-failures=1 --reporter=dot${grep ? ` -g "${grep}"` : ''}`;
  const r = spawnSync(cmd, {
    cwd: ROOT, env: { ...process.env, DRIFT_DIR: dir }, shell: true, encoding: 'utf8', timeout: 15 * 60 * 1000,
  });
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || '') };
}

function main() {
  const only = process.argv[2] || '';
  const list = MUTANTS.filter((m) => only.split('|').some((s) => m.name.includes(s)));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-mutants-'));
  let survived = 0;
  try {
    copyDir(SRC, dir);
    const where = (f) => (f.endsWith('.html') ? f : path.join('js', f));          // index.html - от папки игры, остальное - js/
    const read = (f) => fs.readFileSync(path.join(SRC, where(f)), 'utf8').replace(/\r\n/g, '\n');
    // исходная копия - только те законы, которыми проверяются выбранные мутанты
    const bases = [...new Map(list.map((m) => [m.spec + '|' + (m.grep || ''), m])).values()];
    for (const { spec, grep } of bases) {
      const base = runSpec(dir, spec, grep);
      console.log(`исходная копия, ${path.basename(spec)}${grep ? ' (' + grep + ')' : ''}: ${base.ok ? 'проверки зелёные' : 'ПРОВЕРКИ КРАСНЫЕ'}`);
      if (!base.ok) { console.log(base.out.slice(-3000)); process.exitCode = 2; return; }
    }
    for (const m of list) {
      const src = read(m.file), n = src.split(m.from).length - 1;
      if (n !== 1) { console.log(`? ${m.name}: кусок кода найден ${n} раз - мутант устарел`); survived++; continue; }
      const file = path.join(dir, where(m.file));
      fs.writeFileSync(file, src.replace(m.from, m.to));
      const r = runSpec(dir, m.spec, m.grep);
      fs.writeFileSync(file, src);
      const failed = /\d+\) .*›.*›\s*(.+)/.exec(r.out);
      console.log(`${r.ok ? 'ВЫЖИЛ' : 'убит '}  ${m.name}${!r.ok && failed ? '  <- ' + failed[1].replace(/[─\s]+$/, '').slice(0, 90) : ''}`);
      if (r.ok) survived++;
    }
    console.log(`итог: убито ${list.length - survived} из ${list.length}`);
    if (survived) process.exitCode = 1;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

if (require.main === module) main();
module.exports = { MUTANTS };
