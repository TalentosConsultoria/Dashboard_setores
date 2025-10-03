
export interface Note {
  id: string;
  nNota?: string;
  cliente: string;
  categoria: string;
  valor: number;
  dataEmissao: string; // ISO string date
  status: 'Pago' | 'Não Pago';
  materialServico?: string;
  veiculoPlaca?: string;
  createdAt: number;
}

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface Role {
  canEdit: boolean;
  canView: boolean;
  modules: string[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  role: UserRole;
  permissions: Role;
}

export interface Veiculo {
  id: number;
  placa: string;
  modelo: string;
  marca: string;
  ano: number;
  status: string;
}

export interface User {
  uid: string;
  email: string;
  role: UserRole;
}
