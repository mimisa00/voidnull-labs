// Operations Portal – Master Dashboard (S02)
// This page displays key operational metrics such as total cage assets, rolling statistics,
// pending approvals and agent performance.  Data is fetched from the backend reports API.

'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {summary && (
          [
            {
              title: 'Total Cage Assets',
              value: summary.totalAssets,
              description: 'Overall assets in the cage'
            },
            {
              title: 'House Rolling',
              value: summary.houseRolling,
              description: 'House rolling statistics'
            },
            {
              title: 'Internal Rolling',
              value: summary.internalRolling,
              description: 'Internal rolling calculations'
            },
            {
              title: 'Unpaid Commission/Points',
              value: summary.unpaidCommission,
              description: 'Unpaid commissions and points'
            },
          ].map((card) => (
            <Card key={card.title}>
              <CardHeader>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{card.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))
        )}
        {pendingCount !== null && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Requests awaiting approval</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Agent performance table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-semibold">Agent Performance</h2>
        </div>
        {perf.length > 0 ? (
          <table className="w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Commission Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {perf.map((p) => (
                <tr key={p.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium">{p.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-semibold">{p.commission.toLocaleString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No agent performance data available.
          </div>
        )}
      </div>
    </main>
  );
}
