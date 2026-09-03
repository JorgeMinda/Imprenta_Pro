// src/layouts/MainLayout.tsx
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificacionesPanel from '../components/NotificacionesPanel';
import BusquedaGlobal      from '../components/BusquedaGlobal';
import ThemeSwitcher       from '../components/ThemeSwitcher';
import {
  LayoutDashboard, FileText, ClipboardList, Users, Package,
  Warehouse, BarChart2, LogOut, ChevronLeft, ChevronRight,
  UserCog, Menu, Shield, Briefcase, User as UserIcon, Receipt, BookOpen
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard, roles: ['admin','vendedor','empleado','secretaria'] },
  { to: '/cotizaciones', label: 'Cotizaciones',  icon: FileText,        roles: ['admin','vendedor','secretaria'] },
  { to: '/ordenes',      label: 'Órdenes',       icon: ClipboardList,   roles: ['admin','vendedor','empleado','secretaria'] },
  { to: '/clientes',     label: 'Clientes',      icon: Users,           roles: ['admin','vendedor','secretaria'] },
  { to: '/productos',    label: 'Productos',     icon: Package,         roles: ['admin','vendedor','secretaria'] },
  { to: '/inventario',   label: 'Inventario',    icon: Warehouse,       roles: ['admin','vendedor','empleado','secretaria'] },
  { to: '/reportes',     label: 'Reportes',      icon: BarChart2,       roles: ['admin','vendedor','secretaria'] },
  { to: '/facturacion',  label: 'Facturación',   icon: Receipt,         roles: ['admin','vendedor','secretaria'] },
  { to: '/usuarios',     label: 'Usuarios',      icon: UserCog,         roles: ['admin'] },
];

const ROL_CONFIG = {
  admin:      { label: 'Administrador',             icon: Shield,    color: 'text-red-400' },
  vendedor:   { label: 'Vendedor',                  icon: Briefcase, color: 'text-blue-400' },
  secretaria: { label: 'Secretaria / Contabilidad', icon: BookOpen,  color: 'text-purple-400' },
  empleado:   { label: 'Empleado',                  icon: UserIcon,  color: 'text-gray-400' },
};

export default function MainLayout() {
  const { user, logout }   = useAuth();
  const navigate           = useNavigate();
  const location           = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const rol       = (user?.rol as keyof typeof ROL_CONFIG) ?? 'empleado';
  const rolCfg    = ROL_CONFIG[rol];
  const RolIcon   = rolCfg.icon;

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(rol));

  const NavLink = ({ item, onClick }: { item: typeof NAV_ITEMS[0]; onClick?: () => void }) => {
    const active = location.pathname === item.to ||
                   (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
    const Icon   = item.icon;

    return (
      <Link to={item.to} onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
          ${active
            ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 shadow-lg shadow-indigo-500/5'
            : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
          }`}
      >
        {active && (
          <motion.div layoutId="activeIndicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-indigo-400 to-purple-400 rounded-r-full" />
        )}
        <Icon className={`w-5 h-5 shrink-0 transition-colors
          ${active ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'}`}
        />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              key={item.to}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-sm font-medium truncate overflow-hidden whitespace-nowrap"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
        {collapsed && (
          <div className="absolute left-full ml-3 px-2.5 py-1.5 glass-float text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            {item.label}
          </div>
        )}
      </Link>
    );
  };

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-3 p-5 border-b border-white/5 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
          <span className="text-white text-xs font-black">IP</span>
        </div>
        <AnimatePresence key="sidebar-title">
          {!collapsed && (
            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }} className="overflow-hidden">
              <p className="text-white font-bold text-lg leading-none whitespace-nowrap">Imprenta PRO</p>
              <p className="text-indigo-400/70 text-xs mt-0.5">Sistema de Gestión</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item, i) => {
          const prevItem = visibleItems[i - 1];
          const showSeparator = item.to === '/usuarios' && prevItem;
          return (
            <div key={item.to}>
              {showSeparator && (
                <div className={`my-3 border-t border-white/5 ${collapsed ? 'mx-1' : 'mx-2'}`} />
              )}
              <NavLink item={item} onClick={onLinkClick} />
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/5">
        <Link to="/perfil" onClick={onLinkClick}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl glass border border-white/5
            hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-all group
            ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 text-white text-xs font-bold shadow group-hover:scale-105 transition-transform">
            {user?.nombre?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <AnimatePresence key="user-info">
            {!collapsed && (
              <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }} className="overflow-hidden flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.nombre}</p>
                <div className={`flex items-center gap-1 text-xs ${rolCfg.color}`}>
                  <RolIcon className="w-3 h-3" />
                  <span>{rolCfg.label}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        <button onClick={handleLogout}
          className={`mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400
            hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 text-sm font-medium
            border border-transparent hover:border-red-500/20 ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }} className="overflow-hidden whitespace-nowrap">
                Cerrar sesión
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)', backgroundImage: 'var(--bg-gradient)', backgroundAttachment: 'fixed' }}>

      {/* SIDEBAR DESKTOP */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:flex flex-col glass-sidebar shrink-0 overflow-hidden"
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(v => !v)}
          className="absolute -right-3 top-20 w-6 h-6 glass flex items-center justify-center text-gray-400 hover:text-white transition-all z-10 rounded-full"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </motion.aside>

      {/* SIDEBAR MOBILE */}
      <AnimatePresence key="mobile-menu">
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 glass-overlay z-40" />
            <motion.aside
              key="mobile-aside"
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-0 top-0 h-full w-64 z-50 glass-sidebar"
            >
              <SidebarContent onLinkClick={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* NAVBAR */}
        <header className="px-6 py-4 flex justify-between items-center glass-nav shrink-0">

          <button onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition mr-3">
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden md:block">
            <h1 className="text-lg font-semibold text-white">
              {NAV_ITEMS.find(i =>
                location.pathname === i.to ||
                (i.to !== '/dashboard' && location.pathname.startsWith(i.to))
              )?.label ?? 'Imprenta PRO'}
            </h1>
          </div>

          <div className="md:hidden flex-1">
            <h1 className="text-lg font-semibold text-white">
              {user?.rol === 'admin' ? 'Panel Administrativo' : 'Mis Trabajos'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <BusquedaGlobal />
            <NotificacionesPanel />

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 glass rounded-xl">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                {user?.nombre?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-300 font-medium">{user?.nombre}</span>
              <span className={`text-xs font-semibold ${rolCfg.color}`}>· {rolCfg.label}</span>
            </div>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 glass-btn px-4 py-2 text-sm"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </motion.button>

            <button onClick={handleLogout}
              className="sm:hidden p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
