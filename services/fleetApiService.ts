import type { Veiculo } from '../types';

// IMPORTANT: The provided URL is for documentation (SwaggerHub), not a live API endpoint.
// This service MOCKS the API call to allow the UI to be developed.
// Replace the mock implementation with a real fetch call when the API is available.

// const API_BASE_URL = 'https://api.example.com/frota'; // Replace with the actual API URL
// const TOKEN = '4b8f2c9d3a5e6b1f7d0a3c8e2f1b9r3t';
// const API_KEY = 'F2E8591802769C058B9C0B00AED85E09FFC404F8B1901A402E043157EEAE47B6';

const mockVeiculos: Veiculo[] = [
  { id: 1, placa: 'BRA2E19', modelo: 'FH 540', marca: 'Volvo', ano: 2022, status: 'Ativo' },
  { id: 2, placa: 'XYZ1234', modelo: 'Actros 2651', marca: 'Mercedes-Benz', ano: 2021, status: 'Em Manutenção' },
  { id: 3, placa: 'ABC9876', modelo: 'R450', marca: 'Scania', ano: 2023, status: 'Ativo' },
  { id: 4, placa: 'DEF5678', modelo: 'TGS 26.480', marca: 'MAN', ano: 2020, status: 'Inativo' },
  { id: 5, placa: 'GHI1A23', modelo: 'FH 460', marca: 'Volvo', ano: 2022, status: 'Ativo' },
];

export const getVeiculos = (): Promise<Veiculo[]> => {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      resolve(mockVeiculos);
    }, 1000);
  });
  
  /* 
  // REAL IMPLEMENTATION EXAMPLE:
  return fetch(`${API_BASE_URL}/veiculos`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'ApiKey': API_KEY,
      'Content-Type': 'application/json',
    },
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  });
  */
};
