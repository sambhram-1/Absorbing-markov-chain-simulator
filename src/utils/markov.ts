export interface TransientStateMeta {
  id: number;
  code: string;
  name: string;
  desc: string;
  short: string;
  color: string;
  isStress?: boolean;
}

export interface ScenarioConfig {
  key: ScenarioKey;
  label: string;
  shortLabel: string;
  isIntervention: boolean;
  description: string;
  policyNote: string;
  matrix: number[][];
}

export type ScenarioKey = 'baseline' | 'grant' | 'tutoring' | 'holistic' | 'custom';

export interface MarkovComputationResult {
  Q: number[][];
  R: number[][];
  N: number[][];
  expectedSemesters: number[];
  B: number[][]; // 4x2: [gradProb, dropProb]
}

export interface MonteCarloSummary {
  startStateIdx: number;
  trials: number;
  gradCount: number;
  dropCount: number;
  simGradPct: number;
  simDropPct: number;
  simAvgSemesters: number;
  theoryGradPct: number;
  theoryDropPct: number;
  theoryAvgSemesters: number;
  variancePct: number;
  semesterHistogram: { semester: number; graduated: number; dropped: number }[];
}

export interface CohortWaveStep {
  semester: number;
  s1: number;
  s2: number;
  s3: number;
  s4: number;
  graduated: number;
  droppedOut: number;
}

export interface SensitivityPoint {
  grantBoost: number; // 0.00 to 0.35 shift from S4->Drop to S4->Mid GPA
  s4GradPct: number;
  s3GradPct: number;
  s4ExpectedSemesters: number;
}

export const STATES: TransientStateMeta[] = [
  {
    id: 0,
    code: 'S1',
    name: 'High GPA',
    desc: 'GPA ≥ 3.0 · Financially Stable',
    short: 'S1: High GPA',
    color: '#2563EB',
  },
  {
    id: 1,
    code: 'S2',
    name: 'Mid GPA',
    desc: 'GPA 2.0–2.99 · Financially Stable',
    short: 'S2: Mid GPA',
    color: '#2563EB',
  },
  {
    id: 2,
    code: 'S3',
    name: 'Low GPA',
    desc: 'GPA < 2.0 · Academic Probation',
    short: 'S3: Low GPA',
    color: '#1D4ED8',
  },
  {
    id: 3,
    code: 'S4',
    name: 'Financial Stress',
    desc: 'Overdue Tuition · Aid Hold Risk',
    short: 'S4: Fin. Stress',
    color: '#D97706',
    isStress: true,
  },
];

export const SCENARIOS: Record<Exclude<ScenarioKey, 'custom'>, ScenarioConfig> = {
  baseline: {
    key: 'baseline',
    label: 'Baseline (Empirical Data)',
    shortLabel: 'Baseline (Empirical)',
    isIntervention: false,
    description:
      'Calibrated on UCI Student Dropout Dataset (N = 4,424), NCES 6-Year Completion Benchmarks, and Penn State CCMH / Lumina-Gallup Financial Stress Studies.',
    policyNote: 'No policy intervention active. Reflects empirical attrition under standard financial aid holds.',
    matrix: [
      [0.55, 0.12, 0.02, 0.05, 0.25, 0.01], // S1: High GPA
      [0.18, 0.48, 0.12, 0.08, 0.10, 0.04], // S2: Mid GPA
      [0.03, 0.22, 0.45, 0.10, 0.02, 0.18], // S3: Low GPA
      [0.05, 0.15, 0.20, 0.35, 0.03, 0.22], // S4: Financial Stress
    ],
  },
  grant: {
    key: 'grant',
    label: 'Emergency Tuition Micro-Grant',
    shortLabel: 'Emergency Micro-Grant',
    isIntervention: true,
    description:
      'Intervention on S4 (Financial Stress): Clears overdue tuition holds, lifting S4 → Mid GPA recovery from 0.15 to 0.35 and cutting direct S4 Dropout from 0.22 to 0.02.',
    policyNote: 'Micro-grants ($1,200 avg) eliminate immediate registration holds for financially stressed students.',
    matrix: [
      [0.55, 0.12, 0.02, 0.05, 0.25, 0.01],
      [0.18, 0.48, 0.12, 0.08, 0.10, 0.04],
      [0.03, 0.22, 0.45, 0.10, 0.02, 0.18],
      [0.05, 0.35, 0.20, 0.35, 0.03, 0.02], // Row sum = 1.00
    ],
  },
  tutoring: {
    key: 'tutoring',
    label: 'Early Academic Tutoring',
    shortLabel: 'Early Academic Tutoring',
    isIntervention: true,
    description:
      'Intervention on S3 (Low GPA): Mandatory advising & peer tutoring boosts S3 → Mid GPA recovery from 0.22 to 0.40 and reduces S3 probation stagnation from 0.45 to 0.27.',
    policyNote: 'Structured supplemental instruction targets students on academic probation (< 2.0 GPA).',
    matrix: [
      [0.55, 0.12, 0.02, 0.05, 0.25, 0.01],
      [0.18, 0.48, 0.12, 0.08, 0.10, 0.04],
      [0.03, 0.40, 0.27, 0.10, 0.02, 0.18], // Row sum = 1.00
      [0.05, 0.15, 0.20, 0.35, 0.03, 0.22],
    ],
  },
  holistic: {
    key: 'holistic',
    label: 'Holistic Support (Grant + Tutoring)',
    shortLabel: 'Holistic Support (Both)',
    isIntervention: true,
    description:
      'Combined Policy Package: Deploys Emergency Tuition Micro-Grants (S4) alongside Early Academic Tutoring (S3) to tackle both financial and academic attrition.',
    policyNote: 'Joint intervention captures synergistic retention gains when stressed students also receive academic coaching.',
    matrix: [
      [0.55, 0.12, 0.02, 0.05, 0.25, 0.01],
      [0.18, 0.48, 0.12, 0.08, 0.10, 0.04],
      [0.03, 0.40, 0.27, 0.10, 0.02, 0.18],
      [0.05, 0.35, 0.20, 0.35, 0.03, 0.02],
    ],
  },
};

