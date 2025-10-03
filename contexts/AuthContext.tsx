import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  auth, 
  fetchRoles, 
  FirebaseUser,
  fetchUserProfile,
  createUserProfileInDB,
} from '../services/firebaseService';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  hasModuleAccess: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALL_ROLES = fetchRoles();

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let userProfileData = await fetchUserProfile(firebaseUser.uid);

          // If user profile doesn't exist in DB, create it.
          // This is a special bootstrap for the first admin user.
          if (!userProfileData) {
            const initialRole = firebaseUser.email === 'andersoncamposjr@gmail.com' ? 'admin' : 'viewer';
            await createUserProfileInDB(firebaseUser, initialRole);
            userProfileData = await fetchUserProfile(firebaseUser.uid);
          }
          
          if (userProfileData) {
            const permissions = ALL_ROLES[userProfileData.role] || ALL_ROLES['viewer'];
            const userProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: userProfileData.role,
              permissions: permissions,
            };
            setProfile(userProfile);
          }
          
          setUser(firebaseUser);
        } catch (error) {
          console.error("Error setting up user profile:", error);
          setUser(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const hasModuleAccess = useCallback((module: string): boolean => {
    return profile?.permissions?.modules?.includes(module) ?? false;
  }, [profile]);
  
  return (
    <AuthContext.Provider value={{ user, profile, loading, hasModuleAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};