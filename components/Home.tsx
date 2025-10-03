
import React from 'react';
import type { Note, Veiculo, UserProfile } from '../types';
import { Spinner, IconFileText, IconTruck, IconPlusCircle } from './ui';
import { useAuth } from '../contexts/AuthContext';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

type Tab = 'home' | 'dashboard' | 'management' | 'fleet' | 'users';

interface HomeProps {
  profile: UserProfile | null;
  notes: Note[];
  vehicles: Veiculo[];
  notesLoading: boolean;
  vehiclesLoading: boolean;
  navigateTo: (tab: Tab) => void;
}

const SummaryCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
  isLoading: boolean;
}> = ({ title, icon, onClick, children, isLoading }) => (
  <div 
    className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 cursor-pointer hover:bg-gray-700/50 transition-colors flex flex-col"
    onClick={onClick}
  >
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {icon}
    </div>
    <div className="flex-grow">
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-3">
          {children}
        </div>
      )}
    </div>
     <p className="text-right text-xs text-gray-500 mt-4">Clique para ver detalhes →</p>
  </div>
);

const statusColorMap: { [key: string]: string } = {
  'Ativo': 'bg-green-500',
  'Em Manutenção': 'bg-yellow-500',
  'Inativo': 'bg-gray-500'
};


export const Home: React.FC<HomeProps> = ({ profile, notes, vehicles, notesLoading, vehiclesLoading, navigateTo }) => {
  const { hasModuleAccess } = useAuth();
  
  const financialSummary = React.useMemo(() => {
    if (notesLoading || !notes.length) return { totalNaoPago: 0, totalGastoMes: 0, totalPago: 0, mediaDiariaMes: 0 };
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    let totalGastoMes = 0;
    let totalNaoPago = 0;
    let totalPago = 0;
    
    notes.forEach(note => {
      const dataNota = new Date(note.dataEmissao);
      if (dataNota.getMonth() === mesAtual && dataNota.getFullYear() === anoAtual) {
        totalGastoMes += note.valor;
      }
      if (note.status === 'Não Pago') {
        totalNaoPago += note.valor;
      } else {
        totalPago += note.valor;
      }
    });

    const mediaDiariaMes = totalGastoMes > 0 ? totalGastoMes / hoje.getDate() : 0;

    return { totalNaoPago, totalGastoMes, totalPago, mediaDiariaMes };
  }, [notes, notesLoading]);

  const fleetSummary = React.useMemo(() => {
    if (vehiclesLoading || !vehicles.length) return { total: 0, statusCounts: {} };
    
    const statusCounts = vehicles.reduce((acc, vehicle) => {
      const status = vehicle.status || 'Desconhecido';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: vehicles.length,
      statusCounts
    };
  }, [vehicles, vehiclesLoading]);


  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white">Visão Geral</h1>
        <p className="text-gray-400 mt-1">Um resumo do seu negócio em um só lugar.</p>
      </header>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${hasModuleAccess('gerenciamento') ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
        {/* Financial Summary Card */}
        <SummaryCard 
          title="Resumo Financeiro"
          icon={<IconFileText className="w-8 h-8 text-blue-400" />}
          onClick={() => navigateTo('dashboard')}
          isLoading={notesLoading}
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-400">Gasto (Mês)</p>
              <p className="font-semibold text-gray-200">{formatCurrency(financialSummary.totalGastoMes)}</p>
            </div>
            <div>
              <p className="text-gray-400">Média Diária</p>
              <p className="font-semibold text-gray-200">{formatCurrency(financialSummary.mediaDiariaMes)}</p>
            </div>
            <div>
              <p className="text-gray-400">Total Pago</p>
              <p className="font-semibold text-green-400">{formatCurrency(financialSummary.totalPago)}</p>
            </div>
            <div>
              <p className="text-gray-400">Não Pago</p>
              <p className="font-semibold text-red-400">{formatCurrency(financialSummary.totalNaoPago)}</p>
            </div>
          </div>
        </SummaryCard>
        
        {/* Fleet Summary Card */}
        {hasModuleAccess('frota') && (
          <SummaryCard 
            title="Resumo da Frota"
            icon={<IconTruck className="w-8 h-8 text-green-400" />}
            onClick={() => navigateTo('fleet')}
            isLoading={vehiclesLoading}
          >
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-400">Total de Veículos:</p>
              <p className="font-bold text-lg text-white">{fleetSummary.total}</p>
            </div>
            <div className="space-y-2">
              {Object.entries(fleetSummary.statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${statusColorMap[status] || 'bg-gray-400'}`}></span>
                    <span className="text-gray-300">{status}</span>
                  </div>
                  <span className="font-semibold text-gray-200">{count}</span>
                </div>
              ))}
            </div>
          </SummaryCard>
        )}
        
        {/* Quick Actions Card */}
        {profile?.permissions.canEdit && hasModuleAccess('gerenciamento') && (
          <SummaryCard
            title="Ações Rápidas"
            icon={<IconPlusCircle className="w-8 h-8 text-gray-400"/>}
            onClick={() => navigateTo('management')}
            isLoading={false} // This card doesn't load data
          >
            <p className="text-sm text-gray-400">Acesse para adicionar, editar ou importar novos registros financeiros.</p>
          </SummaryCard>
        )}
      </div>
    </div>
  );
};
