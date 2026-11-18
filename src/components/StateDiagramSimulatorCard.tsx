import React, { useState } from 'react';
import {
  STATES,
  MonteCarloSummary,
} from '../utils/markov';
import { Markov3DArtifactCanvas } from './Markov3DArtifactCanvas';

interface StateDiagramSimulatorCardProps {
  matrix: number[][];
  selectedNodeIndex: number;
  onSelectNode: (idx: number) => void;
  simStartIdx: number;
  onChangeSimStart: (idx: number) => void;
  journeyHistory: number[];
  isAutoRunning: boolean;
  onStepSemester: () => void;
  onToggleAutoRun: () => void;
  onResetSim: () => void;
  onRunMonteCarlo: () => void;
  mcSummary: MonteCarloSummary | null;
}

const NODE_COORDS = [
  { x: 95, y: 74, code: 'S1', label: 'High GPA', fill: '#E0F2FE', stroke: '#0284C7', text: '#0C4A6E' },
  { x: 245, y: 74, code: 'S2', label: 'Mid GPA', fill: '#DBEAFE', stroke: '#2563EB', text: '#1E3A8A' },
  { x: 395, y: 74, code: 'S3', label: 'Low GPA', fill: '#E0E7FF', stroke: '#4F46E5', text: '#312E81' },
  { x: 545, y: 74, code: 'S4', label: 'Fin. Stress', fill: '#FEF3C7', stroke: '#D97706', text: '#78350F' },
];

const ABSORBING_COORDS = [
  { x: 215, y: 222, code: 'A1', label: 'Graduate', fill: '#D1FAE5', stroke: '#059669', text: '#065F46' },
  { x: 425, y: 222, code: 'A2', label: 'Dropout', fill: '#FFE4E6', stroke: '#E11D48', text: '#881337' },
];

