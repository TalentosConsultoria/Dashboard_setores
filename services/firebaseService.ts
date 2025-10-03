
// Firebase v9+ modular imports
import { initializeApp, getApps, getApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, type User } from 'firebase/auth';
import { getDatabase, ref, onValue, get, set, push, update, remove, query, orderByChild, serverTimestamp } from 'firebase/database';

import type { Note, UserRole, Role, User as AppUser } from '../types';

// Your web app's Firebase configuration from user prompt
const firebaseConfig = {
  apiKey: "AIzaSyC-XUKRowHPdUkC9W9sBOAo8oAVb_AabUM",
  authDomain: "dashboard-nremp.firebaseapp.com",
  databaseURL: "https://dashboard-nremp-default-rtdb.firebaseio.com",
  projectId: "dashboard-nremp",
  storageBucket: "dashboard-nremp.appspot.com",
  messagingSenderId: "334752740963",
  appId: "1:334752740963:web:e7448b2eff74bc39096a56",
  measurementId: "G-8CRVV52D8L"
};

// Use v9 initialization pattern.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getDatabase(app);

// Export User type from 'firebase/auth' for use in other parts of the app
export { type User as FirebaseUser };

// Auth functions updated to v9 syntax.
export const signInWithCredentials = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const signOutUser = () => signOut(auth);
export const onAuthStateChanged_ = (callback: (user: User | null) => void) => onAuthStateChanged(auth, callback);
// Renamed to avoid conflict with the imported function name
export { onAuthStateChanged_ as onAuthStateChanged };


// ========== USER PROFILE & ROLES SERVICE ==========

export const fetchRoles = (): Record<UserRole, Role> => {
  return {
    admin: { canEdit: true, canView: true, modules: ['dashboard', 'gerenciamento', 'frota', 'users'] },
    editor: { canEdit: true, canView: true, modules: ['dashboard', 'gerenciamento', 'frota'] },
    viewer: { canEdit: false, canView: true, modules: ['dashboard'] },
  };
};

export const fetchUserProfile = async (uid: string): Promise<AppUser | null> => {
    // Use v9 Realtime Database syntax
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? snapshot.val() : null;
};

export const createUserProfileInDB = (user: User, role: UserRole = 'viewer'): Promise<void> => {
    const userProfile: AppUser = {
        uid: user.uid,
        email: user.email || 'N/A',
        role: role,
    };
    // Use v9 Realtime Database syntax
    return set(ref(db, `users/${user.uid}`), userProfile);
};

export const adminCreateUser = async (email: string, password: string, role: UserRole) => {
  const tempAppName = 'temp-user-creation-' + Date.now();
  // Use v9 initialization and auth syntax
  const tempApp: FirebaseApp = initializeApp(firebaseConfig, tempAppName);
  try {
    const tempAuth = getAuth(tempApp);
    
    const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
    const newUser = userCredential.user;

    if (!newUser) {
      throw new Error("User creation failed, user object is null.");
    }

    const userProfile: AppUser = {
      uid: newUser.uid,
      email: newUser.email || email,
      role: role,
    };
    // Use the main database instance to set the profile
    // Use v9 Realtime Database syntax
    await set(ref(db, `users/${newUser.uid}`), userProfile);
  } catch (error) {
    console.error("Error creating user from admin panel:", error);
    throw error;
  } finally {
    // Use v9 delete app syntax
    await deleteApp(tempApp);
  }
};

export const subscribeToUsers = (callback: (users: AppUser[]) => void): (() => void) => {
  // Use v9 Realtime Database syntax
  const usersRef = ref(db, 'users');
  const unsubscribe = onValue(usersRef, (snapshot) => {
    const data = snapshot.val();
    const userList = data ? Object.values(data) as AppUser[] : [];
    callback(userList);
  });
  // Return a v9-compatible unsubscribe function
  return unsubscribe;
};

export const updateUserRole = (uid: string, role: UserRole): Promise<void> => {
    // Use v9 Realtime Database syntax
    return set(ref(db, `users/${uid}/role`), role);
};

