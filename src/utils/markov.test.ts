import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENARIOS,
  cloneMatrix,
  computeMarkovChain,
  isRowSumValid,
  normalizeMatrixRow,
  runMonteCarloSimulation,
  computeCohortProjection,
} from './markov';

test('all preset scenario rows sum to 1.00', () => {
  for (const key of ['baseline', 'grant', 'tutoring', 'holistic'] as const) {
    const matrix = SCENARIOS[key].matrix;
    assert.equal(matrix.length, 4);
    for (let r = 0; r < 4; r++) {
      assert.equal(isRowSumValid(matrix[r]), true, `${key} row ${r} must sum to 1.00`);
    }
  }
});

test('computeMarkovChain calculates exact Fundamental Matrix N and Absorption Matrix B for baseline', () => {
  const res = computeMarkovChain(SCENARIOS.baseline.matrix);
  assert.notEqual(res, null);
  if (!res) return;

  // Each row of B (Grad + Drop probability) must sum to 1.00 when P rows sum to 1.00
  for (let i = 0; i < 4; i++) {
    const sumB = res.B[i][0] + res.B[i][1];
    assert.ok(Math.abs(sumB - 1.0) < 1e-6, `Row ${i} absorption probabilities must sum to 1.0, got ${sumB}`);
    assert.ok(res.expectedSemesters[i] > 1.0, `Expected semesters for state ${i} should be > 1`);
  }

  // S1 (High GPA) must have highest graduation probability, S4 (Financial Stress) lowest in baseline
  assert.ok(res.B[0][0] > res.B[1][0], 'S1 grad odds > S2 grad odds');
  assert.ok(res.B[1][0] > res.B[2][0], 'S2 grad odds > S3 grad odds');
  assert.ok(res.B[2][0] > res.B[3][0], 'S3 grad odds > S4 grad odds');
});

test('Emergency Micro-Grant scenario significantly increases S4 graduation probability over baseline', () => {
  const base = computeMarkovChain(SCENARIOS.baseline.matrix)!;
  const grant = computeMarkovChain(SCENARIOS.grant.matrix)!;

  const baseS4Grad = base.B[3][0] * 100;
  const grantS4Grad = grant.B[3][0] * 100;

  assert.ok(
    grantS4Grad - baseS4Grad > 25,
    `Expected micro-grant to boost S4 graduation rate by >25%, got +${(grantS4Grad - baseS4Grad).toFixed(1)}%`
  );
});

test('normalizeMatrixRow scales non-unit row to sum exactly to 1.00', () => {
  const unnormalized = [0.5, 0.5, 0.2, 0.2, 0.4, 0.2]; // sum = 2.0
  assert.equal(isRowSumValid(unnormalized), false);
  const normalized = normalizeMatrixRow(unnormalized);
  assert.equal(isRowSumValid(normalized), true);
});

test('computeMarkovChain returns null when transient state is trapped (singular I - Q)', () => {
  const trapped = cloneMatrix(SCENARIOS.baseline.matrix);
  // Make S1 a closed self-loop with 0 exit
  trapped[0] = [1.0, 0, 0, 0, 0, 0];
  const res = computeMarkovChain(trapped);
  assert.equal(res, null);
});

test('Monte Carlo cohort simulation converges close to exact analytical B = N * R', () => {
  // Deterministic LCG RNG for unit test stability
  let seed = 42;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const mc = runMonteCarloSimulation(SCENARIOS.baseline.matrix, 3, 2000, rng);
  assert.equal(mc.trials, 2000);
  assert.equal(mc.gradCount + mc.dropCount, 2000);
  assert.ok(mc.variancePct < 4.0, `Monte Carlo variance ${mc.variancePct.toFixed(2)}% should be within 4% of exact theory`);
});

test('computeCohortProjection conserves total student population across all semesters', () => {
  const steps = computeCohortProjection(SCENARIOS.holistic.matrix, [250, 400, 200, 150], 10);
  assert.equal(steps.length, 11);
  for (const step of steps) {
    const total = step.s1 + step.s2 + step.s3 + step.s4 + step.graduated + step.droppedOut;
    assert.ok(Math.abs(total - 1000) < 1e-4, `Total cohort must remain 1000 at semester ${step.semester}`);
  }
});