export const StateDiagramSimulatorCard: React.FC<StateDiagramSimulatorCardProps> = ({
  matrix,
  selectedNodeIndex,
  onSelectNode,
  simStartIdx,
  onChangeSimStart,
  journeyHistory,
  isAutoRunning,
  onStepSemester,
  onToggleAutoRun,
  onResetSim,
  onRunMonteCarlo,
  mcSummary,
}) => {
  const [stageMode, setStageMode] = useState<'3d' | '2d'>('3d');

  const activeSimNode = journeyHistory[journeyHistory.length - 1];
  const isAbsorbed = activeSimNode >= 4;
  const focusIdx = selectedNodeIndex;
  const selectedState = STATES[focusIdx];
  const selectedRow = matrix[focusIdx];

  return (
    <section
      id="state-simulator"
      className="liquid-glass-card rounded-2xl p-5"
      aria-labelledby="heading-state-simulator"
    >
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 pb-3 mb-3.5 border-b border-slate-200/80">
        <div className="min-w-0">
          <h2
            id="heading-state-simulator"
            className="text-base font-semibold text-slate-900 tracking-tight"
          >
            04 · 3D State Network
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Orbit the 3D glass stage or simulate student paths.
          </p>
        </div>

        {/* 3D / 2D Stage Mode Segmented Switcher */}
        <div
          className="flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/90 rounded-lg shrink-0"
          role="group"
          aria-label="Visual Stage Mode"
        >
          <button
            type="button"
            onClick={() => setStageMode('3d')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              stageMode === '3d'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            3D Stage
          </button>
          <button
            type="button"
            onClick={() => setStageMode('2d')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              stageMode === '2d'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            2D Graph
          </button>
        </div>
      </div>

      {/* Minimal Node Inspector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-medium text-slate-500">
          Inspect State:
        </span>
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Inspect state node"
        >
          {STATES.map((st, idx) => {
            const isSelected = focusIdx === idx;
            return (
              <button
                key={st.code}
                type="button"
                onClick={() => onSelectNode(idx)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? st.isStress
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white/80 text-slate-600 border-slate-200 hover:bg-white hover:text-slate-900'
                }`}
              >
                {st.code} · {st.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D WebGL Stage OR 2D SVG Schematic */}
      {stageMode === '3d' ? (
        <Markov3DArtifactCanvas
          matrix={matrix}
          selectedNodeIndex={selectedNodeIndex}
          activeSimNode={activeSimNode}
          onSelectNode={onSelectNode}
        />
      ) : (
        <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-2.5 mb-3">
          <svg
            viewBox="0 0 640 265"
            className="w-full h-auto block select-none"
            aria-label="6-State Absorbing Markov Chain Network Diagram"
          >
            <defs>
              <marker
                id="arrow-gray"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#94A3B8" />
              </marker>
              <marker
                id="arrow-blue"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#0284C7" />
              </marker>
              <marker
                id="arrow-green"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
              </marker>
              <marker
                id="arrow-red"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#E11D48" />
              </marker>
            </defs>

            {/* 1. Self-loops above S1..S4 */}
            <g>
              {NODE_COORDS.map((n, i) => {
                const pSelf = matrix[i][i];
                const isFocused = focusIdx === i;
                const strokeColor = isFocused
                  ? i === 3
                    ? '#D97706'
                    : '#0284C7'
                  : '#94A3B8';
                const pathD = `M ${n.x - 14} ${n.y - 24} C ${n.x - 26} ${n.y - 58}, ${n.x + 26} ${n.y - 58}, ${n.x + 14} ${n.y - 24}`;

                return (
                  <g key={`self-${n.code}`}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isFocused ? 2.2 : 1.4}
                      opacity={isFocused ? 0.95 : 0.45}
                    />
                    {(isFocused || pSelf >= 0.3) && (
                      <text
                        x={n.x}
                        y={n.y - 52}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight="600"
                        fontFamily="monospace"
                        fill={isFocused ? strokeColor : '#64748B'}
                      >
                        {pSelf.toFixed(2)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* 2. Transient-to-Transient edges */}
            <g>
              {NODE_COORDS.map((src, i) =>
                NODE_COORDS.map((dst, j) => {
                  if (i === j) return null;
                  const prob = matrix[i][j];
                  if (prob <= 0.005) return null;
                  const isFocused = focusIdx === i;
                  if (!isFocused && Math.abs(i - j) > 1) return null;

                  const dir = j > i ? 1 : -1;
                  const dist = Math.abs(j - i);
                  const curveLift = dir * (16 + (dist - 1) * 16);
                  const midX = (src.x + dst.x) / 2;
                  const midY = src.y - curveLift;

                  const x1 = src.x + dir * 26;
                  const y1 = src.y - dir * 6;
                  const x2 = dst.x - dir * 28;
                  const y2 = dst.y - dir * 6;

                  return (
                    <g key={`edge-${i}-${j}`}>
                      <path
                        d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
                        fill="none"
                        stroke={isFocused ? '#0284C7' : '#CBD5E1'}
                        strokeWidth={isFocused ? (1.5 + prob * 4).toFixed(1) : '1.3'}
                        opacity={isFocused ? 0.95 : 0.7}
                        markerEnd={isFocused ? 'url(#arrow-blue)' : 'url(#arrow-gray)'}
                      />
                      {isFocused && (
                        <text
                          x={midX}
                          y={midY + (dir > 0 ? -4 : 11)}
                          textAnchor="middle"
                          fontSize="10.5"
                          fontWeight="700"
                          fontFamily="monospace"
                          fill="#0369A1"
                        >
                          {prob.toFixed(2)}
                        </text>
                      )}
                    </g>
                  );
                })
              )}
            </g>

            {/* 3. Transient-to-Absorbing edges */}
            <g>
              {NODE_COORDS.map((src, i) => {
                const isFocused = focusIdx === i;
                const pGrad = matrix[i][4];
                const pDrop = matrix[i][5];
                const gradDst = ABSORBING_COORDS[0];
                const dropDst = ABSORBING_COORDS[1];

                return (
                  <g key={`abs-edges-${i}`}>
                    {pGrad > 0.005 && (
                      <>
                        <line
                          x1={src.x - 6}
                          y1={src.y + 27}
                          x2={gradDst.x + (i - 1.5) * 14}
                          y2={gradDst.y - 24}
                          stroke={isFocused ? '#059669' : '#A7F3D0'}
                          strokeWidth={isFocused ? (1.8 + pGrad * 5).toFixed(1) : '1.4'}
                          opacity={isFocused ? 0.95 : 0.75}
                          markerEnd={
                            isFocused ? 'url(#arrow-green)' : 'url(#arrow-gray)'
                          }
                        />
                        {isFocused && (
                          <text
                            x={(src.x + gradDst.x) / 2 - 14}
                            y={(src.y + gradDst.y) / 2 + 4}
                            fontSize="11"
                            fontWeight="700"
                            fontFamily="monospace"
                            fill="#047857"
                          >
                            {pGrad.toFixed(2)}
                          </text>
                        )}
                      </>
                    )}
                    {pDrop > 0.005 && (
                      <>
                        <line
                          x1={src.x + 6}
                          y1={src.y + 27}
                          x2={dropDst.x + (i - 1.5) * 14}
                          y2={dropDst.y - 24}
                          stroke={isFocused ? '#E11D48' : '#FECDD3'}
                          strokeWidth={isFocused ? (1.8 + pDrop * 5).toFixed(1) : '1.4'}
                          opacity={isFocused ? 0.95 : 0.75}
                          markerEnd={
                            isFocused ? 'url(#arrow-red)' : 'url(#arrow-gray)'
                          }
                        />
                        {isFocused && (
                          <text
                            x={(src.x + dropDst.x) / 2 + 12}
                            y={(src.y + dropDst.y) / 2 + 4}
                            fontSize="11"
                            fontWeight="700"
                            fontFamily="monospace"
                            fill="#BE123C"
                          >
                            {pDrop.toFixed(2)}
                          </text>
                        )}
                      </>
                    )}
                  </g>
                );
              })}
            </g>

            {/* 4. Transient Nodes S1..S4 */}
            <g>
              {NODE_COORDS.map((n, i) => {
                const isSelected = focusIdx === i;
                const isSimHere = activeSimNode === i;

                return (
                  <g
                    key={n.code}
                    onClick={() => onSelectNode(i)}
                    className="cursor-pointer"
                  >
                    {(isSelected || isSimHere) && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r="32"
                        fill="none"
                        stroke={isSimHere ? '#10B981' : n.stroke}
                        strokeWidth="2"
                        strokeDasharray={isSimHere ? undefined : '4 3'}
                      />
                    )}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r="26"
                      fill={n.fill}
                      stroke={n.stroke}
                      strokeWidth="2"
                    />
                    <text
                      x={n.x}
                      y={n.y - 2}
                      textAnchor="middle"
                      fill={n.text}
                      fontSize="13"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {n.code}
                    </text>
                    <text
                      x={n.x}
                      y={n.y + 12}
                      textAnchor="middle"
                      fill={n.text}
                      fontSize="8.5"
                      fontWeight="600"
                    >
                      {n.label}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* 5. Absorbing Nodes A1 & A2 */}
            <g>
              {ABSORBING_COORDS.map((a, idx) => {
                const absId = idx === 0 ? 4 : 5;
                const isReached = activeSimNode === absId;
                return (
                  <g key={a.code}>
                    {isReached && (
                      <rect
                        x={a.x - 68}
                        y={a.y - 25}
                        width="136"
                        height="50"
                        rx="12"
                        fill="none"
                        stroke={a.stroke}
                        strokeWidth="2.5"
                      />
                    )}
                    <rect
                      x={a.x - 62}
                      y={a.y - 20}
                      width="124"
                      height="40"
                      rx="9"
                      fill={a.fill}
                      stroke={a.stroke}
                      strokeWidth="2"
                    />
                    <text
                      x={a.x}
                      y={a.y + 4}
                      textAnchor="middle"
                      fill={a.text}
                      fontSize="12"
                      fontWeight="700"
                    >
                      {a.code} · {a.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      )}

      {/* Selected Node Outgoing Probabilities Strip */}
      <div className="bg-sky-50/70 border border-sky-200/80 rounded-lg px-3 py-2 text-xs text-slate-700 mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-sky-900">
          {selectedState.code} Outgoing:
        </span>
        <span className="font-mono-tabular text-[11px] text-slate-600">
          S1 <strong>{(selectedRow[0] * 100).toFixed(0)}%</strong> · S2{' '}
          <strong>{(selectedRow[1] * 100).toFixed(0)}%</strong> · S3{' '}
          <strong>{(selectedRow[2] * 100).toFixed(0)}%</strong> · S4{' '}
          <strong>{(selectedRow[3] * 100).toFixed(0)}%</strong> ·{' '}
          <span className="text-emerald-700">
            Grad <strong>{(selectedRow[4] * 100).toFixed(0)}%</strong>
          </span>{' '}
          ·{' '}
          <span className="text-rose-700">
            Drop <strong>{(selectedRow[5] * 100).toFixed(0)}%</strong>
          </span>
        </span>
      </div>

      {/* Live Student Journey & Monte Carlo Controls */}
      <div className="liquid-glass-subpanel rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          <label
            htmlFor="simStartSelect"
            className="text-xs font-medium text-slate-600"
          >
            Start:
          </label>
          <select
            id="simStartSelect"
            value={simStartIdx}
            onChange={(e) => onChangeSimStart(parseInt(e.target.value, 10))}
            className="px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-800 text-xs font-medium cursor-pointer"
          >
            <option value={0}>S1 · High GPA</option>
            <option value={1}>S2 · Mid GPA</option>
            <option value={2}>S3 · Low GPA</option>
            <option value={3}>S4 · Fin. Stress</option>
          </select>

          <button
            type="button"
            onClick={onStepSemester}
            disabled={isAbsorbed}
            className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
          >
            Step
          </button>

          <button
            type="button"
            onClick={onToggleAutoRun}
            className="px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
          >
            {isAutoRunning ? 'Pause' : 'Auto-Run'}
          </button>

          <button
            type="button"
            onClick={onResetSim}
            className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={onRunMonteCarlo}
            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
          >
            1,000 Trials
          </button>
        </div>

        {/* Live Student Semester Trail */}
        <div
          className="flex flex-wrap items-center gap-1.5 min-h-[34px] px-2.5 py-1.5 bg-white/80 border border-slate-200/80 rounded-lg text-xs"
          aria-live="polite"
        >
          {journeyHistory.map((stIdx, stepNum) => {
            let badgeCls = 'bg-sky-50 text-sky-800 border-sky-200';
            let text = '';
            if (stIdx < 4) {
              if (stIdx === 3) {
                badgeCls = 'bg-amber-50 text-amber-800 border-amber-200';
              }
              text = `Sem ${stepNum}: ${STATES[stIdx].code}`;
            } else if (stIdx === 4) {
              badgeCls = 'bg-emerald-600 text-white border-emerald-600';
              text = `Sem ${stepNum}: Graduated`;
            } else {
              badgeCls = 'bg-rose-600 text-white border-rose-600';
              text = `Sem ${stepNum}: Dropped Out`;
            }

            return (
              <React.Fragment key={`${stepNum}-${stIdx}`}>
                {stepNum > 0 && (
                  <span className="text-slate-300" aria-hidden="true">
                    →
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded font-mono-tabular text-[11px] font-medium border ${badgeCls}`}
                >
                  {text}
                </span>
              </React.Fragment>
            );
          })}
          {journeyHistory.length === 1 && (
            <span className="text-slate-400 text-[11px] ml-1">
              Click Step or Auto-Run
            </span>
          )}
        </div>

        {/* 1,000-Student Monte Carlo Comparison Box */}
        {mcSummary && (
          <div className="mt-2.5 bg-white/90 border border-emerald-200 rounded-lg p-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <span className="text-emerald-800 font-semibold">
                1,000 Trials ({STATES[mcSummary.startStateIdx].code})
              </span>
              <span className="font-mono-tabular text-[11px] text-emerald-700">
                Δ {mcSummary.variancePct.toFixed(1)}% vs. Theory
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-slate-50/90 p-2 rounded border border-slate-200/80">
                <div className="text-[10px] font-medium text-slate-400">
                  Simulated (N = 1,000)
                </div>
                <div className="font-mono-tabular text-xs font-semibold text-slate-800 mt-0.5">
                  {mcSummary.simGradPct.toFixed(1)}% Grad ·{' '}
                  {mcSummary.simDropPct.toFixed(1)}% Drop ·{' '}
                  {mcSummary.simAvgSemesters.toFixed(1)} sem
                </div>
              </div>
              <div className="bg-slate-50/90 p-2 rounded border border-slate-200/80">
                <div className="text-[10px] font-medium text-slate-400">
                  Exact Matrix (B = N · R)
                </div>
                <div className="font-mono-tabular text-xs font-semibold text-slate-800 mt-0.5">
                  {mcSummary.theoryGradPct.toFixed(1)}% Grad ·{' '}
                  {mcSummary.theoryDropPct.toFixed(1)}% Drop ·{' '}
                  {mcSummary.theoryAvgSemesters.toFixed(1)} sem
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
