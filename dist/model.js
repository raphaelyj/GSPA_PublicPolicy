/**
 * Cohen, March & Olsen (1972) garbage-can model: transparent teaching reimplementation.
 * The paper's published parameters and structural rules are represented explicitly.
 * This is not a byte-for-byte port of the appendix's FORTRAN Version Five.
 */

export const PAPER = Object.freeze({
  choiceOrders: [
    [10, 7, 9, 5, 2, 3, 4, 1, 6, 8],
    [6, 5, 2, 10, 8, 9, 7, 4, 1, 3],
  ],
  problemOrders: [
    [8, 20, 14, 16, 6, 7, 15, 17, 2, 13, 11, 19, 4, 9, 3, 12, 1, 10, 5, 18],
    [4, 14, 11, 20, 3, 5, 2, 12, 1, 6, 8, 19, 7, 15, 16, 17, 10, 18, 9, 13],
  ],
  footnoteCoefficients: [1, .9, .7, .3, .1, .1, .3, .7, .9, 1],
});

export const DEFAULT_CONFIG = Object.freeze({
  periods: 20,
  choices: 10,
  problems: 20,
  participants: 10,
  load: 2.2,
  access: 'hierarchical',
  decision: 'hierarchical',
  energyDistribution: 'equal',
  totalEnergy: 5.5,
  coefficientMode: 'constant',
  coefficient: .6,
  coefficientCustom: '',
  choiceOrder: 'paperA',
  problemOrder: 'paperA',
  choiceEntriesCustom: '',
  problemEntriesCustom: '',
  problemDemandCustom: '',
  participantEnergyCustom: '',
  accessMatrixCustom: '',
  decisionMatrixCustom: '',
  movement: 1,
  outputMode: 2,
});

