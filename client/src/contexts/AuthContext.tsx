import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getIdToken
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { User, LoginRequest, RegisterRequest } from '@shared/types';
import { auth, db } from '../config/firebase';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// Helper function to sync Firebase Auth user with Firestore user data
const syncUserData = async (firebaseUser: FirebaseUser): Promise<User | null> => {
  try {
    // Get user document from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      
      // Get ID token for API calls
      const token = await getIdToken(firebaseUser);
      localStorage.setItem('campusbuddy_token', token);
      authApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return userData;
    } else {
      // User document doesn't exist, create it
      // This shouldn't happen if registration is done correctly, but handle it gracefully
      console.warn('User document not found in Firestore, creating...');
      
      const userData: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        batch: '',
        role: 'student',
        joinedAt: Date.now(),
        badges: [],
        points: 0,
        profilePicture: firebaseUser.photoURL,
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...userData,
        updatedAt: serverTimestamp(),
      });
      
      const token = await getIdToken(firebaseUser);
      localStorage.setItem('campusbuddy_token', token);
      authApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return userData;
    }
  } catch (error: any) {
    // If Firestore is offline or temporarily unavailable, fall back to basic auth user data
    if (error?.code === 'unavailable') {
      console.warn('Firestore unavailable or client offline, using basic Firebase user data');
      const fallbackUser: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        batch: '',
        role: 'student',
        joinedAt: Date.now(),
        badges: [],
        points: 0,
        profilePicture: firebaseUser.photoURL || undefined,
      };

      // Still try to issue a token so the API works
      try {
        const token = await getIdToken(firebaseUser);
        localStorage.setItem('campusbuddy_token', token);
        authApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (tokenError) {
        console.error('Error getting ID token while offline:', tokenError);
      }

      return fallbackUser;
    }

    console.error('Error syncing user data:', error);
    return null;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Immediately set a basic user so the app can render fast
          const basicUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || '',
            email: firebaseUser.email || '',
            batch: '',
            role: 'student',
            joinedAt: Date.now(),
            badges: [],
            points: 0,
            profilePicture: firebaseUser.photoURL || undefined,
          };

          setUser((prev) => prev ?? basicUser);

          // In the background, sync full user data from Firestore
          void syncUserData(firebaseUser).then((userData) => {
            if (userData) {
              setUser(userData);
            }
          }).catch((error) => {
            console.error('Auth state change sync error:', error);
          });
        } else {
          // User is signed out
          setUser(null);
          localStorage.removeItem('campusbuddy_token');
          delete authApi.defaults.headers.common['Authorization'];
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
        localStorage.removeItem('campusbuddy_token');
        delete authApi.defaults.headers.common['Authorization'];
      } finally {
        // We always consider initialization done after the first auth state
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const { email, password } = credentials;
      
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Sync user data from Firestore
      const userData = await syncUserData(userCredential.user);
      
      if (userData) {
        setUser(userData);
        toast.success(`Welcome back, ${userData.name}!`);
      } else {
        throw new Error('Failed to load user data');
      }
    } catch (error: any) {
      let errorMessage = 'Login failed';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const { email, password, name, batch } = userData;
      
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      // Note: We'll need to update this via the backend to set custom claims
      // For now, create the user document in Firestore
      const newUser: User = {
        id: userCredential.user.uid,
        name,
        email,
        batch,
        role: 'student',
        joinedAt: Date.now(),
        badges: [],
        points: 0,
      };
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        ...newUser,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Call backend to set custom claims (batch, role)
      try {
        const token = await getIdToken(userCredential.user);
        await authApi.post('/register-complete', {
          batch,
          name,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Error setting custom claims:', error);
        // Continue anyway, user is created
      }
      
      // Sync user data
      const syncedUser = await syncUserData(userCredential.user);
      
      if (syncedUser) {
        setUser(syncedUser);
        toast.success(`Welcome to Campus Buddy, ${syncedUser.name}!`);
      } else {
        setUser(newUser);
        toast.success(`Welcome to Campus Buddy, ${name}!`);
      }
    } catch (error: any) {
      let errorMessage = 'Registration failed';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      
      // Clear local storage
      localStorage.removeItem('campusbuddy_token');
      
      // Remove token from API headers
      delete authApi.defaults.headers.common['Authorization'];
      
      // Clear user (this will be handled by onAuthStateChanged, but set it here too)
      setUser(null);
      
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
