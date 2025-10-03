import React, { useMemo } from 'react';
import type { Note } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Legend as RechartsLegend } from 'recharts';
import { KpiCard } from './KpiCard';
import { Spinner } from './ui';

interface DashboardProps {
  notes: Note[];
  isLoading: boolean;
}

const MONTH_NAMES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#f59e0b'];

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const finalLabel = payload[0].name || label; // 'name' for Pie, 'label' for Bar
    return (
      <div className="bg-gray-700 p-2 border border-gray-600 rounded shadow-lg">
        <p className="label text-white">{`${finalLabel} : ${formatCurrency(payload[0].value)}`}</p>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ notes, isLoading }) => {
  const stats = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    let totalGastoMes = 0;
    let totalPago = 0;
    let totalNaoPago = 0;
    const categoryTotals: { [key: string]: number } = {};

    // 1. Initialize the last 6 months with a stable structure using a 'YYYY-MM' key.
    const monthlyDataMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${month}`;
      monthlyDataMap.set(monthKey, 0);
    }

    if (notes && notes.length > 0) {
      notes.forEach(note => {
        const dataNota = new Date(note.dataEmissao);
        if (isNaN(dataNota.getTime())) return;

        if (dataNota.getMonth() === mesAtual && dataNota.getFullYear() === anoAtual) {
          totalGastoMes += note.valor;
        }
        
        if (note.status === 'Pago') {
          totalPago += note.valor;
        } else {
          totalNaoPago += note.valor;
        }

        const category = note.categoria || 'Sem Categoria';
        categoryTotals[category] = (categoryTotals[category] || 0) + note.valor;

        // 2. Aggregate values into the map.
        const year = dataNota.getFullYear();
        const month = String(dataNota.getMonth() + 1).padStart(2, '0');
        const monthKey = `${year}-${month}`;
        if (monthlyDataMap.has(monthKey)) {
          monthlyDataMap.set(monthKey, monthlyDataMap.get(monthKey)! + note.valor);
        }
      });
    }

    const numDiasNoMes = hoje.getDate();
    const mediaDiariaMes = totalGastoMes > 0 ? totalGastoMes / numDiasNoMes : 0;
    
    const categoryData = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 3. Convert map to a formatted array for the chart.
    const monthlyData = Array.from(monthlyDataMap.entries()).map(([monthKey, value]) => {
      const [yearStr, monthStr] = monthKey.split('-');
      const monthIndex = parseInt(monthStr, 10) - 1;
      const year = parseInt(yearStr, 10);
      
      const shortMonth = MONTH_NAMES_PT[monthIndex];
      const shortYear = year.toString().slice(2);
      
      return {
        name: `${shortMonth}/${shortYear}`,
        value
      };
    });

    return { totalGastoMes, mediaDiariaMes, totalPago, totalNaoPago, categoryData, monthlyData, recentNotes: notes.slice(0, 5) };
  }, [notes]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white">Dashboard Financeiro</h1>
        <p className="text-gray-400 mt-1">Visão analítica e em tempo real dos seus registros financeiros.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Total Gasto (Mês)" value={formatCurrency(stats.totalGastoMes)} />
        <KpiCard title="Média Diária (Mês)" value={formatCurrency(stats.mediaDiariaMes)} />
        <KpiCard title="Total Pago (Geral)" value={formatCurrency(stats.totalPago)} variant="success" />
        <KpiCard title="Não Pago (Geral)" value={formatCurrency(stats.totalNaoPago)} variant="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Faturamento Mensal (Últimos 6 Meses)</h3>
          {isLoading ? (
            <div className="flex justify-center items-center h-[300px]"><Spinner /></div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={formatCurrency}/>
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
           <h3 className="text-lg font-semibold text-white mb-4">Distribuição por Categoria</h3>
           {isLoading ? (
            <div className="flex justify-center items-center h-[300px]"><Spinner /></div>
           ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {stats.categoryData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <RechartsLegend />
              </PieChart>
            </ResponsiveContainer>
           )}
        </div>
      </div>
       <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Registros Recentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="py-2 px-4 text-sm font-medium text-gray-400">Nº Nota</th>
                <th className="py-2 px-4 text-sm font-medium text-gray-400">Cliente</th>
                <th className="py-2 px-4 text-sm font-medium text-gray-400">Categoria</th>
                <th className="py-2 px-4 text-sm font-medium text-gray-400">Valor</th>
                <th className="py-2 px-4 text-sm font-medium text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10">
                    <div className="flex justify-center items-center"><Spinner /></div>
                  </td>
                </tr>
              ) : stats.recentNotes.length > 0 ? (
                stats.recentNotes.map(note => (
                  <tr key={note.id} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-gray-400">{note.nNota || 'N/A'}</td>
                    <td className="py-3 px-4 font-medium text-gray-200">{note.cliente}</td>
                    <td className="py-3 px-4 text-gray-400">{note.categoria || 'Sem Categoria'}</td>
                    <td className="py-3 px-4 text-gray-300 font-semibold">{formatCurrency(note.valor)}</td>
                    <td className="py-3 px-4">
                       <span className={`px-2 py-1 text-xs font-semibold rounded-full ${note.status === 'Pago' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {note.status}
                       </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};