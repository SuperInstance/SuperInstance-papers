/**
 * POLLN Game Theory Visualization Tools
 *
 * Generates visualizations for game-theoretic analysis:
 * - Strategy evolution over time
 * - Payoff matrices
 * - Nash equilibrium computation
 * - Reputation networks
 * - Social welfare tracking
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ============================================================================
// STRATEGY EVOLUTION VISUALIZATION
// ============================================================================

/**
 * Generate HTML visualization of strategy evolution
 */
export function visualizeStrategyEvolution(
  rounds: number[],
  strategyDistribution: Map<number, Map<string, number>>,
  outputPath: string
): void {
  const html = generateStrategyEvolutionHTML(rounds, strategyDistribution);
  writeFileSync(outputPath, html);
  console.log(`Strategy evolution visualization saved to ${outputPath}`);
}

function generateStrategyEvolutionHTML(
  rounds: number[],
  strategyDistribution: Map<number, Map<string, number>>
): string {
  const strategies = Array.from(strategyDistribution.values())[0].keys();
  const roundsWithData = Array.from(strategyDistribution.keys());

  return `<!DOCTYPE html>
<html>
<head>
  <title>POLLN Strategy Evolution</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #1a1a1a;
      color: #e0e0e0;
    }
    h1 {
      color: #4CAF50;
      text-align: center;
    }
    .chart-container {
      background-color: #2d2d2d;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .metric-card {
      background-color: #2d2d2d;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .metric-value {
      font-size: 2em;
      font-weight: bold;
      color: #4CAF50;
    }
    .metric-label {
      color: #888;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <h1>🧬 POLLN Strategy Evolution</h1>

  <div class="metrics">
    <div class="metric-card">
      <div class="metric-value">${roundsWithData.length}</div>
      <div class="metric-label">Total Rounds</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${strategies.length}</div>
      <div class="metric-label">Strategies</div>
    </div>
  </div>

  <div class="chart-container">
    <h2>Strategy Distribution Over Time</h2>
    <canvas id="strategyChart"></canvas>
  </div>

  <script>
    const ctx = document.getElementById('strategyChart').getContext('2d');
    const rounds = ${JSON.stringify(roundsWithData)};
    const datasets = ${JSON.stringify(Array.from(strategies).map(([strategy, color]) => ({
      label: strategy,
      data: roundsWithData.map(round => strategyDistribution.get(round)?.get(strategy) || 0),
      borderColor: getColor(strategy),
      backgroundColor: getColor(strategy, 0.2),
      tension: 0.4,
      fill: true
    })))};

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: rounds,
        datasets: datasets
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: '#e0e0e0'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#e0e0e0'
            },
            grid: {
              color: '#444'
            }
          },
          x: {
            ticks: {
              color: '#e0e0e0'
            },
            grid: {
              color: '#444'
            }
          }
        }
      }
    });

    function getColor(strategy, alpha = 1) {
      const colors = {
        'COOPERATE': \`rgba(76, 175, 80, \${alpha})\`,
        'DEFECT': \`rgba(244, 67, 54, \${alpha})\`,
        'TIT_FOR_TAT': \`rgba(33, 150, 243, \${alpha})\`,
        'GRIM_TRIGGER': \`rgba(156, 39, 176, \${alpha})\`,
        'RANDOM': \`rgba(158, 158, 158, \${alpha})\`
      };
      return colors[strategy] || \`rgba(255, 193, 7, \${alpha})\`;
    }
  </script>
</body>
</html>`;
}

// ============================================================================
// PAYOFF MATRIX VISUALIZATION
// ============================================================================

/**
 * Generate HTML visualization of payoff matrix
 */
export function visualizePayoffMatrix(
  matrix: Map<string, Map<string, [number, number]>>,
  player1Label: string,
  player2Label: string,
  outputPath: string
): void {
  const html = generatePayoffMatrixHTML(matrix, player1Label, player2Label);
  writeFileSync(outputPath, html);
  console.log(`Payoff matrix visualization saved to ${outputPath}`);
}