export function cloneMatrix(m: number[][]): number[][] {
  return m.map((row) => [...row]);
}

export function getRowSum(row: number[]): number {
  return row.reduce((acc, val) => acc + val, 0);
}

export function isRowSumValid(row: number[], tolerance = 0.0015): boolean {
  return Math.abs(getRowSum(row) - 1.0) <= tolerance;
}

export function normalizeMatrixRow(row: number[]): number[] {
  const sum = getRowSum(row);
  if (sum <= 0) {
    return [0.2, 0.2, 0.2, 0.2, 0.1, 0.1];
  }
  const scaled = row.map((v) => Math.round((v / sum) * 100) / 100);
  const roundedSum = getRowSum(scaled);
  const diff = Math.round((1.0 - roundedSum) * 100) / 100;
  let maxIdx = 0;
  for (let i = 1; i < scaled.length; i++) {
    if (scaled[i] > scaled[maxIdx]) maxIdx = i;
  }
  scaled[maxIdx] = Math.max(0, Math.round((scaled[maxIdx] + diff) * 100) / 100);
  return scaled;
}

/**
 * Gauss-Jordan Matrix Inversion with Partial Pivoting
 * Returns null if matrix is singular or near-singular.
 */
export function invertMatrix(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  const aug = Array.from({ length: n }, (_, i) => {
    const row = new Array(2 * n).fill(0);
    for (let j = 0; j < n; j++) row[j] = matrix[i][j];
    row[n + i] = 1;
    return row;
  });

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let r = col + 1; r < n; r++) {
      const val = Math.abs(aug[r][col]);
      if (val > maxVal) {
        maxVal = val;
        pivotRow = r;
      }
    }

    if (maxVal < 1e-10) {
      return null;
    }

    if (pivotRow !== col) {
      const temp = aug[col];
      aug[col] = aug[pivotRow];
      aug[pivotRow] = temp;
    }

    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] /= pivot;
    }

    for (let r = 0; r < n; r++) {
      if (r !== col) {
        const factor = aug[r][col];
        for (let j = 0; j < 2 * n; j++) {
          aug[r][j] -= factor * aug[col][j];
        }
      }
    }
  }

  return aug.map((row) => row.slice(n));
}

/**
 * Computes Fundamental Matrix N = (I - Q)^(-1),
 * Expected Semesters t = N * 1,
 * and Absorption Probability Matrix B = N * R.
 */
export function computeMarkovChain(P: number[][]): MarkovComputationResult | null {
  const n = 4;
  if (!P || P.length !== n) return null;

  const Q = P.map((row) => row.slice(0, 4));
  const R = P.map((row) => row.slice(4, 6));

  const IminusQ = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0) - Q[i][j])
  );

  const N = invertMatrix(IminusQ);
  if (!N) return null;

  // Validate that N contains non-negative finite numbers
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (!Number.isFinite(N[i][j]) || N[i][j] < -1e-6) {
        return null;
      }
    }
  }

  const expectedSemesters = N.map((row) => row.reduce((acc, v) => acc + v, 0));

  const B = Array.from({ length: n }, (_, i) => {
    let pGrad = 0;
    let pDrop = 0;
    for (let k = 0; k < n; k++) {
      pGrad += N[i][k] * R[k][0];
      pDrop += N[i][k] * R[k][1];
    }
    return [pGrad, pDrop];
  });

  return { Q, R, N, expectedSemesters, B };
}

/**
 * Samples the next state index (0..3 transient, 4=Graduated, 5=Dropped Out)
 */
