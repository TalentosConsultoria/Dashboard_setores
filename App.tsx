
import React, { useState, useEffect, useCallback } from 'react';
import { subscribeToNotes, subscribeToUsers, signInWithCredentials, signOutUser } from './services/firebaseService';
import { getVeiculos } from './services/fleetApiService';
import { Home } from './components/Home';
import { Dashboard } from './components/Dashboard';
import { Management } from './components/Management';
import { Fleet } from './components/Fleet';
import { UsersPage } from './components/Users';
import { Button, Input, Spinner, Toast, IconTalentosLogo, IconLogOut } from './components/ui';
import type { Note, Veiculo, User } from './types';
import { useAuth } from './contexts/AuthContext';


// Login Page Component
const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await signInWithCredentials(email, password);
    } catch (err: any) {
      let friendlyMessage = 'Ocorreu um erro. Tente novamente.';
      if (err.code) {
          switch (err.code) {
              case 'auth/user-not-found':
              case 'auth/wrong-password':
              case 'auth/invalid-credential':
                  friendlyMessage = 'E-mail ou senha inválidos.';
                  break;
              case 'auth/invalid-email':
                  friendlyMessage = 'O formato do e-mail é inválido.';
                  break;
          }
      }
      setError(friendlyMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-200">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
        <div className="text-center">
            <IconTalentosLogo className="mx-auto h-12 w-12" />
            <h1 className="mt-4 text-3xl font-extrabold text-white">
              Acessar Dashboard
            </h1>
            <p className="mt-2 text-gray-400">
              Acesse para gerenciar suas finanças.
            </p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-400">Email</label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" className="mt-1" />
          </div>
          <div>
            <label htmlFor="password"className="text-sm font-medium text-gray-400">Senha</label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="mt-1" />
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
};


// Main App Component
type Tab = 'home' | 'dashboard' | 'gerenciamento' | 'frota' | 'users';

const App: React.FC = () => {
  const { user, profile, loading: authLoading, hasModuleAccess } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [vehicles, setVehicles] = useState<Veiculo[]>([]);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [fleetError, setFleetError] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({ message: '', type: 'success', isVisible: false });
  
  useEffect(() => {
    if (user) {
      const unsubscribeNotes = subscribeToNotes((newNotes) => {
        setNotes(newNotes);
        setDataLoading(false);
      });
      
      const fetchVehicles = async () => {
        if (hasModuleAccess('frota')) {
          setFleetLoading(true);
          try {
            const data = await getVeiculos();
            setVehicles(data);
          } catch (err) {
            setFleetError('Não foi possível carregar os dados da frota.');
            console.error(err);
          } finally {
            setFleetLoading(false);
          }
        } else {
          setFleetLoading(false);
        }
      };
      
      const fetchUsers = () => {
        if(hasModuleAccess('users')) {
            setUsersLoading(true);
            const unsubscribe = subscribeToUsers((userList) => {
                setUsers(userList);
                setUsersLoading(false);
            });
            return unsubscribe;
        }
        return () => {};
      }

      fetchVehicles();
      const unsubscribeUsers = fetchUsers();

      return () => {
        unsubscribeNotes();
        unsubscribeUsers();
      };
    }
  }, [user, hasModuleAccess]);


  const handleSignOut = async () => {
    await signOutUser();
  };
  
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, isVisible: false }));
    }, 3000);
  }, []);

  const navigateTo = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);
  
  useEffect(() => {
    if (!profile) return;
    if (!hasModuleAccess(activeTab) && activeTab !== 'home') {
      setActiveTab('home');
    }
  }, [activeTab, hasModuleAccess, profile]);


  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <nav className="bg-gray-800/70 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm-px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <IconTalentosLogo className="h-8 w-8"/>
              <div className="ml-10 flex items-baseline space-x-4">
                <button onClick={() => setActiveTab('home')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'home' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>Início</button>
                {hasModuleAccess('dashboard') && <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>Dashboard</button>}
                {hasModuleAccess('gerenciamento') && <button onClick={() => setActiveTab('gerenciamento')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'gerenciamento' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>Gerenciamento</button>}
                {hasModuleAccess('frota') && <button onClick={() => setActiveTab('frota')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'frota' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>Frota</button>}
                {hasModuleAccess('users') && <button onClick={() => setActiveTab('users')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>Usuários</button>}
              </div>
            </div>
             <div className="flex items-center gap-4">
               <span className="text-sm text-gray-400 hidden sm:block">{profile.email}</span>
                <Button onClick={handleSignOut} variant="secondary" className="p-2">
                  <IconLogOut className="h-5 w-5"/>
                </Button>
            </div>
          </div>
        </div>
      </nav>
      
      <main>
        {activeTab === 'home' && <Home profile={profile} notes={notes} vehicles={vehicles} notesLoading={dataLoading} vehiclesLoading={fleetLoading} navigateTo={navigateTo} />}
        {activeTab === 'dashboard' && hasModuleAccess('dashboard') && <Dashboard notes={notes} isLoading={dataLoading} />}
        {activeTab === 'gerenciamento' && hasModuleAccess('gerenciamento') && <Management notes={notes} isLoading={dataLoading} showToast={showToast} />}
        {activeTab === 'frota' && hasModuleAccess('frota') && <Fleet notes={notes} vehicles={vehicles} isLoading={dataLoading || fleetLoading} error={fleetError} />}
        {activeTab === 'users' && hasModuleAccess('users') && <UsersPage users={users} isLoading={usersLoading} showToast={showToast} />}
      </main>

      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} />
    </div>
  );
};

export default App;