function generatePayoffMatrixHTML(
  matrix: Map<string, Map<string, [number, number]>>,
  player1Label: string,
  player2Label: string
): string {
  const strategies = Array.from(matrix.keys());

  return `<!DOCTYPE html>
<html>
<head>
  <title>Payoff Matrix</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #1a1a1a;
      color: #e0e0e0;
    }
    h1 {
      color: #4CAF50;
      text-align: center;
    }
    table {
      margin: 20px auto;
      border-collapse: collapse;
      background-color: #2d2d2d;
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      padding: 15px;
      text-align: center;
      border: 1px solid #444;
    }
    th {
      background-color: #383838;
      color: #4CAF50;
    }
    .payoff {
      font-weight: bold;
      font-size: 1.2em;
    }
    .player1 {
      color: #4CAF50;
    }
    .player2 {
      color: #2196F3;
    }
    .nash {
      background-color: rgba(76, 175, 80, 0.2);
      border: 2px solid #4CAF50;
    }
    .legend {
      text-align: center;
      margin: 20px 0;
    }
    .legend-item {
      display: inline-block;
      margin: 0 20px;
    }
    .legend-box {
      display: inline-block;
      width: 20px;
      height: 20px;
      margin-right: 5px;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <h1>🎮 Payoff Matrix: ${player1Label} vs ${player2Label}</h1>

  <div class="legend">
    <div class="legend-item">
      <span class="legend-box" style="background-color: rgba(76, 175, 80, 0.2); border: 2px solid #4CAF50;"></span>
      Nash Equilibrium
    </div>
    <div class="legend-item">
      <span class="legend-box" style="background-color: #4CAF50;"></span>
      Player 1 Payoff
    </div>
    <div class="legend-item">
      <span class="legend-box" style="background-color: #2196F3;"></span>
      Player 2 Payoff
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${player1Label} \\ ${player2Label}</th>
        ${strategies.map(s => `<th>${s}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${strategies.map(rowStrategy => `
        <tr>
          <th>${rowStrategy}</th>
          ${strategies.map(colStrategy => {
            const payoff = matrix.get(rowStrategy)?.get(colStrategy);
            const isNash = checkNashEquilibrium(matrix, rowStrategy, colStrategy);
            return `
              <td class="${isNash ? 'nash' : ''}">
                <div class="payoff">
                  <span class="player1">${payoff?.[0]}</span>,
                  <span class="player2">${payoff?.[1]}</span>
                </div>
              </td>
            `;
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>

  <script>
    function checkNashEquilibrium(matrix, rowStrategy, colStrategy) {
      // Check if (rowStrategy, colStrategy) is a Nash equilibrium
      const currentPayoff = matrix.get(rowStrategy).get(colStrategy)[0];

      // Check if player 1 can do better by switching
      for (const [otherRow, row] of matrix) {
        if (otherRow !== rowStrategy) {
          if (row.get(colStrategy)[0] > currentPayoff) {
            return false;
          }
        }
      }

      // Check if player 2 can do better by switching
      const currentPayoff2 = matrix.get(rowStrategy).get(colStrategy)[1];
      for (const [otherCol, col] of matrix.get(rowStrategy)) {
        if (otherCol !== colStrategy) {
          if (col[1] > currentPayoff2) {
            return false;
          }
        }
      }

      return true;
    }
  </script>
</body>
</html>`;
}

function checkNashEquilibrium(
  matrix: Map<string, Map<string, [number, number]>>,
  rowStrategy: string,
  colStrategy: string
): boolean {
  const currentPayoff = matrix.get(rowStrategy)?.get(colStrategy)?.[0] || 0;

  // Check if player 1 can do better by switching
  for (const [otherRow, row] of matrix) {
    if (otherRow !== rowStrategy) {
      if ((row.get(colStrategy)?.[0] || 0) > currentPayoff) {
        return false;
      }
    }
  }

  // Check if player 2 can do better by switching
  const currentPayoff2 = matrix.get(rowStrategy)?.get(colStrategy)?.[1] || 0;
  for (const [otherCol, payoff] of matrix.get(rowStrategy) || new Map()) {
    if (otherCol !== colStrategy) {
      if (payoff[1] > currentPayoff2) {
        return false;
      }
    }
  }

  return true;
}

// ============================================================================
// REPUTATION NETWORK VISUALIZATION
// ============================================================================

/**
 * Generate HTML visualization of reputation network
 */
export function visualizeReputationNetwork(
  nodes: string[],
  edges: Array<{ source: string; target: string; weight: number }>,
  reputations: Map<string, number>,
  outputPath: string
): void {
  const html = generateReputationNetworkHTML(nodes, edges, reputations);
  writeFileSync(outputPath, html);
  console.log(`Reputation network visualization saved to ${outputPath}`);
}

function generateReputationNetworkHTML(
  nodes: string[],
  edges: Array<{ source: string; target: string; weight: number }>,
  reputations: Map<string, number>
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Reputation Network</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #1a1a1a;
      color: #e0e0e0;
    }
    h1 {
      color: #4CAF50;
      text-align: center;
      padding: 20px;
    }
    #network {
      width: 100vw;
      height: 100vh;
    }
    .node {
      cursor: pointer;
    }
    .node circle {
      stroke: #fff;
      stroke-width: 2px;
    }
    .node text {
      font-size: 12px;
      fill: #e0e0e0;
      text-anchor: middle;
      pointer-events: none;
    }
    .link {
      stroke-opacity: 0.6;
    }
    .legend {
      position: absolute;
      top: 80px;
      right: 20px;
      background-color: rgba(45, 45, 45, 0.9);
      padding: 15px;
      border-radius: 8px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      margin: 5px 0;
    }
    .legend-color {
      width: 20px;
      height: 20px;
      margin-right: 10px;
      border-radius: 50%;
    }
  </style>
</head>
<body>
  <h1>🌐 Reputation Network</h1>

  <div class="legend">
    <div class="legend-item">
      <div class="legend-color" style="background-color: #4CAF50;"></div>
      High Reputation
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background-color: #FFC107;"></div>
      Medium Reputation
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background-color: #F44336;"></div>
      Low Reputation
    </div>
  </div>

  <div id="network"></div>

  <script>
    const nodes = ${JSON.stringify(nodes.map(id => ({ id })))};
    const links = ${JSON.stringify(edges)};
    const reputations = ${JSON.stringify(Array.from(reputations.entries()))};

    const width = window.innerWidth;
    const height = window.innerHeight;

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    const svg = d3.select("#network")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    // Draw links
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "link")
      .attr("stroke", d => {
        const rep = reputations.find(r => r[0] === d.source.id)?.[1] || 0.5;
        return d3.interpolateRgb("#F44336", "#4CAF50")(rep);
      })
      .attr("stroke-width", d => Math.sqrt(d.weight) * 2);

    // Draw nodes
    const node = svg.append("g")
      .selectAll(".node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("circle")
      .attr("r", 20)
      .attr("fill", d => {
        const rep = reputations.find(r => r[0] === d.id)?.[1] || 0.5;
        return d3.interpolateRgb("#F44336", "#4CAF50")(rep);
      });

    node.append("text")
      .attr("dy", 30)
      .text(d => d.id);

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("transform", d => \`translate(\${d.x},\${d.y})\`);
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  </script>
</body>
</html>`;
}

// ============================================================================
// SOCIAL WELFARE TRACKING
// ============================================================================

/**
 * Generate HTML visualization of social welfare over time
 */
export function visualizeSocialWelfare(
  rounds: number[],
  welfare: number[],
  gini: number[],
  outputPath: string
): void {
  const html = generateSocialWelfareHTML(rounds, welfare, gini);
  writeFileSync(outputPath, html);
  console.log(`Social welfare visualization saved to ${outputPath}`);
}

function generateSocialWelfareHTML(
  rounds: number[],
  welfare: number[],
  gini: number[]
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Social Welfare Tracking</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #1a1a1a;
      color: #e0e0e0;
    }
    h1 {
      color: #4CAF50;
      text-align: center;
    }
    .chart-container {
      background-color: #2d2d2d;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .metric-card {
      background-color: #2d2d2d;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .metric-value {
      font-size: 2em;
      font-weight: bold;
      color: #4CAF50;
    }
    .metric-label {
      color: #888;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <h1>📊 Social Welfare Tracking</h1>

  <div class="metrics">
    <div class="metric-card">
      <div class="metric-value">${welfare[welfare.length - 1].toFixed(0)}</div>
      <div class="metric-label">Final Social Welfare</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${(welfare[welfare.length - 1] / welfare[0] * 100).toFixed(0)}%</div>
      <div class="metric-label">Welfare Growth</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${gini[gini.length - 1].toFixed(3)}</div>
      <div class="metric-label">Final Gini Coefficient</div>
    </div>
  </div>

  <div class="chart-container">
    <h2>Social Welfare Over Time</h2>
    <canvas id="welfareChart"></canvas>
  </div>

  <div class="chart-container">
    <h2>Inequality (Gini Coefficient)</h2>
    <canvas id="giniChart"></canvas>
  </div>

  <script>
    const rounds = ${JSON.stringify(rounds)};
    const welfare = ${JSON.stringify(welfare)};
    const gini = ${JSON.stringify(gini)};

    // Welfare chart
    new Chart(document.getElementById('welfareChart'), {
      type: 'line',
      data: {
        labels: rounds,
        datasets: [{
          label: 'Social Welfare',
          data: welfare,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: { color: '#e0e0e0' }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: { color: '#e0e0e0' },
            grid: { color: '#444' }
          },
          x: {
            ticks: { color: '#e0e0e0' },
            grid: { color: '#444' }
          }
        }
      }
    });

    // Gini chart
    new Chart(document.getElementById('giniChart'), {
      type: 'line',
      data: {
        labels: rounds,
        datasets: [{
          label: 'Gini Coefficient',
          data: gini,
          borderColor: '#F44336',
          backgroundColor: 'rgba(244, 67, 54, 0.2)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: { color: '#e0e0e0' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 1,
            ticks: { color: '#e0e0e0' },
            grid: { color: '#444' }
          },
          x: {
            ticks: { color: '#e0e0e0' },
            grid: { color: '#444' }
          }
        }
      }
    });
  </script>
</body>
</html>`;
}

// ============================================================================
// SHAPLEY VALUE VISUALIZATION
// ============================================================================

/**
 * Generate HTML visualization of Shapley values
 */
export function visualizeShapleyValues(
  agents: string[],
  shapleyValues: Map<string, number>,
  outputPath: string
): void {
  const html = generateShapleyValuesHTML(agents, shapleyValues);
  writeFileSync(outputPath, html);
  console.log(`Shapley values visualization saved to ${outputPath}`);
}

function generateShapleyValuesHTML(
  agents: string[],
  shapleyValues: Map<string, number>
): string {
  const sorted = agents
    .map(id => ({ id, value: shapleyValues.get(id) || 0 }))
    .sort((a, b) => b.value - a.value);

  const maxValue = Math.max(...sorted.map(s => s.value));

  return `<!DOCTYPE html>
<html>
<head>
  <title>Shapley Values</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #1a1a1a;
      color: #e0e0e0;
    }
    h1 {
      color: #4CAF50;
      text-align: center;
    }
    .shapley-container {
      background-color: #2d2d2d;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .shapley-row {
      display: flex;
      align-items: center;
      margin: 15px 0;
    }
    .agent-label {
      width: 150px;
      text-align: right;
      padding-right: 15px;
    }
    .bar-container {
      flex-grow: 1;
      background-color: #1a1a1a;
      border-radius: 4px;
      height: 30px;
      position: relative;
    }
    .bar {
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #8BC34A);
      border-radius: 4px;
      transition: width 0.5s ease;
    }
    .value-label {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-weight: bold;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    }
    .summary {
      background-color: #2d2d2d;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <h1>🎯 Shapley Value Allocation</h1>

  <div class="summary">
    <div class="summary-item">
      <span>Total Value:</span>
      <span>${Array.from(shapleyValues.values()).reduce((a, b) => a + b, 0).toFixed(2)}</span>
    </div>
    <div class="summary-item">
      <span>Fair Allocation:</span>
      <span>Each agent paid marginal contribution</span>
    </div>
  </div>

  <div class="shapley-container">
    <h2>Agent Contributions</h2>
    ${sorted.map(s => `
      <div class="shapley-row">
        <div class="agent-label">${s.id}</div>
        <div class="bar-container">
          <div class="bar" style="width: ${(s.value / maxValue * 100).toFixed(1)}%">
            <span class="value-label">${s.value.toFixed(3)}</span>
          </div>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="summary">
    <h2>Interpretation</h2>
    <p>Shapley values represent each agent's average marginal contribution across all possible coalitions. This is the unique payoff division that satisfies:</p>
    <ul>
      <li><strong>Efficiency:</strong> Total value is fully distributed</li>
      <li><strong>Symmetry:</strong> Identical agents receive equal payoffs</li>
      <li><strong>Dummy:</strong> Agents that contribute nothing receive nothing</li>
      <li><strong>Additivity:</strong> Payoffs for combined games sum correctly</li>
    </ul>
  </div>
</body>
</html>`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  visualizeStrategyEvolution,
  visualizePayoffMatrix,
  visualizeReputationNetwork,
  visualizeSocialWelfare,
  visualizeShapleyValues
};
