// Operations Portal – Master Dashboard (S02)
// This page displays key operational metrics such as total cage assets, rolling statistics,
// pending approvals and agent performance.  Data is fetched from the backend reports API.

'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface CageSummary {
  totalAssets: number;
  houseRolling: number;
  internalRolling: number;
  unpaidCommission: number;
}
interface AgentPerfItem {
  name: string;
  commission: number;
}

export default function OperationsDashboard() {
  const [summary, setSummary] = useState<CageSummary | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [perf, setPerf] = useState<AgentPerfItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Fetch cage assets and rolling information.
        const { data: cage } = await api.get('/reports/cage-summary');
        // Fetch count of pending approvals – the API returns an object with a `count` field.
        const { data: pending } = await api.get('/approval/logs', {
          params: { status: 'pending' },
        });
        // Fetch agent performance list.
        const { data: perfData } = await api.get('/reports/agent-performance');

        setSummary(cage);
        setPendingCount(pending?.count ?? 0);
        setPerf(perfData ?? []);
      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading)
    return <div className="min-h-64 flex items-center justify-center">Loading...</div>;
  if (error) return <div className="text-red-600 text-center mt-8">{error}</div>;

  return (
    <main>
      <h1 className="text-3xl font-bold mb-6">Operations Portal – Dashboard</h1>

      {/* KPI cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary && (
          [
            {
              title: 'Total Cage Assets',
              value: summary.totalAssets,
            },
            {
              title: 'House Rolling',
              value: summary.houseRolling,
            },
            {
              title: 'Internal Rolling',
              value: summary.internalRolling,
            },
            {
              title: 'Unpaid Commission/Points',
              value: summary.unpaidCommission,
            },
          ].map((card) => (
            <Card key={card.title} title={card.title} value={card.value} />
          ))
        )}
        {pendingCount !== null && (
          <Card title="Pending Approvals" value={pendingCount} />
        )}
      </section>

      {/* Agent performance table */}
      <h2 className="text-2xl font-semibold mt-8 mb-4">Agent Performance</h2>
      {perf.length > 0 ? (
        <table className="w-full table-auto bg-white rounded-md shadow">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left border-b">Agent</th>
              <th className="px-4 py-2 text-right border-b">Commission Earned</th>
            </tr>
          </thead>
          <tbody>{perf.map((p) => (
            <tr key={p.name}>
              <td className="border-b px-4 py-2">{p.name}</td>
              <td className="border-b text-right px-4 py-2">
                {p.commission.toLocaleString()}
              </td>
            </tr>
          ))}</tbody>
        </table>
      ) : (
        <p>No agent performance data available.</p>
      )}
    </main>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white p-4 rounded-md shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="text-xl font-semibold mt-1">{value.toLocaleString()}</h3>
    </div>
  );
}
