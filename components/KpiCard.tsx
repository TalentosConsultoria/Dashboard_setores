
import React from 'react';

interface KpiCardProps {
  title: string;
  value: string;
  variant?: 'default' | 'success' | 'danger';
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, variant = 'default' }) => {
  const variantClasses = {
    default: 'border-blue-500',
    success: 'border-green-500',
    danger: 'border-red-500',
  };

  return (
    <div className={`bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 ${variantClasses[variant]}`}>
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h2>
      <p className="text-3xl font-bold mt-2 text-white">{value}</p>
    </div>
  );
};
