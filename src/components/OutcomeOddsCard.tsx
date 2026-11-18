import React from 'react';
import { STATES, MarkovComputationResult } from '../utils/markov';

interface OutcomeOddsCardProps {
  computation: MarkovComputationResult | null;
  baselineComputation: MarkovComputationResult;
  anyRowInvalid: boolean;
  onNormalizeAll: () => void;
}

export const OutcomeOddsCard: React.FC<OutcomeOddsCardProps> = ({
  computation,
  baselineComputation,
  anyRowInvalid,
  onNormalizeAll,
}) => {
  return (
    <section
      id="absorption-outcomes"
      className="liquid-glass-card rounded-2xl p-5"
      aria-labelledby="heading-outcome-odds"
    >
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 pb-3 mb-3.5 border-b border-slate-200/80">
        <div className="min-w-0">
          <h2
            id="heading-outcome-odds"
            className="text-base font-semibold text-slate-900 tracking-tight"
          >
            03 · Outcome Odds
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Long-run graduation vs. dropout probability by starting state.
          </p>
        </div>
        <span className="font-mono-tabular text-xs font-medium text-sky-700 bg-sky-50/90 border border-sky-200/80 px-2.5 py-1 rounded-md whitespace-nowrap shrink-0">
          B = N · R
        </span>
      </div>

      {anyRowInvalid && (
        <div className="mb-3 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2">
          <span>Rows must sum to 1.00 for exact odds.</span>
          <button
            type="button"
            onClick={onNormalizeAll}
            className="px-2 py-0.5 bg-amber-200/80 hover:bg-amber-200 text-amber-950 font-medium rounded transition-colors whitespace-nowrap cursor-pointer"
          >
            Normalize
          </button>
        </div>
      )}

      {!computation ? (
        <div className="text-xs text-slate-400 py-6 text-center">
          Resolve singular matrix to view absorption odds.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {STATES.map((st, i) => {
            const gradProb = Math.max(0, Math.min(1, computation.B[i][0]));
            const dropProb = Math.max(0, Math.min(1, computation.B[i][1]));
            const gradPct = (gradProb * 100).toFixed(1);
            const dropPct = (dropProb * 100).toFixed(1);
            const totalSem = computation.expectedSemesters[i].toFixed(1);

            const baseGradPct = baselineComputation.B[i][0] * 100;
            const diff = gradProb * 100 - baseGradPct;
            const hasDelta = Math.abs(diff) >= 0.15;

            const sumProb = gradProb + dropProb;
            const barGradWidth = sumProb > 0 ? (gradProb / sumProb) * 100 : 50;
            const barDropWidth = sumProb > 0 ? (dropProb / sumProb) * 100 : 50;

            return (
              <div
                key={st.code}
                className={`rounded-xl p-3 transition-colors ${
                  st.isStress
                    ? 'liquid-glass-stress'
                    : 'liquid-glass-subpanel'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`font-semibold text-xs ${
                        st.isStress ? 'text-amber-900' : 'text-slate-800'
                      }`}
                    >
                      {st.code} · {st.name}
                    </span>
                    {hasDelta && (
                      <span
                        className={`font-mono-tabular text-[11px] font-medium px-1.5 py-0.5 rounded border ${
                          diff > 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {diff > 0 ? '+' : ''}
                        {diff.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <span className="font-mono-tabular text-[11px] text-slate-500">
                    ~{totalSem} sem
                  </span>
                </div>

                <div
                  className="w-full h-7 bg-slate-100 rounded-lg overflow-hidden flex border border-slate-200/80"
                  role="img"
                  aria-label={`${st.name}: ${gradPct}% Graduate, ${dropPct}% Dropout`}
                >
                  <div
                    style={{ width: `${barGradWidth.toFixed(2)}%` }}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center px-2.5 font-mono-tabular text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-200"
                  >
                    {barGradWidth >= 20
                      ? `${gradPct}% Grad`
                      : `${gradPct}%`}
                  </div>
                  <div
                    style={{ width: `${barDropWidth.toFixed(2)}%` }}
                    className="bg-gradient-to-r from-rose-400 to-rose-500 text-white flex items-center justify-end px-2.5 font-mono-tabular text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-200"
                  >
                    {barDropWidth >= 20
                      ? `${dropPct}% Drop`
                      : `${dropPct}%`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
