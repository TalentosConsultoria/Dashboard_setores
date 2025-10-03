import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { 
  getDatabase,
  ref,
  onValue,
  push,
  set,
  remove,
  update,
  serverTimestamp,
  query,
  orderByChild,
  get,
} from "firebase/database";
import type { Note, UserRole, Role, User } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyC-XUKRowHPdUkC9W9sBOAo8oAVb_AabUM",
  authDomain: "dashboard-nremp.firebaseapp.com",
  databaseURL: "https://dashboard-nremp-default-rtdb.firebaseio.com",
  projectId: "dashboard-nremp",
  storageBucket: "dashboard-nremp.firebasestorage.app",
  messagingSenderId: "334752740963",
  appId: "1:334752740963:web:e7448b2eff74bc39096a56",
  measurementId: "G-8CRVV52D8L"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Authentication
export { onAuthStateChanged, signInWithEmailAndPassword, firebaseSignOut };
export type { FirebaseUser };


// ========== USER PROFILE & ROLES SERVICE ==========
const usersRef = ref(db, 'users');

export const fetchRoles = (): Record<UserRole, Role> => {
  // This defines the permissions for each role.
  return {
    admin: { canEdit: true, canView: true, modules: ['dashboard', 'gerenciamento', 'frota', 'users'] },
    editor: { canEdit: true, canView: true, modules: ['dashboard', 'gerenciamento', 'frota'] },
    viewer: { canEdit: false, canView: true, modules: ['dashboard'] },
  };
};

export const fetchUserProfile = async (uid: string): Promise<User | null> => {
    const userSnapshot = await get(ref(db, `users/${uid}`));
    return userSnapshot.exists() ? userSnapshot.val() : null;
};

export const createUserProfileInDB = (user: FirebaseUser, role: UserRole = 'viewer'): Promise<void> => {
    const userProfile: User = {
        uid: user.uid,
        email: user.email || 'N/A',
        role: role,
    };
    return set(ref(db, `users/${user.uid}`), userProfile);
};

export const adminCreateUser = async (email: string, password: string, role: UserRole) => {
  const secondaryAppName = 'secondary-auth-app';
  const secondaryApp = getApps().find(app => app.name === secondaryAppName) || initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const newUser = userCredential.user;

    const userProfile: User = {
      uid: newUser.uid,
      email: newUser.email || email,
      role: role,
    };
    await set(ref(db, `users/${newUser.uid}`), userProfile);
  } catch (error) {
    console.error("Error creating user from admin panel:", error);
    throw error;
  } finally {
    // Sign out the newly created user from the temporary auth instance to clean up the session.
    if (secondaryAuth.currentUser) {
      await firebaseSignOut(secondaryAuth);
    }
  }
};


export const subscribeToUsers = (callback: (users: User[]) => void) => {
  return onValue(usersRef, (snapshot) => {
    const data = snapshot.val();
    const userList = data ? Object.values(data) as User[] : [];
    callback(userList);
  });
};

export const updateUserRole = (uid: string, role: UserRole): Promise<void> => {
    const userRoleRef = ref(db, `users/${uid}/role`);
    return set(userRoleRef, role);
};

export const removeUser = (uid: string): Promise<void> => {
  const userRef = ref(db, `users/${uid}`);
  return remove(userRef);
};


// ========== NOTES REALTIME DATABASE SERVICE ==========
const notesRef = ref(db, 'notas_fiscais');

export const subscribeToNotes = (callback: (notes: Note[]) => void) => {
  const q = query(notesRef, orderByChild('createdAt'));
  return onValue(q, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const notes: Note[] = Object.entries(data)
// FIX: Explicitly type the return value of the map callback to `Note | null`.
// This ensures the object created conforms to the `Note` interface and resolves type inference issues.
        .map(([id, value]): Note | null => {
          // Robustness check: ensure value is a processable object
          if (value === null || typeof value !== 'object') {
            return null;
          }
          const rawNote = value as any;
          // Sanitize and provide default values to prevent crashes
          return {
            id,
            nNota: rawNote.nNota || undefined,
            cliente: rawNote.cliente || 'Cliente Desconhecido',
            categoria: rawNote.categoria || 'Sem Categoria',
            valor: typeof rawNote.valor === 'number' ? rawNote.valor : 0,
            dataEmissao: rawNote.dataEmissao || new Date(0).toISOString(),
            status: rawNote.status === 'Pago' ? 'Pago' : 'Não Pago',
            materialServico: rawNote.materialServico || undefined,
            veiculoPlaca: rawNote.veiculoPlaca || undefined,
            createdAt: rawNote.createdAt || 0,
          };
        })
        .filter((note): note is Note => note !== null); // Filter out any null (invalid) entries

      callback(notes.reverse());
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Firebase read error on 'notas_fiscais':", error);
    callback([]);
  });
};

export const addNote = (noteData: Omit<Note, 'id' | 'createdAt'>) => {
  const newNoteRef = push(notesRef);
  return set(newNoteRef, { ...noteData, createdAt: serverTimestamp() });
};

export const updateNote = (id: string, noteData: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
  const noteDocRef = ref(db, `notas_fiscais/${id}`);
  return update(noteDocRef, noteData);
};

export const deleteNote = (id: string) => {
  const noteDocRef = ref(db, `notas_fiscais/${id}`);
  return remove(noteDocRef);
};

export const importNotesFromCSV = async (notes: Omit<Note, 'id' | 'createdAt'>[]) => {
    const updates: { [key: string]: any } = {};
    notes.forEach(note => {
        const newNoteKey = push(notesRef).key;
        if (newNoteKey) {
          updates[`/notas_fiscais/${newNoteKey}`] = { ...note, createdAt: serverTimestamp() };
        }
    });
    return update(ref(db), updates);
};
