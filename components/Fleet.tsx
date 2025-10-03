
import React, { useMemo } from 'react';
import type { Veiculo, Note } from '../types';
import { KpiCard } from './KpiCard';
import { Spinner, IconTruck } from './ui';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const VehicleCard: React.FC<{ vehicle: Veiculo; accumulatedCost: number }> = ({ vehicle, accumulatedCost }) => {
  const statusColor = {
    'Ativo': 'bg-green-500/20 text-green-400',
    'Em Manutenção': 'bg-yellow-500/20 text-yellow-400',
    'Inativo': 'bg-gray-500/20 text-gray-400'
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold text-white">{vehicle.marca} {vehicle.modelo}</h3>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColor[vehicle.status as keyof typeof statusColor] || statusColor.Inativo}`}>
            {vehicle.status}
          </span>
        </div>
        <p className="text-gray-400 text-sm">{vehicle.ano}</p>
        <div className="mt-4">
            <p className="text-gray-400 text-xs uppercase">Custo Acumulado</p>
            <p className="text-lg font-semibold text-yellow-400">{formatCurrency(accumulatedCost)}</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-2xl font-mono bg-gray-900 inline-block px-3 py-1 rounded-md border border-gray-600 text-gray-200">{vehicle.placa}</p>
      </div>
    </div>
  );
};

interface FleetProps {
  notes: Note[];
  vehicles: Veiculo[];
  isLoading: boolean;
  error: string | null;
}

export const Fleet: React.FC<FleetProps> = ({ notes, vehicles, isLoading, error }) => {
  const fleetData = useMemo(() => {
    const activeVehicles = vehicles.filter(v => v.status === 'Ativo').length;
    
    const costsByPlate = notes.reduce((acc, note) => {
      const plate = note.veiculoPlaca;
      if (plate) {
        acc[plate] = (acc[plate] || 0) + note.valor;
      }
      return acc;
    }, {} as Record<string, number>);

    // FIX: Explicitly cast `cost` to `number` to resolve type inference issues where `cost` was being inferred as `unknown`.
    const totalFleetCost = Object.values(costsByPlate).reduce((sum, cost) => sum + (cost as number), 0);

    return { activeVehicles, costsByPlate, totalFleetCost };
  }, [notes, vehicles]);


  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <IconTruck className="w-8 h-8" />
          Gerenciamento de Frota
        </h1>
        <p className="text-gray-400 mt-1">Visão em tempo real da sua frota de veículos e seus custos associados.</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center items-center py-20"><Spinner /></div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard title="Total de Veículos" value={vehicles.length.toString()} />
            <KpiCard title="Veículos Ativos" value={fleetData.activeVehicles.toString()} variant="success" />
            <KpiCard title="Custo Total da Frota" value={formatCurrency(fleetData.totalFleetCost)} variant="danger" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {vehicles.map(vehicle => (
              <VehicleCard 
                key={vehicle.id} 
                vehicle={vehicle} 
                accumulatedCost={fleetData.costsByPlate[vehicle.placa] || 0}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
