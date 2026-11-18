import React from 'react';
import { STATES, MarkovComputationResult } from '../utils/markov';

interface FundamentalMatrixCardProps {
  computation: MarkovComputationResult | null;
  onResetBaseline: () => void;
}

export const FundamentalMatrixCard: React.FC<FundamentalMatrixCardProps> = ({
  computation,
  onResetBaseline,
}) => {
  return (
    <section
      id="fundamental-matrix"
      className="liquid-glass-card rounded-2xl p-5"
      aria-labelledby="heading-fundamental-matrix"
    >
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 pb-3 mb-3.5 border-b border-slate-200/80">
        <div className="min-w-0">
          <h2
            id="heading-fundamental-matrix"
            className="text-base font-semibold text-slate-900 tracking-tight"
          >
            02 · Expected Semesters
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mean semesters spent in each state before graduation or dropout.
          </p>
        </div>
        <span className="font-mono-tabular text-xs font-medium text-sky-700 bg-sky-50/90 border border-sky-200/80 px-2.5 py-1 rounded-md whitespace-nowrap shrink-0">
          N = (I − Q)⁻¹
        </span>
      </div>

      {!computation ? (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3"
        >
          <span>
            Matrix (I − Q) is non-absorbing. Adjust probabilities or reset.
          </span>
          <button
            type="button"
            onClick={onResetBaseline}
            className="px-3 py-1 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Reset Baseline
          </button>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="text-left pl-3 pr-2 py-2 bg-slate-100/80 text-slate-600 font-medium border-b border-slate-200">
                  Start State
                </th>
                <th className="px-2 py-2 bg-slate-100/80 text-slate-600 font-medium text-center border-b border-slate-200">
                  In S1
                </th>
                <th className="px-2 py-2 bg-slate-100/80 text-slate-600 font-medium text-center border-b border-slate-200">
                  In S2
                </th>
                <th className="px-2 py-2 bg-slate-100/80 text-slate-600 font-medium text-center border-b border-slate-200">
                  In S3
                </th>
                <th className="px-2 py-2 bg-amber-50/80 text-amber-800 font-medium text-center border-b border-slate-200">
                  In S4
                </th>
                <th className="px-2.5 py-2 bg-sky-50/80 text-sky-800 font-medium text-center border-b border-slate-200">
                  Total (t)
                </th>
              </tr>
            </thead>
            <tbody>
              {STATES.map((st, i) => {
                const rowN = computation.N[i];
                const totalT = computation.expectedSemesters[i];

                return (
                  <tr
                    key={st.code}
                    className={
                      st.isStress
                        ? 'bg-amber-50/40'
                        : 'hover:bg-slate-50/80'
                    }
                  >
                    <td
                      className={`text-left pl-3 pr-2 py-2 border-b border-slate-200/70 font-medium ${
                        st.isStress ? 'text-amber-900' : 'text-slate-800'
                      }`}
                    >
                      {st.code} · {st.name}
                    </td>
                    {rowN.map((val, j) => {
                      const isDiag = i === j;
                      return (
                        <td
                          key={j}
                          className={`px-2 py-2 border-b border-slate-200/70 text-center font-mono-tabular ${
                            isDiag
                              ? 'bg-sky-50/90 text-sky-800 font-semibold'
                              : 'text-slate-600'
                          }`}
                        >
                          {val.toFixed(2)}
                        </td>
                      );
                    })}
                    <td
                      className={`px-2.5 py-2 border-b border-slate-200/70 border-l border-l-slate-200 text-center font-mono-tabular font-semibold ${
                        st.isStress
                          ? 'bg-amber-100/60 text-amber-900'
                          : 'bg-slate-50/80 text-slate-900'
                      }`}
                    >
                      {totalT.toFixed(2)} sem
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
