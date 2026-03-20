import { useCalculator } from '../state/context';

function formatNum(n: number): string {
  return n < 1 && n > 0 ? n.toFixed(2) : n.toFixed(0);
}

function formatCurrency(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

function exportCSV(quarterly: any[]) {
  const headers = ['Quarter', 'Leads', 'MQLs', 'Opportunities', 'Pipeline', 'Closed Won', 'Revenue', 'Frequency Cost', 'CPL Cost', 'Software', 'Agency', 'Total Cost', 'Cum. Revenue', 'Cum. Cost'];
  const rows = quarterly.map(q => [
    q.quarterLabel,
    q.leads.toFixed(1),
    q.mqls.toFixed(1),
    q.opportunities.toFixed(1),
    Math.round(q.pipeline),
    q.closedWon.toFixed(2),
    Math.round(q.revenue),
    Math.round(q.frequencyCost),
    Math.round(q.cplCost),
    Math.round(q.softwareCost),
    Math.round(q.agencyCost),
    Math.round(q.totalCost),
    Math.round(q.cumulativeRevenue),
    Math.round(q.cumulativeCost),
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'funnel-velocity-data.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function DataTab() {
  const { state } = useCalculator();
  const { quarterly } = state.outputs;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Quarterly Data</h3>
        <button
          onClick={() => exportCSV(quarterly)}
          className="px-3 py-1.5 text-xs font-medium text-[#1de2c4] bg-[#1de2c4]/10 rounded-lg hover:bg-[#1de2c4]/20 transition-colors"
        >
          Download CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-900 border-b border-gray-800">
              <th className="text-left px-3 py-2 font-semibold text-gray-400 sticky left-0 bg-gray-900 z-10">Quarter</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-400">Leads</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-400">MQLs</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-400">Opps</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-400">Pipeline</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-400">Won</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-400">Revenue</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-400">Freq. Cost</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-400">CPL Cost</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-400">Software</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-400">Agency</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-400">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {quarterly.map((q, i) => (
              <tr key={q.quarter} className={`border-b border-gray-800/50 ${i % 2 === 0 ? 'bg-black' : 'bg-gray-900/50'}`}>
                <td className="px-3 py-2 font-medium text-white sticky left-0 bg-inherit z-10">{q.quarterLabel}</td>
                <td className="text-right px-3 py-2 text-gray-300">{formatNum(q.leads)}</td>
                <td className="text-right px-3 py-2 text-gray-300">{formatNum(q.mqls)}</td>
                <td className="text-right px-3 py-2 text-gray-300">{formatNum(q.opportunities)}</td>
                <td className="text-right px-3 py-2 text-gray-300">{formatCurrency(q.pipeline)}</td>
                <td className="text-right px-3 py-2 text-gray-300">{formatNum(q.closedWon)}</td>
                <td className="text-right px-3 py-2 text-gray-300">{formatCurrency(q.revenue)}</td>
                <td className="text-right px-3 py-2 text-gray-500">{formatCurrency(q.frequencyCost)}</td>
                <td className="text-right px-3 py-2 text-gray-500">{formatCurrency(q.cplCost)}</td>
                <td className="text-right px-3 py-2 text-gray-500">{formatCurrency(q.softwareCost)}</td>
                <td className="text-right px-3 py-2 text-gray-500">{formatCurrency(q.agencyCost)}</td>
                <td className="text-right px-3 py-2 font-medium text-white">{formatCurrency(q.totalCost)}</td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="bg-gray-800 font-semibold border-t-2 border-gray-700">
              <td className="px-3 py-2 text-white sticky left-0 bg-gray-800 z-10">Total</td>
              <td className="text-right px-3 py-2 text-white">{formatNum(quarterly.reduce((a, q) => a + q.leads, 0))}</td>
              <td className="text-right px-3 py-2 text-white">{formatNum(quarterly.reduce((a, q) => a + q.mqls, 0))}</td>
              <td className="text-right px-3 py-2 text-white">{formatNum(quarterly.reduce((a, q) => a + q.opportunities, 0))}</td>
              <td className="text-right px-3 py-2 text-white">{formatCurrency(quarterly.reduce((a, q) => a + q.pipeline, 0))}</td>
              <td className="text-right px-3 py-2 text-white">{formatNum(quarterly.reduce((a, q) => a + q.closedWon, 0))}</td>
              <td className="text-right px-3 py-2 text-white">{formatCurrency(quarterly.reduce((a, q) => a + q.revenue, 0))}</td>
              <td className="text-right px-3 py-2 text-gray-500">{formatCurrency(quarterly.reduce((a, q) => a + q.frequencyCost, 0))}</td>
              <td className="text-right px-3 py-2 text-gray-500">{formatCurrency(quarterly.reduce((a, q) => a + q.cplCost, 0))}</td>
              <td className="text-right px-3 py-2 text-gray-500">{formatCurrency(quarterly.reduce((a, q) => a + q.softwareCost, 0))}</td>
              <td className="text-right px-3 py-2 text-gray-500">{formatCurrency(quarterly.reduce((a, q) => a + q.agencyCost, 0))}</td>
              <td className="text-right px-3 py-2 text-white">{formatCurrency(quarterly.reduce((a, q) => a + q.totalCost, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