export const removeUser = (uid: string): Promise<void> => {
  // Use v9 Realtime Database syntax
  return remove(ref(db, `users/${uid}`));
};

// ========== NOTES REALTIME DATABASE SERVICE ==========
const sanitizeNote = (id: string, rawNote: any): Note | null => {
  if (rawNote === null || typeof rawNote !== 'object') return null;
  let valor = 0;
  if (typeof rawNote.valor === 'number') valor = rawNote.valor;
  else if (typeof rawNote.valor === 'string') {
    const num = parseFloat(rawNote.valor.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(num)) valor = num;
  }
  let dataEmissao = new Date(0).toISOString();
  if (rawNote.dataEmissao && typeof rawNote.dataEmissao === 'string') {
    let date;
    const brazilMatch = rawNote.dataEmissao.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brazilMatch) {
      const [, day, month, year] = brazilMatch.map(Number);
      date = new Date(Date.UTC(year, month - 1, day));
    } else {
      date = new Date(rawNote.dataEmissao);
    }
    if (date && !isNaN(date.getTime())) dataEmissao = date.toISOString();
  }
  const cliente = (rawNote.cliente ? String(rawNote.cliente) : 'Cliente Desconhecido').trim();
  const categoria = (rawNote.categoria ? String(rawNote.categoria) : 'Sem Categoria').trim();
  const nNota = rawNote.nNota ? String(rawNote.nNota).trim() : undefined;
  const materialServico = rawNote.materialServico ? String(rawNote.materialServico).trim() : undefined;
  const veiculoPlaca = rawNote.veiculoPlaca ? String(rawNote.veiculoPlaca).toUpperCase().trim() : undefined;
  const status = rawNote.status === 'Pago' ? 'Pago' : 'Não Pago';
  const createdAt = typeof rawNote.createdAt === 'number' ? rawNote.createdAt : 0;
  return { id, nNota, cliente, categoria, valor, dataEmissao, status, materialServico, veiculoPlaca, createdAt };
};

export const subscribeToNotes = (callback: (notes: Note[]) => void): (() => void) => {
  // Use v9 Realtime Database syntax
  const notesQuery = query(ref(db, 'notas_fiscais'), orderByChild('createdAt'));
  
  const unsubscribe = onValue(notesQuery, (snapshot) => {
    const data = snapshot.val();
    if (data && typeof data === 'object') {
      const notes: Note[] = Object.entries(data)
        .map(([id, value]) => sanitizeNote(id, value))
        .filter((note): note is Note => note !== null);
      callback(notes.reverse());
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Firebase read error on 'notas_fiscais':", error);
    callback([]);
  });

  // Return a v9-compatible unsubscribe function
  return unsubscribe;
};

export const addNote = (noteData: Omit<Note, 'id' | 'createdAt'>) => {
  // Use v9 Realtime Database syntax
  const newNoteRef = push(ref(db, 'notas_fiscais'));
  return set(newNoteRef, { ...noteData, createdAt: serverTimestamp() });
};

export const updateNote = (id: string, noteData: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
  // Use v9 Realtime Database syntax
  return update(ref(db, `notas_fiscais/${id}`), noteData);
};

export const deleteNote = (id: string) => {
  // Use v9 Realtime Database syntax
  return remove(ref(db, `notas_fiscais/${id}`));
};

export const importNotesFromCSV = async (notes: Omit<Note, 'id' | 'createdAt'>[]) => {
    const updates: { [key: string]: any } = {};
    const notesRef = ref(db, 'notas_fiscais');
    notes.forEach(note => {
        // Use v9 Realtime Database syntax
        const newNoteKey = push(notesRef).key;
        if (newNoteKey) {
          updates[`/notas_fiscais/${newNoteKey}`] = { ...note, createdAt: serverTimestamp() };
        }
    });
    // Use v9 Realtime Database syntax
    return update(ref(db), updates);
};
