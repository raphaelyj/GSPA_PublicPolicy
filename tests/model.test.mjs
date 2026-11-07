import test from 'node:test';
import assert from 'node:assert/strict';
import { PAPER, DEFAULT_CONFIG, resolveConfig, simulate, checkPrediction } from '../dist/model.js';

test('published scale and net energy loads', () => {
  for (const [load, expected] of [[1.1,-44],[2.2,-22],[3.3,0]]) {
    const r=resolveConfig({load});
    assert.equal(r.periods,20); assert.equal(r.choices,10);
    assert.equal(r.problems,20); assert.equal(r.participants,10);
    assert.ok(Math.abs(r.potentialPerPeriod-5.5)<1e-9);
    assert.ok(Math.abs(r.totalEffectiveEnergy-66)<1e-9);
    assert.ok(Math.abs(r.netLoad-expected)<1e-9);
  }
});

test('two published entry orders and footnote coefficient series', () => {
  const r=resolveConfig({choiceOrder:'paperB',problemOrder:'paperB',coefficientMode:'footnote'});
  assert.equal(r.choiceEntries[PAPER.choiceOrders[1][0]-1],1);
  assert.equal(r.choiceEntries[PAPER.choiceOrders[1][9]-1],10);
  assert.equal(r.problemEntries[PAPER.problemOrders[1][0]-1],1);
  assert.equal(r.problemEntries[PAPER.problemOrders[1][1]-1],1);
  assert.equal(r.problemEntries[PAPER.problemOrders[1][19]-1],10);
  assert.deepEqual(r.coefficients.slice(0,10),PAPER.footnoteCoefficients);
  assert.deepEqual(r.coefficients.slice(10),Array(10).fill(.6));
});

test('published entry schedule ends after period ten while movement continues', () => {
  const run=simulate();
  for (let period=1;period<=10;period++) {
    assert.equal(run.history[period].choices.filter(c=>c.entry===period).length,1);
    assert.equal(run.history[period].problems.filter(p=>p.entry===period).length,2);
  }
  for (let period=11;period<=20;period++) {
    assert.equal(run.history[period].events.some(e=>e.type==='arrival'),false);
  }
  assert.equal(run.history[11].choices.filter(c=>c.status==='active').length,3);
  assert.equal(run.history[11].events.filter(e=>e.type==='move').length,9);
  assert.equal(run.history[10].stats.completedChoices,run.history[11].stats.completedChoices);
  assert.equal(run.history[15].events[0].type,'progress');
  assert.match(run.history[15].events[0].text,/선택 8: 누적 에너지 13\.2 \/ 문제 요구량 26\.4/);
  assert.match(run.final.events.at(-1).text,/미해결 문제 18: 접근 가능한 선택 9·10 모두 이미 결정됨/);
  assert.equal(simulate({choiceOrder:'paperB'}).final.stats.solvedProblems,20);
});

test('the full 324-condition design remains close to the published aggregate means', () => {
  let unresolved=0, undecided=0, runs=0;
  for (const load of [1.1,2.2,3.3])
    for (const access of ['unsegmented','hierarchical','specialized'])
      for (const decision of ['unsegmented','hierarchical','specialized'])
        for (const energyDistribution of ['importantLess','equal','importantMore'])
          for (const choiceOrder of ['paperA','paperB'])
            for (const problemOrder of ['paperA','paperB']) {
              const {final}=simulate({load,access,decision,energyDistribution,choiceOrder,problemOrder});
              unresolved+=final.stats.KW;
              undecided+=final.stats.KZ;
              runs++;
            }
  assert.equal(runs,324);
  assert.ok(Math.abs(unresolved/runs-12.3)<0.5);
  assert.ok(Math.abs(undecided/runs-1.0)<0.2);
});

test('published pure access and decision structures have correct dimensions', () => {
  const a=resolveConfig({access:'specialized',decision:'specialized'});
  assert.equal(a.accessMatrix.length,20);
  assert.equal(a.accessMatrix[0].length,10);
  assert.ok(a.accessMatrix.every(row=>row.reduce((x,y)=>x+y,0)===1));
  assert.ok(a.accessMatrix[0][0]&&a.accessMatrix[1][0]&&a.accessMatrix[19][9]);
  assert.ok(a.decisionMatrix.every((row,i)=>row[i]===1&&row.reduce((x,y)=>x+y,0)===1));
  const h=resolveConfig({access:'hierarchical',decision:'hierarchical'});
  assert.equal(h.accessMatrix[0].reduce((x,y)=>x+y),10);
  assert.equal(h.accessMatrix[19].reduce((x,y)=>x+y),1);
  assert.equal(h.decisionMatrix[0].reduce((x,y)=>x+y),10);
  assert.equal(h.decisionMatrix[9].reduce((x,y)=>x+y),1);
});

test('per-period coefficient changes actual energy', () => {
  const common={...DEFAULT_CONFIG,periods:2,choices:1,problems:1,participants:1,
    choiceOrder:'ascending',problemOrder:'ascending',access:'unsegmented',decision:'unsegmented',
    load:10,totalEnergy:2,coefficientMode:'custom',coefficientCustom:'0, 1'};
  const run=simulate(common);
  assert.equal(run.history[1].choices[0].energy,0);
  assert.equal(run.history[2].choices[0].energy,2);
  assert.equal(run.history[2].choices[0].status,'active');
});

test('resolution and oversight are classified from current problems', () => {
  const common={periods:2,choices:1,problems:1,participants:1,
    choiceOrder:'ascending',problemOrder:'custom',access:'unsegmented',decision:'unsegmented',
    totalEnergy:2,coefficient:1,load:1};
  const resolution=simulate({...common,problemEntriesCustom:'1'});
  assert.equal(resolution.final.stats.styles.resolution,1);
  assert.equal(resolution.final.stats.solvedProblems,1);
  const oversight=simulate({...common,problemEntriesCustom:'2'});
  assert.equal(oversight.history[1].stats.styles.oversight,1);
  assert.equal(oversight.final.stats.solvedProblems,0);
  assert.deepEqual(checkPrediction(oversight.history[0],oversight.history[1],'oversight'),
    {actual:'oversight',correct:true,choiceId:1});
});

test('invalid custom array is rejected before simulation', () => {
  assert.throws(()=>resolveConfig({access:'custom',accessMatrixCustom:'11'}),/접근구조 행렬/);
  assert.throws(()=>resolveConfig({coefficientMode:'custom',coefficientCustom:'0.5'}),/기간별 해결책 계수/);
});
