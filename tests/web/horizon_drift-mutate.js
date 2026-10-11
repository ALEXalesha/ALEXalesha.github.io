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
  { name: 'дуэль: E не вызывает соперника', file: 'game.js', spec: WORLD, grep: DUEL, from: 'if (w.nearRival) { startWorldDuel(w.nearRival); return true; }', to: '' },
  { name: 'дуэль: соперник рядом только ближе 12 м', file: 'world.js', spec: WORLD, grep: DUEL, from: 'Math.hypot(a.car.x - p.x, a.car.z - p.z) < 30) this.nearRival = a;', to: 'Math.hypot(a.car.x - p.x, a.car.z - p.z) < 12) this.nearRival = a;' },
];

function copyDir(a, b) {
  fs.mkdirSync(b, { recursive: true });
  for (const e of fs.readdirSync(a, { withFileTypes: true })) {
    const pa = path.join(a, e.name), pb = path.join(b, e.name);
    if (e.isDirectory()) copyDir(pa, pb); else fs.copyFileSync(pa, pb);
  }
}
function runSpec(dir, spec, grep) {
  const r = spawnSync(`npx playwright test ${spec} --workers=1 --max-failures=1 --reporter=dot${grep ? ` -g "${grep}"` : ''}`, {
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
    const read = (f) => fs.readFileSync(path.join(SRC, 'js', f), 'utf8').replace(/\r\n/g, '\n');
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
      const file = path.join(dir, 'js', m.file);
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
