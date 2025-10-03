
import React, { useState, useMemo } from 'react';
import type { Note } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Select, Modal, IconPlusCircle, IconUploadCloud, IconSearch, IconEdit, IconTrash2, IconFileText } from './ui';
import { addNote, updateNote, deleteNote, importNotesFromCSV } from '../services/firebaseService';
import Papa from 'papaparse';

interface ManagementProps {
  notes: Note[];
  isLoading: boolean;
  showToast: (message: string, type: 'success' | 'error') => void;
}

// ========== DATE HELPERS ==========
const parseDateString = (dateStr: string | undefined | null): Date | null => {
  if (!dateStr) return null;
  const brazilMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brazilMatch) {
    const [, day, month, year] = brazilMatch.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return isNaN(date.getTime()) ? null : date;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

const toInputDate = (isoString: string | undefined): string => {
  if (!isoString) return '';
  try {
    return isoString.split('T')[0];
  } catch {
    return '';
  }
};

const formatDate = (isoString: string): string => {
  if (!isoString) return 'Data Inválida';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return 'Data Inválida';
  }
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};


// ========== COMPONENTS ==========
const NoteModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  showToast: (message: string, type: 'success' | 'error') => void;
}> = ({ isOpen, onClose, note, showToast }) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const parsedDate = parseDateString(data.dataEmissao as string);

    if (!parsedDate) {
      showToast('O formato da data é inválido.', 'error');
      setIsSaving(false);
      return;
    }

    const noteData = {
      nNota: data.nNota as string,
      cliente: data.cliente as string,
      materialServico: data.materialServico as string,
      categoria: data.categoria as string,
      dataEmissao: parsedDate.toISOString(),
      valor: parseFloat(data.valor as string) || 0,
      status: data.status as 'Pago' | 'Não Pago',
      veiculoPlaca: (data.veiculoPlaca as string).toUpperCase(),
    };
    
    try {
      if (note?.id) {
        await updateNote(note.id, noteData);
        showToast('Registro atualizado com sucesso!', 'success');
      } else {
        await addNote(noteData as Omit<Note, 'id' | 'createdAt'>);
        showToast('Registro adicionado com sucesso!', 'success');
      }
      onClose();
    } catch (error) {
      console.error("Failed to save note:", error);
      showToast('Erro ao salvar o registro.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={note ? 'Editar Registro' : 'Adicionar Registro'}>
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium">Cliente</label>
              <Input id="cliente" name="cliente" defaultValue={note?.cliente || ''} required className="mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium">Material/Serviço</label>
              <Input id="materialServico" name="materialServico" defaultValue={note?.materialServico || ''} className="mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium">Placa do Veículo (Opcional)</label>
              <Input id="veiculoPlaca" name="veiculoPlaca" defaultValue={note?.veiculoPlaca || ''} className="mt-1" placeholder="AAA0A00" />
            </div>
             <div>
              <label className="block text-sm font-medium">Nº da Nota</label>
              <Input id="nNota" name="nNota" defaultValue={note?.nNota || ''} className="mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium">Categoria</label>
              <Input id="categoria" name="categoria" defaultValue={note?.categoria || ''} required className="mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium">Data</label>
              <Input type="date" id="dataEmissao" name="dataEmissao" defaultValue={toInputDate(note?.dataEmissao) || new Date().toISOString().split('T')[0]} required className="mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium">Valor Total (R$)</label>
              <Input type="number" id="valor" name="valor" min="0" step="0.01" defaultValue={note?.valor || ''} required className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium">Status</label>
              <Select id="status" name="status" defaultValue={note?.status || 'Não Pago'} required className="mt-1">
                <option value="Não Pago">Não Pago</option>
                <option value="Pago">Pago</option>
              </Select>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  );
};