export const STRUCTURE_LABELS = {
  unsegmented: '비분절',
  hierarchical: '위계',
  specialized: '전문화',
  custom: '사용자 행렬',
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round = (v) => Math.round(v * 1000) / 1000;

function numberList(value, expected, label, { min = 0, max = Infinity } = {}) {
  const values = String(value || '').split(/[\s,;]+/).filter(Boolean).map(Number);
  if (values.length !== expected || values.some(v => !Number.isFinite(v) || v < min || v > max)) {
    throw new Error(`${label}: ${expected}개의 숫자를 쉼표로 입력 필요 (${min}–${max === Infinity ? '∞' : max}).`);
  }
  return values;
}

function entryTimes(kind, mode, count, periods, custom) {
  if (mode === 'custom') return numberList(custom, count, `${kind} 진입 시점`, { min: 1, max: periods }).map(Math.round);
  let order;
  if (mode === 'paperA' || mode === 'paperB') {
    const paperCount = kind === '선택' ? 10 : 20;
    if (count !== paperCount || periods < 10) {
      throw new Error(`${kind}의 논문 진입순서는 ${paperCount}개와 최소 10기간에서만 사용할 수 있습니다. 순차 또는 사용자 입력을 선택 필요.`);
    }
    order = (kind === '선택' ? PAPER.choiceOrders : PAPER.problemOrders)[mode === 'paperA' ? 0 : 1];
  } else {
    order = Array.from({ length: count }, (_, i) => i + 1);
  }
  const slots = mode.startsWith('paper') ? 10 : Math.min(periods, count);
  const times = Array(count).fill(1);
  order.forEach((id, index) => { times[id - 1] = 1 + Math.floor(index * slots / count); });
  return times;
}

function matrix(kind, mode, rows, columns, custom) {
  if (mode === 'custom') {
    const lines = String(custom || '').trim().split(/\n+/).map(line => line.replace(/[^01]/g, ''));
    if (lines.length !== rows || lines.some(line => line.length !== columns)) {
      throw new Error(`${kind} 행렬: ${rows}줄, 각 줄에 0 또는 1을 ${columns}개 입력 필요.`);
    }
    return lines.map(line => [...line].map(Number));
  }
  return Array.from({ length: rows }, (_, r) => Array.from({ length: columns }, (_, c) => {
    if (mode === 'unsegmented') return 1;
    if (mode === 'specialized') return c === Math.min(columns - 1, Math.floor(r * columns / rows)) ? 1 : 0;
    // In the published 20×10 access and 10×10 decision arrays, lower numbers are important.
    // An important row reaches more choices; an important choice admits fewer rows.
    const firstAllowedChoice = Math.min(columns - 1, Math.floor(r * columns / rows));
    return c >= firstAllowedChoice ? 1 : 0;
  }));
}

export function resolveConfig(raw = {}) {
  const c = { ...DEFAULT_CONFIG, ...raw };
  for (const key of ['periods', 'choices', 'problems', 'participants']) c[key] = Number(c[key]);
  const ranges = { periods: [1, 40], choices: [1, 20], problems: [1, 40], participants: [1, 20] };
  for (const [key, [lo, hi]] of Object.entries(ranges)) {
    if (!Number.isInteger(c[key]) || c[key] < lo || c[key] > hi) throw new Error(`${key}는 ${lo}–${hi} 사이의 정수여야 합니다.`);
  }
  c.load = Number(c.load);
  c.totalEnergy = Number(c.totalEnergy);
  c.coefficient = Number(c.coefficient);
  c.movement = Number(c.movement);
  c.outputMode = Number(c.outputMode);
  if (!Number.isFinite(c.load) || c.load < 0) throw new Error('문제당 요구 에너지는 0 이상이어야 합니다.');
  if (!Number.isFinite(c.totalEnergy) || c.totalEnergy < 0) throw new Error('기간당 잠재 에너지는 0 이상이어야 합니다.');
  if (!Number.isFinite(c.coefficient) || c.coefficient < 0 || c.coefficient > 1) throw new Error('해결책 계수는 0–1 사이여야 합니다.');
  if (![1, 2, 3, 4].includes(c.movement)) throw new Error('이동 조건 NA는 1–4입니다.');
  if (![1, 2].includes(c.outputMode)) throw new Error('출력 조건 IO는 1 또는 2입니다.');

  const choiceEntries = entryTimes('선택', c.choiceOrder, c.choices, c.periods, c.choiceEntriesCustom);
  const problemEntries = entryTimes('문제', c.problemOrder, c.problems, c.periods, c.problemEntriesCustom);
  const demands = c.problemDemandCustom.trim()
    ? numberList(c.problemDemandCustom, c.problems, '문제별 요구 에너지', { min: 0 })
    : Array(c.problems).fill(c.load);
  let participantEnergy;
  if (c.participantEnergyCustom.trim()) {
    participantEnergy = numberList(c.participantEnergyCustom, c.participants, '참여자별 기간당 에너지', { min: 0 });
  } else {
    const weights = Array.from({ length: c.participants }, (_, i) =>
      c.energyDistribution === 'importantLess' ? i + 1 :
      c.energyDistribution === 'importantMore' ? c.participants - i : 1);
    const sum = weights.reduce((a, b) => a + b, 0);
    participantEnergy = weights.map(v => c.totalEnergy * v / sum);
  }
  let coefficients;
  if (c.coefficientMode === 'footnote') {
    coefficients = Array.from({ length: c.periods }, (_, i) => PAPER.footnoteCoefficients[i] ?? .6);
  } else if (c.coefficientMode === 'custom') {
    coefficients = numberList(c.coefficientCustom, c.periods, '기간별 해결책 계수', { min: 0, max: 1 });
  } else {
    coefficients = Array(c.periods).fill(c.coefficient);
  }

  const accessMatrix = matrix('접근구조', c.access, c.problems, c.choices, c.accessMatrixCustom);
  const decisionMatrix = matrix('결정구조', c.decision, c.participants, c.choices, c.decisionMatrixCustom);
  const potentialPerPeriod = participantEnergy.reduce((a, b) => a + b, 0);
  const totalEffectiveEnergy = coefficients.reduce((a, b) => a + b * potentialPerPeriod, 0);
  const totalDemand = demands.reduce((a, b) => a + b, 0);
  return {
    ...c, choiceEntries, problemEntries, demands, participantEnergy, coefficients,
    accessMatrix, decisionMatrix, potentialPerPeriod,
    totalEffectiveEnergy, totalDemand, netLoad: totalDemand - totalEffectiveEnergy,
  };
}

function chooseProblemTarget(problem, choices, resolved, movement) {
  const old = problem.choice;
  if ((movement === 2 || movement === 4) && old && choices[old - 1].status === 'active') return old;
  let best = null;
  for (const choice of choices) {
    if (choice.status !== 'active' || !resolved.accessMatrix[problem.id - 1][choice.id - 1]) continue;
    // Previous-period energy deficit is the published behavioral criterion.
    // An already attached problem is counted in its old choice's requirement.
    const score = choice.lastRequirement - choice.energy + (old && old !== choice.id ? problem.demand : 0);
    if (!best || score < best.score - 1e-9) best = { id: choice.id, score };
  }
  return best?.id ?? null;
}

function chooseParticipantTarget(person, choices, resolved, period) {
  const old = person.choice;
  if ((resolved.movement === 3 || resolved.movement === 4) && old && choices[old - 1].status === 'active') return old;
  let best = null;
  for (const choice of choices) {
    if (choice.status !== 'active' || !resolved.decisionMatrix[person.id - 1][choice.id - 1]) continue;
    // The appendix compares last-period deficits and adjusts a mover's score by
    // that participant's previous effective energy. Ties follow choice order.
    const movedAdjustment = old && old !== choice.id && period > 1 ? person.lastContribution : 0;
    const score = choice.lastRequirement - choice.energy - movedAdjustment;
    if (!best || score < best.score - 1e-9) best = { id: choice.id, score };
  }
  return best?.id ?? null;
}

const snapshot = (period, choices, problems, people, events, stats, coefficient) => ({
  period,
  coefficient,
  choices: choices.map(c => ({ ...c, problems: [...c.problems], participants: [...c.participants] })),
  problems: problems.map(p => ({ ...p })),
  people: people.map(p => ({ ...p })),
  events: [...events],
  stats: { ...stats, styles: { ...stats.styles } },
});

export function simulate(raw = {}) {
  const r = resolveConfig(raw);
  const choices = Array.from({ length: r.choices }, (_, i) => ({
    id: i + 1, entry: r.choiceEntries[i], status: 'waiting', choice: null,
    lastRequirement: 1.1, requirement: 0, energy: 0,
    problems: [], participants: [], everHadProblem: false,
    decidedAt: null, style: null, solvedProblemIds: [],
  }));
  const problems = Array.from({ length: r.problems }, (_, i) => ({
    id: i + 1, entry: r.problemEntries[i], demand: r.demands[i],
    status: 'waiting', choice: null, moves: 0, solvedAt: null,
  }));
  const people = Array.from({ length: r.participants }, (_, i) => ({
    id: i + 1, energy: r.participantEnergy[i], choice: null,
    lastContribution: 0, moves: 0,
  }));
  const stats = {
    styles: { resolution: 0, oversight: 0, flight: 0 },
    solvedProblems: 0, completedChoices: 0,
    KT: 0, KU: 0, KV: 0, KW: r.problems, KX: 0, KS: 0, KY: 0, KZ: r.choices, XR: 0, XS: 0,
  };
  const history = [snapshot(0, choices, problems, people, [], stats, 0)];

  for (let period = 1; period <= r.periods; period++) {
    const events = [];
    const coefficient = r.coefficients[period - 1];
    const arrivedChoices = choices.filter(c => c.entry === period);
    const arrivedProblems = problems.filter(p => p.entry === period);
    for (const c of arrivedChoices) c.status = 'active';
    for (const p of arrivedProblems) p.status = 'active';
    if (arrivedChoices.length) events.push({ type: 'arrival', text: `선택기회 ${arrivedChoices.map(x => x.id).join('·')}번 등장` });
    if (arrivedProblems.length) events.push({ type: 'arrival', text: `문제 ${arrivedProblems.map(x => x.id).join('·')}번 등장` });

    const problemDestinations = problems.map(p => p.status === 'active' ? chooseProblemTarget(p, choices, r, r.movement) : p.choice);
    problems.forEach((p, i) => {
      if (p.status !== 'active') return;
      const next = problemDestinations[i];
      if (p.choice && next && p.choice !== next) { p.moves++; stats.KV++; events.push({ type: 'move', text: `문제 ${p.id}번: 선택 ${p.choice} → ${next}` }); }
      p.choice = next;
    });

    const personDestinations = people.map(p => chooseParticipantTarget(p, choices, r, period));
    people.forEach((p, i) => {
      const next = personDestinations[i];
      if (p.choice && next && p.choice !== next) { p.moves++; stats.KX++; events.push({ type: 'move', text: `참여자 ${p.id}번: 선택 ${p.choice} → ${next}` }); }
      p.choice = next;
      if (!next) { stats.KS++; stats.XR += p.energy * coefficient; }
    });

    for (const c of choices) {
      if (c.status !== 'active') continue;
      c.problems = problems.filter(p => p.status === 'active' && p.choice === c.id).map(p => p.id);
      c.participants = people.filter(p => p.choice === c.id).map(p => p.id);
      c.requirement = c.problems.reduce((sum, id) => sum + problems[id - 1].demand, 0);
      if (c.problems.length) c.everHadProblem = true;
      const added = c.participants.reduce((sum, id) => sum + people[id - 1].energy * coefficient, 0);
      c.energy += added;
      c.lastRequirement = c.requirement;
      if (c.energy + 1e-9 >= c.requirement) {
        c.status = 'decided'; c.decidedAt = period;
        c.style = c.problems.length ? 'resolution' : c.everHadProblem ? 'flight' : 'oversight';
        c.solvedProblemIds = [...c.problems];
        stats.styles[c.style]++; stats.completedChoices++;
        stats.XS += Math.max(0, c.energy - c.requirement);
        for (const id of c.problems) { problems[id - 1].status = 'solved'; problems[id - 1].solvedAt = period; stats.solvedProblems++; }
        const label = { resolution: '해결', oversight: '간과', flight: '도피' }[c.style];
        events.push({ type: 'decision', choiceId: c.id, style: c.style, text: `선택 ${c.id}번 결정 · ${label}${c.problems.length ? ` · 문제 ${c.problems.join('·')}번 해결` : ''}` });
      }
    }
    for (const p of people) {
      p.lastContribution = p.choice ? p.energy * coefficient : 0;
      if (p.choice && choices[p.choice - 1].status === 'decided') p.choice = null;
    }
    for (const p of problems) if (p.status === 'active') {
      if (p.choice) stats.KT++; else stats.KU++;
    }
    stats.KY += choices.filter(c => c.status === 'active').length;
    stats.KW = problems.filter(p => p.status !== 'solved').length;
    stats.KZ = choices.filter(c => c.status !== 'decided').length;
    if (!events.length) {
      const accumulating = choices.filter(c => c.status === 'active' && c.participants.length && c.energy < c.requirement);
      events.push(accumulating.length
        ? { type: 'progress', text: `이동·결정 없음 · ${accumulating.map(c => `선택 ${c.id}: 누적 에너지 ${round(c.energy)} / 문제 요구량 ${round(c.requirement)}`).join(' · ')}` }
        : { type: 'quiet', text: '이 기간에는 새로운 이동이나 결정이 없습니다.' });
    }
    if (period === r.periods) {
      for (const p of problems.filter(p => p.status === 'active' && !p.choice)) {
        const accessible = choices.filter(c => r.accessMatrix[p.id - 1][c.id - 1]);
        if (accessible.length && accessible.every(c => c.status === 'decided')) {
          events.push({ type: 'blocked', text: `미해결 문제 ${p.id}: 접근 가능한 선택 ${accessible.map(c => c.id).join('·')} 모두 이미 결정됨` });
        }
      }
    }
    history.push(snapshot(period, choices, problems, people, events, stats, coefficient));
  }
  return { config: r, history, final: history.at(-1) };
}

export function checkPrediction(previous, next, predicted) {
  const firstDecision = next.events.find(e => e.type === 'decision');
  const actual = firstDecision?.style ?? 'none';
  return { actual, correct: predicted === actual, choiceId: firstDecision?.choiceId ?? null };
}
