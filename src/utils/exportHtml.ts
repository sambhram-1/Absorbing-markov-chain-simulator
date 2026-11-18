import { ScenarioKey, SCENARIOS, STATES, computeMarkovChain } from './markov';

/**
 * Generates a 100% standalone, zero-dependency offline .HTML file
 * initialized with the user's current transition matrix and active scenario.
 */
export function buildStandaloneHtml(
  currentMatrix: number[][],
  activeScenarioKey: ScenarioKey
): string {
  const serializedMatrix = JSON.stringify(currentMatrix);
  const serializedScenarios = JSON.stringify(SCENARIOS);
  const serializedStates = JSON.stringify(STATES);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Absorbing Markov Chain Simulator: Student Graduation & Financial Stress Model</title>
  <style>
    :root {
      --bg-canvas: #F8FAFC;
      --bg-card: #FFFFFF;
      --bg-subtle: #F1F5F9;
      --navy-900: #0F172A;
      --navy-800: #1E293B;
      --navy-700: #334155;
      --text-muted: #64748B;
      --border-light: #E2E8F0;
      --border-med: #CBD5E1;
      --emerald-600: #059669;
      --emerald-700: #047857;
      --emerald-50: #ECFDF5;
      --emerald-200: #A7F3D0;
      --crimson-600: #DC2626;
      --crimson-700: #B91C1C;
      --crimson-50: #FEF2F2;
      --crimson-200: #FECACA;
      --amber-600: #D97706;
      --amber-700: #B45309;
      --amber-50: #FFFBEB;
      --amber-200: #FDE68A;
      --blue-600: #2563EB;
      --blue-700: #1D4ED8;
      --blue-50: #EFF6FF;
      --blue-200: #BFDBFE;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font-sans); background: var(--bg-canvas); color: var(--navy-900); line-height: 1.45; }
    .topbar { background: #0F172A; color: #FFF; padding: 16px 28px; border-bottom: 3px solid var(--blue-600); display: flex; justify-content: space-between; align-items: center; }
    .container { max-width: 1480px; margin: 0 auto; padding: 20px 24px; }
    .grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 18px; }
    .card { background: #FFF; border: 1px solid var(--border-light); border-radius: 12px; padding: 18px; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { padding: 8px; border-bottom: 1px solid var(--border-light); text-align: center; font-family: var(--font-mono); }
  </style>
</head>
<body>
  <header class="topbar">
    <div>
      <h1 style="font-size:1.25rem;font-weight:800;">Absorbing Markov Chain Simulator: Student Graduation & Financial Stress Model</h1>
      <p style="font-size:0.82rem;color:#94A3B8;">Exported Snapshot • Active Mode: ${activeScenarioKey.toUpperCase()} • P = [Q | R], N = (I - Q)^(-1), B = N · R</p>
    </div>
  </header>
  <main class="container">
    <div class="card">
      <h2 style="margin-bottom:10px;font-size:1rem;">Exported Transition Matrix P = [Q | R]</h2>
      <pre style="font-family:var(--font-mono);font-size:0.85rem;background:#F1F5F9;padding:12px;border-radius:8px;">${JSON.stringify(currentMatrix, null, 2)}</pre>
    </div>
  </main>
  <script>
    window.EXPORTED_STATES = ${serializedStates};
    window.EXPORTED_SCENARIOS = ${serializedScenarios};
    window.EXPORTED_MATRIX = ${serializedMatrix};
  </script>
</body>
</html>`;
}

export function buildCsvReport(
  matrix: number[][],
  activeScenarioKey: ScenarioKey
): string {
  const res = computeMarkovChain(matrix);
  const lines: string[] = [];
  lines.push(`# Absorbing Markov Chain Simulator Report (${activeScenarioKey})`);
  lines.push('');
  lines.push('SECTION 1: Transition Matrix P = [Q | R]');
  lines.push('From State,To S1 (High GPA),To S2 (Mid GPA),To S3 (Low GPA),To S4 (Fin Stress),To Graduate (A1),To Dropout (A2)');
  STATES.forEach((st, i) => {
    lines.push(`${st.short},${matrix[i].map((v) => v.toFixed(4)).join(',')}`);
  });

  if (res) {
    lines.push('');
    lines.push('SECTION 2: Fundamental Matrix N = (I - Q)^(-1) and Expected Semesters (t)');
    lines.push('Starting State,Sem in S1,Sem in S2,Sem in S3,Sem in S4,Total Expected Semesters (t)');
    STATES.forEach((st, i) => {
      lines.push(
        `${st.short},${res.N[i].map((v) => v.toFixed(4)).join(',')},${res.expectedSemesters[i].toFixed(4)}`
      );
    });

    lines.push('');
    lines.push('SECTION 3: Long-Run Absorption Probabilities B = N * R');
    lines.push('Starting State,Graduation Probability (A1),Dropout Probability (A2)');
    STATES.forEach((st, i) => {
      lines.push(
        `${st.short},${res.B[i][0].toFixed(4)},${res.B[i][1].toFixed(4)}`
      );
    });
  }

  return lines.join('\n');
}
