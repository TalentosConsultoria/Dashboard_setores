
import React, { useMemo } from 'react';
import type { Veiculo, Note } from '../types';
import { KpiCard } from './KpiCard';
import { Spinner, IconTruck } from './ui';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const VehicleCard: React.FC<{ vehicle: Veiculo; accumulatedCost: number }> = ({ vehicle, accumulatedCost }) => {
  const statusConfig = {
    'Ativo': { classes: 'bg-green-500/20 text-green-400', label: 'Ativo' },
    'Em Manutenção': { classes: 'bg-yellow-500/20 text-yellow-400', label: 'Em Manutenção' },
    'Inativo': { classes: 'bg-gray-500/20 text-gray-400', label: 'Inativo' },
  };
  const currentStatus = statusConfig[vehicle.status as keyof typeof statusConfig] || statusConfig.Inativo;

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700 flex flex-col justify-between hover:border-blue-500 transition-colors duration-300">
      <div>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold text-white">{vehicle.marca} {vehicle.modelo}</h3>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${currentStatus.classes}`}>
            {currentStatus.label}
          </span>
        </div>
        <p className="text-gray-400 text-sm">{vehicle.ano}</p>
        <div className="mt-4">
            <p className="text-gray-400 text-xs uppercase">Custo Acumulado</p>
            <p className="text-xl font-semibold text-yellow-400">{formatCurrency(accumulatedCost)}</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-2xl font-mono bg-gray-900 inline-block px-3 py-1 rounded-md border border-gray-600 text-gray-200 tracking-widest">{vehicle.placa}</p>
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
  // Memoized calculation for costs per vehicle plate.
  // This is now more robust and efficient.
  const costsByPlate = useMemo(() => {
    if (!notes || notes.length === 0) {
      return new Map<string, number>();
    }
    
    const costs = new Map<string, number>();
    for (const note of notes) {
      if (note.veiculoPlaca) {
        // Ensure plate is uppercase and trimmed for consistent matching.
        const plate = note.veiculoPlaca.toUpperCase().trim();
        const currentCost = costs.get(plate) || 0;
        costs.set(plate, currentCost + note.valor);
      }
    }
    return costs;
  }, [notes]);

  // Memoized calculation for overall fleet statistics.
  // This depends on the result of costsByPlate and vehicles.
  const fleetStats = useMemo(() => {
    const safeVehicles = vehicles || []; // Prevents errors if vehicles is null/undefined.
    
    const statusCounts = safeVehicles.reduce((acc, v) => {
        acc[v.status] = (acc[v.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    let totalFleetCost = 0;
    for (const cost of costsByPlate.values()) {
      totalFleetCost += cost;
    }

    return {
      totalVehicles: safeVehicles.length,
      activeVehicles: statusCounts['Ativo'] || 0,
      maintenanceVehicles: statusCounts['Em Manutenção'] || 0,
      inactiveVehicles: statusCounts['Inativo'] || 0,
      totalFleetCost
    };
  }, [vehicles, costsByPlate]);


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
        <div className="text-center py-20 text-red-500 bg-red-500/10 border border-red-500 rounded-lg p-4">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard title="Total de Veículos" value={fleetStats.totalVehicles.toString()} />
            <KpiCard title="Veículos Ativos" value={fleetStats.activeVehicles.toString()} variant="success" />
            <KpiCard title="Em Manutenção" value={fleetStats.maintenanceVehicles.toString()} />
            <KpiCard title="Custo Total da Frota" value={formatCurrency(fleetStats.totalFleetCost)} variant="danger" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(vehicles || []).map(vehicle => (
              <VehicleCard 
                key={vehicle.id} 
                vehicle={vehicle} 
                accumulatedCost={costsByPlate.get(vehicle.placa) || 0}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
