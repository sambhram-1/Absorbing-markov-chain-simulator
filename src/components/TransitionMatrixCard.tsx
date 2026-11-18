import React from 'react';
import {
  STATES,
  SCENARIOS,
  getRowSum,
  isRowSumValid,
} from '../utils/markov';

interface TransitionMatrixCardProps {
  matrix: number[][];
  onCellChange: (rowIdx: number, colIdx: number, value: number) => void;
  onNormalizeRow: (rowIdx: number) => void;
  onNormalizeAll: () => void;
}

const MINIMAL_STATE_HINTS = [
  'GPA ≥ 3.0',
  'GPA 2.0–2.9',
  'GPA < 2.0',
  'Aid Hold',
];

export const TransitionMatrixCard: React.FC<TransitionMatrixCardProps> = ({
  matrix,
  onCellChange,
  onNormalizeRow,
  onNormalizeAll,
}) => {
  const baseMatrix = SCENARIOS.baseline.matrix;
  const anyRowInvalid = matrix.some((row) => !isRowSumValid(row));

  return (
    <section
      id="transition-matrix"
      className="liquid-glass-card rounded-2xl p-5"
      aria-labelledby="heading-transition-matrix"
    >
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 pb-3 mb-3.5 border-b border-slate-200/80">
        <div className="min-w-0">
          <h2
            id="heading-transition-matrix"
            className="text-base font-semibold text-slate-900 tracking-tight"
          >
            01 · Transition Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Edit any cell to update long-run outcomes and 3D conduits.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {anyRowInvalid && (
            <button
              type="button"
              onClick={onNormalizeAll}
              className="px-2.5 py-1 text-xs font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Normalize All
            </button>
          )}
          <span className="font-mono-tabular text-xs font-medium text-sky-700 bg-sky-50/90 border border-sky-200/80 px-2.5 py-1 rounded-md whitespace-nowrap shrink-0">
            P = [Q | R]
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="text-left pl-3 pr-2 py-2 bg-slate-100/80 text-slate-600 font-medium rounded-tl-lg border-b border-slate-200 min-w-[148px]">
                From State
              </th>
              <th className="px-1.5 py-2 bg-slate-100/80 text-slate-600 font-medium text-center border-b border-slate-200">
                S1
                <span className="block font-normal text-slate-400 text-[10px]">High</span>
              </th>
              <th className="px-1.5 py-2 bg-slate-100/80 text-slate-600 font-medium text-center border-b border-slate-200">
                S2
                <span className="block font-normal text-slate-400 text-[10px]">Mid</span>
              </th>
              <th className="px-1.5 py-2 bg-slate-100/80 text-slate-600 font-medium text-center border-b border-slate-200">
                S3
                <span className="block font-normal text-slate-400 text-[10px]">Low</span>
              </th>
              <th className="px-1.5 py-2 bg-amber-50/80 text-amber-800 font-medium text-center border-b border-slate-200">
                S4
                <span className="block font-normal text-amber-600/80 text-[10px]">Stress</span>
              </th>
              <th className="px-1.5 py-2 bg-emerald-50/80 text-emerald-800 font-medium text-center border-l border-l-slate-200 border-b border-slate-200">
                Grad
                <span className="block font-normal text-emerald-600/80 text-[10px]">A1</span>
              </th>
              <th className="px-1.5 py-2 bg-rose-50/80 text-rose-800 font-medium text-center border-b border-slate-200">
                Drop
                <span className="block font-normal text-rose-600/80 text-[10px]">A2</span>
              </th>
              <th className="px-2 py-2 bg-slate-100/80 text-slate-600 font-medium text-center rounded-tr-lg border-b border-slate-200 min-w-[86px]">
                Sum
              </th>
            </tr>
          </thead>
          <tbody>
            {STATES.map((st, rIdx) => {
              const row = matrix[rIdx];
              const sum = getRowSum(row);
              const valid = isRowSumValid(row);

              return (
                <tr
                  key={st.code}
                  className={
                    rIdx === 3
                      ? 'bg-amber-50/35 hover:bg-amber-50/60'
                      : 'hover:bg-slate-50/80'
                  }
                >
                  <td className="text-left pl-2.5 pr-2 py-2 border-b border-slate-200/70 align-middle">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800 text-xs">
                      <span
                        className={`font-mono-tabular text-[11px] font-semibold px-1.5 py-0.5 rounded border ${
                          st.isStress
                            ? 'bg-amber-100/80 text-amber-800 border-amber-300/80'
                            : 'bg-sky-100/80 text-sky-800 border-sky-200'
                        }`}
                      >
                        {st.code}
                      </span>
                      <span>{st.name}</span>
                    </div>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      {MINIMAL_STATE_HINTS[rIdx]}
                    </span>
                  </td>

                  {row.map((cellVal, cIdx) => {
                    const isEdited =
                      Math.abs(cellVal - baseMatrix[rIdx][cIdx]) > 0.0001;
                    const colNames = [
                      'To S1 (High GPA)',
                      'To S2 (Mid GPA)',
                      'To S3 (Low GPA)',
                      'To S4 (Financial Stress)',
                      'To Graduate (A1)',
                      'To Dropout (A2)',
                    ];

                    let inputColorCls =
                      'bg-white/90 border-slate-200 text-slate-800';
                    if (cIdx === 4) {
                      inputColorCls =
                        'bg-emerald-50/70 border-emerald-200 text-emerald-800';
                    } else if (cIdx === 5) {
                      inputColorCls =
                        'bg-rose-50/70 border-rose-200 text-rose-800';
                    }

                    if (isEdited) {
                      inputColorCls +=
                        ' ring-2 ring-amber-400/50 border-amber-400';
                    }

                    return (
                      <td
                        key={cIdx}
                        className={`px-1 py-1.5 border-b border-slate-200/70 text-center align-middle ${
                          cIdx === 4 ? 'border-l border-l-slate-200' : ''
                        }`}
                      >
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          aria-label={`${st.short} ${colNames[cIdx]}`}
                          value={Number.isNaN(cellVal) ? '' : cellVal}
                          onChange={(e) => {
                            const raw = parseFloat(e.target.value);
                            const clamped = Number.isNaN(raw)
                              ? 0
                              : Math.max(0, Math.min(1, raw));
                            onCellChange(rIdx, cIdx, clamped);
                          }}
                          className={`w-14 py-1 px-1 text-center font-mono-tabular text-xs font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all ${inputColorCls}`}
                        />
                      </td>
                    );
                  })}

                  <td className="px-2 py-1.5 border-b border-slate-200/70 text-center align-middle">
                    {valid ? (
                      <span className="inline-flex items-center justify-center font-mono-tabular text-xs font-medium text-emerald-600">
                        1.00
                      </span>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-mono-tabular text-[11px] font-medium text-amber-600">
                          {sum.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onNormalizeRow(rIdx)}
                          className="px-1.5 py-0.5 text-[10px] font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Fix
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