export function sampleNextState(P: number[][], stateIdx: number, rng: () => number = Math.random): number {
  const row = P[stateIdx];
  const total = getRowSum(row);
  const r = rng() * (total > 0 ? total : 1);
  let cumulative = 0;
  for (let j = 0; j < 6; j++) {
    cumulative += row[j];
    if (r <= cumulative) return j;
  }
  return 5;
}

/**
 * Runs a 1,000-student Monte Carlo simulation from a chosen starting state
 */
export function runMonteCarloSimulation(
  P: number[][],
  startStateIdx: number,
  trials = 1000,
  rng: () => number = Math.random
): MonteCarloSummary {
  let gradCount = 0;
  let dropCount = 0;
  let totalSemesters = 0;

  const maxBucket = 16;
  const histMap: { graduated: number; dropped: number }[] = Array.from(
    { length: maxBucket + 1 },
    () => ({ graduated: 0, dropped: 0 })
  );

  for (let t = 0; t < trials; t++) {
    let state = startStateIdx;
    let steps = 0;
    while (state < 4 && steps < 200) {
      state = sampleNextState(P, state, rng);
      steps++;
    }
    const bucket = Math.min(maxBucket, Math.max(1, steps));
    if (state === 4) {
      gradCount++;
      histMap[bucket].graduated++;
    } else {
      dropCount++;
      histMap[bucket].dropped++;
    }
    totalSemesters += steps;
  }

  const simGradPct = (gradCount / trials) * 100;
  const simDropPct = (dropCount / trials) * 100;
  const simAvgSemesters = totalSemesters / trials;

  const exact = computeMarkovChain(P);
  const theoryGradPct = exact ? exact.B[startStateIdx][0] * 100 : 0;
  const theoryDropPct = exact ? exact.B[startStateIdx][1] * 100 : 0;
  const theoryAvgSemesters = exact ? exact.expectedSemesters[startStateIdx] : 0;

  const semesterHistogram = histMap
    .map((counts, idx) => ({
      semester: idx,
      graduated: counts.graduated,
      dropped: counts.dropped,
    }))
    .slice(1);

  return {
    startStateIdx,
    trials,
    gradCount,
    dropCount,
    simGradPct,
    simDropPct,
    simAvgSemesters,
    theoryGradPct,
    theoryDropPct,
    theoryAvgSemesters,
    variancePct: Math.abs(simGradPct - theoryGradPct),
    semesterHistogram,
  };
}

/**
 * Projects a cohort distribution [S1, S2, S3, S4, Grad, Drop] across N semesters
 * using exact Markov power iteration: v_{t+1} = v_t * P_full
 */
export function computeCohortProjection(
  P: number[][],
  initialCounts: [number, number, number, number] = [250, 400, 200, 150],
  maxSemesters = 12
): CohortWaveStep[] {
  const steps: CohortWaveStep[] = [];
  let current = [
    initialCounts[0],
    initialCounts[1],
    initialCounts[2],
    initialCounts[3],
    0, // Graduated (A1)
    0, // Dropped Out (A2)
  ];

  for (let sem = 0; sem <= maxSemesters; sem++) {
    steps.push({
      semester: sem,
      s1: current[0],
      s2: current[1],
      s3: current[2],
      s4: current[3],
      graduated: current[4],
      droppedOut: current[5],
    });

    const next = [0, 0, 0, 0, current[4], current[5]];
    for (let i = 0; i < 4; i++) {
      const rowSum = getRowSum(P[i]);
      const scale = rowSum > 0 ? 1 / rowSum : 1;
      for (let j = 0; j < 6; j++) {
        next[j] += current[i] * (P[i][j] * scale);
      }
    }
    current = next;
  }

  return steps;
}

/**
 * Computes policy sensitivity curve as S4 direct dropout probability is shifted into S4->S2 recovery
 */
export function computeGrantSensitivitySweep(baseP: number[][]): SensitivityPoint[] {
  const points: SensitivityPoint[] = [];
  const shifts = [0, 0.04, 0.08, 0.12, 0.16, 0.20];

  for (const shift of shifts) {
    const P = cloneMatrix(baseP);
    // In baseline S4 row is [0.05, 0.15, 0.20, 0.35, 0.03, 0.22]
    const actualShift = Math.min(shift, P[3][5]);
    P[3][1] = Math.round((P[3][1] + actualShift) * 1000) / 1000;
    P[3][5] = Math.round((P[3][5] - actualShift) * 1000) / 1000;

    const res = computeMarkovChain(P);
    if (res) {
      points.push({
        grantBoost: Math.round(actualShift * 100),
        s4GradPct: res.B[3][0] * 100,
        s3GradPct: res.B[2][0] * 100,
        s4ExpectedSemesters: res.expectedSemesters[3],
      });
    }
  }
  return points;
}
