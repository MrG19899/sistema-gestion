import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { MainLayout } from './components/Layout/MainLayout';
import { ClientesPage } from './pages/ClientesPage';
import { LimpiezaPage } from './pages/LimpiezaPage';
import { AlfombrasPage } from './pages/AlfombrasPage';
import { PlagasPage } from './pages/PlagasPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { ConfigurationPage } from './pages/ConfigurationPage';
import { InternalBoardPage } from './pages/InternalBoardPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute allowedRoles={['adminsupremo', 'admin', 'worker']}><MainLayout /></ProtectedRoute>}>
            {/* Rutas de acceso restringido solo para Administradores de la directiva */}
            <Route path="/" element={<ProtectedRoute allowedRoles={['adminsupremo', 'admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute allowedRoles={['adminsupremo', 'admin']}><ClientesPage /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute allowedRoles={['adminsupremo', 'admin']}><ReportsPage /></ProtectedRoute>} />
            <Route path="/configuracion" element={<ProtectedRoute allowedRoles={['adminsupremo', 'admin']}><ConfigurationPage /></ProtectedRoute>} />
            <Route path="/cartola" element={<ProtectedRoute allowedRoles={['adminsupremo', 'admin']}><InternalBoardPage /></ProtectedRoute>} />

            {/* Rutas MUY restringidas (Solo Admin Supremo) */}
            <Route path="/usuarios" element={<ProtectedRoute allowedRoles={['adminsupremo']}><UsersPage /></ProtectedRoute>} />

            {/* Rutas Compartidas (Admin + Worker) */}
            <Route path="/limpieza" element={<LimpiezaPage />} />
            <Route path="/alfombras" element={<AlfombrasPage />} />
            <Route path="/plagas" element={<PlagasPage />} />

            {/* Rutas Auxiliares */}
            <Route path="/unauthorized" element={<div className="p-8 text-center text-red-500 font-bold">No tienes permisos para ver esta página.</div>} />
            <Route path="/inactive" element={<div className="p-8 text-center text-orange-500 font-bold">Tu cuenta está inactiva. Contacta al administrador.</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
