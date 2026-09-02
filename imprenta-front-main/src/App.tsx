import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ConfirmProvider } from './components/ConfirmModal';

import MainLayout    from './layouts/MainLayout';
import Login         from './pages/Login';
import Dashboard     from './pages/Dashboard';
import Cotizaciones  from './pages/Cotizaciones';
import Ordenes       from './pages/Ordenes';
import Clientes      from './pages/Clientes';
import Productos     from './pages/Productos';
import Inventario    from './pages/Inventario';
import Reportes      from './pages/Reportes';
import Usuarios      from './pages/Usuarios';
import Perfil        from './pages/Perfil';
import Facturacion   from './pages/Facturacion';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-3 h-3 rounded-full bg-indigo-500 animate-bounce"
            style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    </div>
  );
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ConfirmProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="cotizaciones" element={<Cotizaciones />} />
            <Route path="ordenes" element={<Ordenes />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="productos" element={<Productos />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="facturacion" element={<Facturacion />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ConfirmProvider>
    </BrowserRouter>
  );
}