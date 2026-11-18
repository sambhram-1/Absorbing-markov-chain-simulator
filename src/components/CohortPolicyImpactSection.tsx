import React, { useState } from 'react';
import {
  STATES,
  SCENARIOS,
  MarkovComputationResult,
  computeCohortProjection,
  computeGrantSensitivitySweep,
} from '../utils/markov';

interface CohortPolicyImpactSectionProps {
  matrix: number[][];
  computation: MarkovComputationResult | null;
  baselineComputation: MarkovComputationResult;
  onExportCsv: () => void;
}

export const CohortPolicyImpactSection: React.FC<CohortPolicyImpactSectionProps> = ({
  matrix,
  computation,
  baselineComputation,
  onExportCsv,
}) => {
  const [cohortCounts, setCohortCounts] = useState<[number, number, number, number]>([
    250, 400, 200, 150,
  ]);
  const [grantPerStudent, setGrantPerStudent] = useState<number>(1200);
  const [tuitionPerGrad, setTuitionPerGrad] = useState<number>(18000);

  const totalStudents =
    cohortCounts[0] + cohortCounts[1] + cohortCounts[2] + cohortCounts[3];

  const projectionSteps = computeCohortProjection(matrix, cohortCounts, 10);
  const sensitivityPoints = computeGrantSensitivitySweep(SCENARIOS.baseline.matrix);

  let activeExpectedGrads = 0;
  let baselineExpectedGrads = 0;

  if (computation) {
    for (let i = 0; i < 4; i++) {
      activeExpectedGrads += cohortCounts[i] * computation.B[i][0];
      baselineExpectedGrads += cohortCounts[i] * baselineComputation.B[i][0];
    }
  }

  const netAdditionalGrads = activeExpectedGrads - baselineExpectedGrads;
  const estimatedGrantBudget = cohortCounts[3] * grantPerStudent;
  const tuitionRetained = Math.max(0, netAdditionalGrads) * tuitionPerGrad;

  const updateCohortCount = (idx: number, val: number) => {
    const next: [number, number, number, number] = [...cohortCounts] as [
      number,
      number,
      number,
      number
    ];
    next[idx] = Math.max(0, Math.min(5000, Math.round(val)));
    setCohortCounts(next);
  };

  return (
    <section
      id="cohort-projection"
      className="mt-5 liquid-glass-card rounded-2xl p-5"
      aria-labelledby="heading-cohort-projection"
    >
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-200/80">
        <div className="min-w-0">
          <h2
            id="heading-cohort-projection"
            className="text-base font-semibold text-slate-900 tracking-tight"
          >
            05 · Cohort Flow &amp; ROI
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            10-semester cohort projection and intervention return.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onExportCsv}
            className="px-3 py-1 text-xs font-medium text-slate-700 bg-white/90 hover:bg-white border border-slate-200 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
          >
            Export CSV
          </button>
          <span className="font-mono-tabular text-xs font-medium text-sky-700 bg-sky-50/90 border border-sky-200/80 px-2.5 py-1 rounded-md whitespace-nowrap">
            v(t) = v(0) · P^t
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 7 Cols: Entering Cohort & 10-Semester Absorption Wave */}
        <div className="lg:col-span-7 flex flex-col gap-3.5">
          <div className="liquid-glass-subpanel rounded-xl p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-slate-700">
                Initial Cohort (N ={' '}
                <span className="font-mono-tabular font-semibold text-sky-700">
                  {totalStudents.toLocaleString()}
                </span>
                )
              </span>
              <button
                type="button"
                onClick={() => setCohortCounts([250, 400, 200, 150])}
                className="text-xs font-medium text-sky-600 hover:underline cursor-pointer"
              >
                Reset
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STATES.map((st, idx) => (
                <div
                  key={st.code}
                  className="bg-white/80 border border-slate-200/80 rounded-lg p-2"
                >
                  <label
                    htmlFor={`cohort-input-${st.code}`}
                    className="block text-[11px] font-medium text-slate-500"
                  >
                    {st.code} · {st.name}
                  </label>
                  <input
                    id={`cohort-input-${st.code}`}
                    type="number"
                    min="0"
                    max="5000"
                    step="10"
                    value={cohortCounts[idx]}
                    onChange={(e) =>
                      updateCohortCount(idx, parseFloat(e.target.value) || 0)
                    }
                    className="mt-1 w-full px-2 py-1 text-xs font-mono-tabular font-semibold text-slate-800 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 10-Semester Stacked Cohort Distribution Chart */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-slate-700">
                10-Semester Flow
              </span>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span>
                  <strong className="text-emerald-500">■</strong> Grad
                </span>
                <span>
                  <strong className="text-sky-500">■</strong> S1–S3
                </span>
                <span>
                  <strong className="text-amber-500">■</strong> S4
                </span>
                <span>
                  <strong className="text-rose-500">■</strong> Drop
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {projectionSteps.map((step) => {
                const denom = totalStudents > 0 ? totalStudents : 1;
                const gradPct = (step.graduated / denom) * 100;
                const s123Pct =
                  ((step.s1 + step.s2 + step.s3) / denom) * 100;
                const s4Pct = (step.s4 / denom) * 100;
                const dropPct = (step.droppedOut / denom) * 100;

                return (
                  <div
                    key={step.semester}
                    className="grid grid-cols-12 items-center gap-2 text-xs"
                  >
                    <span className="col-span-2 font-mono-tabular text-[11px] font-medium text-slate-500">
                      Sem {step.semester}
                    </span>
                    <div className="col-span-7 h-4 bg-slate-100 rounded overflow-hidden flex border border-slate-200/80">
                      <div
                        style={{ width: `${gradPct.toFixed(1)}%` }}
                        className="bg-emerald-500 transition-all duration-200"
                        title={`Graduated: ${Math.round(step.graduated)}`}
                      />
                      <div
                        style={{ width: `${s123Pct.toFixed(1)}%` }}
                        className="bg-sky-400 transition-all duration-200"
                        title={`In S1-S3: ${Math.round(step.s1 + step.s2 + step.s3)}`}
                      />
                      <div
                        style={{ width: `${s4Pct.toFixed(1)}%` }}
                        className="bg-amber-400 transition-all duration-200"
                        title={`In S4 Stress: ${Math.round(step.s4)}`}
                      />
                      <div
                        style={{ width: `${dropPct.toFixed(1)}%` }}
                        className="bg-rose-400 transition-all duration-200"
                        title={`Dropped Out: ${Math.round(step.droppedOut)}`}
                      />
                    </div>
                    <span className="col-span-3 font-mono-tabular text-[11px] text-right text-slate-400">
                      <span className="text-emerald-600 font-medium">
                        {Math.round(step.graduated)}G
                      </span>{' '}
                      ·{' '}
                      <span className="text-rose-600 font-medium">
                        {Math.round(step.droppedOut)}D
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Fiscal Summary & Sensitivity Sweep */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          <div className="liquid-glass-subpanel rounded-xl p-3.5">
            <h3 className="text-xs font-semibold text-slate-800 mb-2.5">
              Retention &amp; Fiscal Summary
            </h3>

            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div className="bg-white/85 border border-slate-200/80 rounded-lg p-2.5">
                <div className="text-[11px] text-slate-500">
                  Expected Graduates
                </div>
                <div className="font-mono-tabular text-sm font-semibold text-emerald-700 mt-0.5">
                  {Math.round(activeExpectedGrads).toLocaleString()} (
                  {totalStudents > 0
                    ? ((activeExpectedGrads / totalStudents) * 100).toFixed(1)
                    : '0.0'}
                  %)
                </div>
              </div>

              <div className="bg-white/85 border border-slate-200/80 rounded-lg p-2.5">
                <div className="text-[11px] text-slate-500">
                  Net Saved vs. Base
                </div>
                <div
                  className={`font-mono-tabular text-sm font-semibold mt-0.5 ${
                    netAdditionalGrads >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}
                >
                  {netAdditionalGrads >= 0 ? '+' : ''}
                  {netAdditionalGrads.toFixed(1)} grads
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div>
                <label
                  htmlFor="grantPerStudentInput"
                  className="block text-[11px] text-slate-500"
                >
                  Grant per S4 ($)
                </label>
                <input
                  id="grantPerStudentInput"
                  type="number"
                  step="100"
                  min="0"
                  value={grantPerStudent}
                  onChange={(e) =>
                    setGrantPerStudent(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className="mt-1 w-full px-2 py-1 text-xs font-mono-tabular font-medium bg-white text-slate-800 border border-slate-200 rounded"
                />
              </div>
              <div>
                <label
                  htmlFor="tuitionPerGradInput"
                  className="block text-[11px] text-slate-500"
                >
                  Tuition per Grad ($)
                </label>
                <input
                  id="tuitionPerGradInput"
                  type="number"
                  step="1000"
                  min="0"
                  value={tuitionPerGrad}
                  onChange={(e) =>
                    setTuitionPerGrad(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className="mt-1 w-full px-2 py-1 text-xs font-mono-tabular font-medium bg-white text-slate-800 border border-slate-200 rounded"
                />
              </div>
            </div>

            <div className="bg-white/85 border border-slate-200/80 rounded-lg p-2.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Grant Outlay</span>
                <strong className="font-mono-tabular font-semibold text-slate-800">
                  ${estimatedGrantBudget.toLocaleString()}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[11px] block">
                  Retained Tuition
                </span>
                <strong className="font-mono-tabular font-semibold text-emerald-700">
                  +${Math.round(tuitionRetained).toLocaleString()}
                </strong>
              </div>
            </div>
          </div>

          {/* Sensitivity Sweep Table */}
          <div className="liquid-glass-subpanel rounded-xl p-3.5">
            <h3 className="text-xs font-semibold text-slate-800 mb-2">
              S4 Grant Recovery Sensitivity
            </h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-1 text-left font-medium">S4→S2 Shift</th>
                  <th className="py-1 text-right font-medium">S4 Grad</th>
                  <th className="py-1 text-right font-medium">S3 Grad</th>
                  <th className="py-1 text-right font-medium">Sem (t)</th>
                </tr>
              </thead>
              <tbody>
                {sensitivityPoints.map((pt) => (
                  <tr
                    key={pt.grantBoost}
                    className="border-b border-slate-200/60 font-mono-tabular"
                  >
                    <td className="py-1 font-medium text-amber-700">
                      +{pt.grantBoost}%
                    </td>
                    <td className="py-1 text-right font-semibold text-emerald-700">
                      {pt.s4GradPct.toFixed(1)}%
                    </td>
                    <td className="py-1 text-right text-slate-600">
                      {pt.s3GradPct.toFixed(1)}%
                    </td>
                    <td className="py-1 text-right text-slate-400">
                      {pt.s4ExpectedSemesters.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
