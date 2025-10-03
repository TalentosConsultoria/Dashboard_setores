import React, { useState, useMemo } from 'react';
import type { User, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Select, Spinner, IconUsers, Modal, Button, IconTrash2, Input, IconSearch } from './ui';
import { updateUserRole, removeUser, adminCreateUser } from '../services/firebaseService';

interface UsersPageProps {
  users: User[];
  isLoading: boolean;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const UsersPage: React.FC<UsersPageProps> = ({ users, isLoading, showToast }) => {
  const { profile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');
  const [isAddingUser, setIsAddingUser] = useState(false);

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);
  
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      showToast('E-mail e senha são obrigatórios.', 'error');
      return;
    }
    setIsAddingUser(true);
    try {
      await adminCreateUser(newEmail, newPassword, newRole);
      showToast('Usuário adicionado com sucesso!', 'success');
      setNewEmail('');
      setNewPassword('');
      setNewRole('viewer');
    } catch (error: any) {
      console.error(error);
      let message = 'Erro ao adicionar usuário.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Este e-mail já está em uso.';
      } else if (error.code === 'auth/weak-password') {
        message = 'A senha deve ter pelo menos 6 caracteres.';
      }
      showToast(message, 'error');
    } finally {
      setIsAddingUser(false);
    }
  };


  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    if (uid === profile?.uid) {
        showToast('Você não pode alterar sua própria função.', 'error');
        return;
    }
    try {
      await updateUserRole(uid, newRole);
      showToast('Função do usuário atualizada!', 'success');
    } catch (error) {
      console.error('Failed to update user role:', error);
      showToast('Erro ao atualizar a função.', 'error');
    }
  };
  
  const handleDeleteClick = (user: User) => {
    if (user.uid === profile?.uid) {
        showToast('Você não pode remover a si mesmo.', 'error');
        return;
    }
    setUserToDelete(user);
    setIsModalOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
        await removeUser(userToDelete.uid);
        showToast(`Usuário ${userToDelete.email} removido.`, 'success');
    } catch (error) {
        console.error('Failed to remove user:', error);
        showToast('Erro ao remover usuário.', 'error');
    } finally {
        setIsModalOpen(false);
        setUserToDelete(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <IconUsers className="w-8 h-8" />
          Gerenciamento de Usuários
        </h1>
        <p className="text-gray-400 mt-1">Adicione, edite e remova os usuários do sistema.</p>
      </header>

      <div className="bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Adicionar Novo Usuário</h3>
        <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">E-mail</label>
            <Input type="email" placeholder="email@exemplo.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Senha Inicial</label>
            <Input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Função</label>
            <Select value={newRole} onChange={e => setNewRole(e.target.value as UserRole)}>
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <div className="sm:col-start-2 lg:col-start-4">
            <Button type="submit" className="w-full" disabled={isAddingUser}>
              {isAddingUser ? 'Adicionando...' : 'Adicionar Usuário'}
            </Button>
          </div>
        </form>
      </div>

      <div className="mb-4 relative">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <Input 
          placeholder="Pesquisar por e-mail..." 
          className="pl-10 w-full sm:w-1/2 lg:w-1/3"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>


      <div className="bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-700">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Função</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="text-center py-16">
                    <Spinner />
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.uid} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-200 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">
                      <Select
                        defaultValue={user.role}
                        onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                        disabled={user.uid === profile?.uid}
                        className="max-w-xs"
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </Select>
                       {user.uid === profile?.uid && <p className="text-xs text-gray-500 mt-1">Você não pode alterar sua própria função.</p>}
                    </td>
                    <td className="px-6 py-4">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="p-1"
                            onClick={() => handleDeleteClick(user)}
                            disabled={user.uid === profile?.uid}
                            aria-label={`Remover ${user.email}`}
                        >
                            <IconTrash2 className="w-5 h-5 text-red-500" />
                        </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <Modal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Confirmar Remoção"
      >
        <div className="p-6">
            <p>
                Tem certeza que deseja remover o usuário <span className="font-bold text-yellow-400">{userToDelete?.email}</span>?
            </p>
            <p className="mt-2 text-sm text-gray-400">
                Esta ação removerá o perfil do usuário do banco de dados da aplicação, mas não deletará a conta de autenticação do Firebase.
            </p>
        </div>
        <div className="bg-gray-900 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleConfirmDelete}>Confirmar Remoção</Button>
        </div>
      </Modal>
    </div>
  );
};