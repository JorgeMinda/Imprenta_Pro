// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { API_BASE } from '../api/config';

interface User {
  id?: string;
  nombre: string;
  email: string;
  rol: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; msg?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // empieza en true hasta leer localStorage

  // ── Restaurar sesión ──────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser  = localStorage.getItem('user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false); // ← CRÍTICO: solo aquí se desbloquea el render
    }
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    try {
      const res  = await fetch(`${API_BASE}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, msg: data.msg || 'Credenciales inválidas' };

      localStorage.setItem('token', data.token);
      localStorage.setItem('user',  JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { ok: true };
    } catch {
      return { ok: false, msg: 'No se pudo conectar al servidor' };
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}