export const Management: React.FC<ManagementProps> = ({ notes, isLoading, showToast }) => {
  const { profile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = useMemo(() => {
    return notes.filter(note =>
      (note.nNota || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.cliente || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.categoria || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.materialServico || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [notes, searchQuery]);
  
  const handleAddClick = () => {
    setSelectedNote(null);
    setIsModalOpen(true);
  };
  
  const handleEditClick = (note: Note) => {
    setSelectedNote(note);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este registro?')) {
      try {
        await deleteNote(id);
        showToast('Registro excluído com sucesso!', 'success');
      } catch (error) {
        console.error('Failed to delete note:', error);
        showToast('Erro ao excluir o registro.', 'error');
      }
    }
  };
  
  const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const notesToUpload = (results.data as any[]).map(row => {
          const valor = parseFloat((row['Valor'] || row['Valor Total'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
          const dataStr = row['Data'] || row['data'] || row['Data Emissao'] || row['dataEmissao'];
          const cliente = row['Cliente'] || row['Fornecedor'];
          const nNota = row['N Nota'] || row['nnota'] || row['nNota'];
          const veiculoPlaca = row['Placa'] || row['placa'];
          
          const parsedDate = parseDateString(dataStr);

          if (!cliente || !parsedDate || !valor) return null;
          
          return {
            nNota,
            cliente,
            valor,
            status: row['Status'] === 'Pago' ? 'Pago' : 'Não Pago',
            categoria: row['Categoria'] || 'Importado',
            dataEmissao: parsedDate.toISOString(),
            materialServico: row['Material/Serviço'] || '',
            veiculoPlaca: veiculoPlaca ? veiculoPlaca.toUpperCase() : undefined,
          };
        }).filter(Boolean) as Omit<Note, 'id' | 'createdAt'>[];

        if (notesToUpload.length > 0) {
          try {
            await importNotesFromCSV(notesToUpload);
            showToast(`${notesToUpload.length} registros importados com sucesso!`, 'success');
          } catch (err) {
            console.error("Error importing CSV:", err);
            showToast('Falha na importação do CSV.', 'error');
          }
        } else {
          showToast('Nenhuma linha válida encontrada no CSV.', 'error');
        }
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
        showToast('Erro ao ler o arquivo CSV.', 'error');
      }
    });
    event.target.value = ''; // Reset file input
  };
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Controle de Registros</h1>
          <p className="text-gray-400">Gerencie os dados da sua planilha em tempo real.</p>
        </div>
        {profile?.permissions.canEdit && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => document.getElementById('csv-importer')?.click()}>
              <IconUploadCloud className="w-4 h-4" /> Importar CSV
            </Button>
            <input type="file" id="csv-importer" accept=".csv" className="hidden" onChange={handleCsvImport} />
            <Button onClick={handleAddClick}>
              <IconPlusCircle className="w-4 h-4" /> Adicionar Registro
            </Button>
          </div>
        )}
      </header>

      <div className="mb-4 relative">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input 
          placeholder="Buscar por cliente, categoria, material..." 
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-700">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nº Nota</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Material/Serviço</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Placa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Valor</th>
                {profile?.permissions.canEdit && <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr><td colSpan={profile?.permissions.canEdit ? 8 : 7} className="text-center py-16 text-gray-400">Carregando dados...</td></tr>
              ) : filteredNotes.length > 0 ? (
                filteredNotes.map(note => (
                  <tr key={note.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">{note.nNota || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-200 whitespace-nowrap">{note.cliente}</td>
                    <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">{note.materialServico || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">{note.veiculoPlaca || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">{formatDate(note.dataEmissao)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${note.status === 'Pago' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {note.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 font-semibold whitespace-nowrap">{formatCurrency(note.valor)}</td>
                    {profile?.permissions.canEdit && (
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <Button variant="ghost" className="p-1 h-auto" onClick={() => handleEditClick(note)}><IconEdit className="w-5 h-5 text-blue-400" /></Button>
                        <Button variant="ghost" className="p-1 h-auto" onClick={() => handleDeleteClick(note.id)}><IconTrash2 className="w-5 h-5 text-red-400" /></Button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={profile?.permissions.canEdit ? 8 : 7} className="text-center py-16">
                    <IconFileText className="mx-auto h-12 w-12 text-gray-500" />
                    <h3 className="mt-2 text-sm font-medium text-gray-200">Nenhum registro encontrado</h3>
                    <p className="mt-1 text-sm text-gray-400">Adicione um novo registro para começar.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {profile?.permissions.canEdit && <NoteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} note={selectedNote} showToast={showToast} />}
    </div>
  );
};
