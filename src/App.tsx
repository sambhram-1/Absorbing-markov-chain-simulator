import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  STATES,
  SCENARIOS,
  ScenarioKey,
  cloneMatrix,
  computeMarkovChain,
  isRowSumValid,
  normalizeMatrixRow,
  sampleNextState,
  runMonteCarloSimulation,
  MonteCarloSummary,
} from './utils/markov';
import { buildStandaloneHtml, buildCsvReport } from './utils/exportHtml';
import { TransitionMatrixCard } from './components/TransitionMatrixCard';
import { FundamentalMatrixCard } from './components/FundamentalMatrixCard';
import { OutcomeOddsCard } from './components/OutcomeOddsCard';
import { StateDiagramSimulatorCard } from './components/StateDiagramSimulatorCard';
import { CohortPolicyImpactSection } from './components/CohortPolicyImpactSection';

const GENERATED_BG_PATH =
  '/src/assets/images/bg_light_liquid_glass_1795010281227.jpg';

const MINIMAL_SCENARIO_SUMMARY: Record<ScenarioKey, { title: string; summary: string }> = {
  baseline: {
    title: 'Baseline',
    summary: 'Empirical retention benchmark without active policy intervention.',
  },
  grant: {
    title: 'Micro-Grant',
    summary: 'Clears S4 tuition holds, shifting 20% dropout risk into Mid GPA.',
  },
  tutoring: {
    title: 'Tutoring',
    summary: 'Early S3 academic coaching lifts recovery into Mid GPA by +18%.',
  },
  holistic: {
    title: 'Holistic',
    summary: 'Combines S4 micro-grants and S3 tutoring for maximum retention.',
  },
  custom: {
    title: 'Custom',
    summary: 'Live custom probability matrix. Keep each row sum at 1.00.',
  },
};

export default function App() {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('baseline');
  const [matrix, setMatrix] = useState<number[][]>(() =>
    cloneMatrix(SCENARIOS.baseline.matrix)
  );
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number>(3);
  const [simStartIdx, setSimStartIdx] = useState<number>(3);
  const [journeyHistory, setJourneyHistory] = useState<number[]>([3]);
  const [isAutoRunning, setIsAutoRunning] = useState<boolean>(false);
  const [mcSummary, setMcSummary] = useState<MonteCarloSummary | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [bgLoaded, setBgLoaded] = useState<boolean>(true);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 2800);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const baselineComputation = useMemo(
    () => computeMarkovChain(SCENARIOS.baseline.matrix)!,
    []
  );

  const currentComputation = useMemo(
    () => computeMarkovChain(matrix),
    [matrix]
  );

  const anyRowInvalid = useMemo(
    () => matrix.some((row) => !isRowSumValid(row)),
    [matrix]
  );

  const handleSelectScenario = (key: Exclude<ScenarioKey, 'custom'>) => {
    const sc = SCENARIOS[key];
    setScenarioKey(key);
    setMatrix(cloneMatrix(sc.matrix));
    setIsAutoRunning(false);
    setJourneyHistory([simStartIdx]);
    setSelectedNodeIndex(simStartIdx);
    setMcSummary(null);
  };

  const handleCellChange = (rowIdx: number, colIdx: number, value: number) => {
    setMatrix((prev) => {
      const next = cloneMatrix(prev);
      next[rowIdx][colIdx] = value;
      return next;
    });
    setScenarioKey('custom');
  };

  const handleNormalizeRow = (rowIdx: number) => {
    setMatrix((prev) => {
      const next = cloneMatrix(prev);
      next[rowIdx] = normalizeMatrixRow(next[rowIdx]);
      return next;
    });
    showToast(`Row ${STATES[rowIdx].code} normalized to 1.00`);
  };

  const handleNormalizeAll = () => {
    setMatrix((prev) => prev.map((row) => normalizeMatrixRow(row)));
    showToast('All rows normalized to 1.00');
  };

  const handleStepSemester = useCallback(() => {
    setJourneyHistory((prev) => {
      const curr = prev[prev.length - 1];
      if (curr >= 4) {
        setIsAutoRunning(false);
        return prev;
      }
      const nextState = sampleNextState(matrix, curr);
      if (nextState < 4) {
        setSelectedNodeIndex(nextState);
      } else {
        setIsAutoRunning(false);
      }
      const updated = [...prev, nextState];
      if (updated.length > 28) {
        setIsAutoRunning(false);
      }
      return updated;
    });
  }, [matrix]);

  useEffect(() => {
    if (!isAutoRunning) return;
    const timer = setInterval(() => {
      handleStepSemester();
    }, 450);
    return () => clearInterval(timer);
  }, [isAutoRunning, handleStepSemester]);

  const handleToggleAutoRun = () => {
    if (isAutoRunning) {
      setIsAutoRunning(false);
      return;
    }
    const curr = journeyHistory[journeyHistory.length - 1];
    if (curr >= 4) {
      setJourneyHistory([simStartIdx]);
      setSelectedNodeIndex(simStartIdx);
    }
    setIsAutoRunning(true);
  };

  const handleResetSim = () => {
    setIsAutoRunning(false);
    setJourneyHistory([simStartIdx]);
    setSelectedNodeIndex(simStartIdx);
  };

  const handleChangeSimStart = (newStartIdx: number) => {
    setIsAutoRunning(false);
    setSimStartIdx(newStartIdx);
    setJourneyHistory([newStartIdx]);
    setSelectedNodeIndex(newStartIdx);
  };

  const handleRunMonteCarlo = () => {
    const summary = runMonteCarloSimulation(matrix, simStartIdx, 1000);
    setMcSummary(summary);
  };

  useEffect(() => {
    if (!mcSummary || !currentComputation) return;
    const startIdx = mcSummary.startStateIdx;
    const theoryGradPct = currentComputation.B[startIdx][0] * 100;
    const theoryDropPct = currentComputation.B[startIdx][1] * 100;
    const theoryAvgSemesters = currentComputation.expectedSemesters[startIdx];
    setMcSummary((prev) =>
      prev
        ? {
            ...prev,
            theoryGradPct,
            theoryDropPct,
            theoryAvgSemesters,
            variancePct: Math.abs(prev.simGradPct - theoryGradPct),
          }
        : null
    );
  }, [currentComputation, mcSummary?.startStateIdx]);

  const handleDownloadHtml = () => {
    try {
      const htmlContent = buildStandaloneHtml(matrix, scenarioKey);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Student_Graduation_Markov_Simulator.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Downloaded standalone HTML file');
    } catch {
      showToast('Unable to trigger HTML download');
    }
  };

  const handleExportCsv = () => {
    try {
      const csvContent = buildCsvReport(matrix, scenarioKey);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Markov_Retention_Model_${scenarioKey}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Exported CSV report');
    } catch {
      showToast('Unable to trigger CSV download');
    }
  };

  const activeInfo = MINIMAL_SCENARIO_SUMMARY[scenarioKey];

  return (
    <div className="relative min-h-screen flex flex-col bg-[#F4F7FB] text-slate-800">
      {/* Soft Daylight Frosted Liquid Glass Backdrop */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#F8FAFC] via-[#EFF5FC] to-[#F3F7FA]" />
        {bgLoaded && (
          <img
            src={GENERATED_BG_PATH}
            alt="Daylight liquid glass caustic backdrop"
            referrerPolicy="no-referrer"
            onError={() => setBgLoaded(false)}
            className="w-full h-full object-cover opacity-55"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-[#F4F7FB]/85" />
      </div>

      {/* 1. Minimal 3-Zone Top Navigation Bar */}
      <header className="relative z-10 liquid-glass-header px-6 py-3 flex items-center justify-between gap-6">
        <a
          href="#transition-matrix"
          className="text-base font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          Markov Retention Studio
        </a>

        <nav
          aria-label="Simulator sections"
          className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-500"
        >
          <a
            href="#transition-matrix"
            className="hover:text-sky-600 transition-colors whitespace-nowrap shrink-0"
          >
            Matrix
          </a>
          <a
            href="#fundamental-matrix"
            className="hover:text-sky-600 transition-colors whitespace-nowrap shrink-0"
          >
            Duration
          </a>
          <a
            href="#absorption-outcomes"
            className="hover:text-sky-600 transition-colors whitespace-nowrap shrink-0"
          >
            Outcomes
          </a>
          <a
            href="#state-simulator"
            className="hover:text-sky-600 transition-colors whitespace-nowrap shrink-0"
          >
            3D Stage
          </a>
          <a
            href="#cohort-projection"
            className="hover:text-sky-600 transition-colors whitespace-nowrap shrink-0"
          >
            Cohort
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleDownloadHtml}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white/90 hover:bg-white border border-slate-200/90 rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            Export HTML
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 flex-1">
        {/* Minimal Unboxed Formula & Scenario Metadata Strip */}
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-700">
              Student Graduation &amp; Stress Model
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular text-sky-700">P = [Q | R]</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular text-sky-700">N = (I − Q)⁻¹</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular text-sky-700">B = N · R</span>
          </div>
          <div className="text-slate-500">
            Preset:{' '}
            <span className="font-semibold text-slate-800">
              {activeInfo.title}
            </span>
          </div>
        </div>

        {/* 2. Minimal Scenario Selector Bar */}
        <section
          aria-label="Policy Scenarios"
          className="liquid-glass-card rounded-2xl px-4 py-3 mb-5 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-900">
              Scenario
            </span>
            <span className="text-slate-300" aria-hidden="true">|</span>
            <p className="text-xs text-slate-500">
              {activeInfo.summary}
            </p>
          </div>

          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Policy Scenario Presets"
          >
            {(
              [
                {
                  key: 'baseline',
                  label: 'Baseline',
                  activeCls: 'bg-slate-900 text-white border-slate-900 shadow-xs',
                },
                {
                  key: 'grant',
                  label: 'Micro-Grant',
                  activeCls: 'bg-amber-500 text-white border-amber-500 shadow-xs',
                },
                {
                  key: 'tutoring',
                  label: 'Tutoring',
                  activeCls: 'bg-sky-600 text-white border-sky-600 shadow-xs',
                },
                {
                  key: 'holistic',
                  label: 'Holistic',
                  activeCls: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
                },
              ] as const
            ).map((btn) => {
              const isActive = scenarioKey === btn.key;
              return (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => handleSelectScenario(btn.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? btn.activeCls
                      : 'bg-white/80 text-slate-600 border-slate-200/90 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Main Two-Column Analytical Workspace */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Left Column: Matrix Inputs P = [Q | R] & Fundamental Matrix N */}
          <div className="xl:col-span-7 flex flex-col gap-5">
            <TransitionMatrixCard
              matrix={matrix}
              onCellChange={handleCellChange}
              onNormalizeRow={handleNormalizeRow}
              onNormalizeAll={handleNormalizeAll}
            />

            <FundamentalMatrixCard
              computation={currentComputation}
              onResetBaseline={() => handleSelectScenario('baseline')}
            />
          </div>

          {/* Right Column: Final Outcome Odds B = N*R & 3D Liquid Glass Stage */}
          <div className="xl:col-span-5 flex flex-col gap-5">
            <OutcomeOddsCard
              computation={currentComputation}
              baselineComputation={baselineComputation}
              anyRowInvalid={anyRowInvalid}
              onNormalizeAll={handleNormalizeAll}
            />

            <StateDiagramSimulatorCard
              matrix={matrix}
              selectedNodeIndex={selectedNodeIndex}
              onSelectNode={setSelectedNodeIndex}
              simStartIdx={simStartIdx}
              onChangeSimStart={handleChangeSimStart}
              journeyHistory={journeyHistory}
              isAutoRunning={isAutoRunning}
              onStepSemester={handleStepSemester}
              onToggleAutoRun={handleToggleAutoRun}
              onResetSim={handleResetSim}
              onRunMonteCarlo={handleRunMonteCarlo}
              mcSummary={mcSummary}
            />
          </div>
        </div>

        {/* 4. Multi-Semester Cohort Flow & ROI Section */}
        <CohortPolicyImpactSection
          matrix={matrix}
          computation={currentComputation}
          baselineComputation={baselineComputation}
          onExportCsv={handleExportCsv}
        />
      </main>

      {/* Minimal Quiet Footer */}
      <footer className="relative z-10 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-4 border-t border-slate-200/70 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span>
          UCI Retention Dataset (N = 4,424) · NCES Benchmarks · Lumina Financial Stress Study
        </span>
        <span>
          Absorbing Markov Chain Studio
        </span>
      </footer>

      {/* Non-blocking Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-6 bg-white/95 text-slate-800 px-4 py-2 rounded-lg text-xs font-medium shadow-lg border border-slate-200 z-50"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
