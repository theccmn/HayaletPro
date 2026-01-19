import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Projects from './pages/Projects';
import Calendar from './pages/Calendar';
import Finance from './pages/Finance';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import { ClientSelectionView } from './pages/ClientSelectionView';
import MainLayout from './layouts/MainLayout';
import { Toaster } from 'sonner';
import { GoogleAuthProviderWrapper } from './components/GoogleAuthProviderWrapper';



function App() {
  return (
    <BrowserRouter>
      <GoogleAuthProviderWrapper>
        <Toaster richColors position="top-center" />
        <Routes>
          {/* Public Standalone Selection View */}
          <Route path="/select/:token" element={<ClientSelectionView />} />

          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="finance" element={<Finance />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<div className="p-4">Sayfa bulunamadı</div>} />
          </Route>
        </Routes>
      </GoogleAuthProviderWrapper>
    </BrowserRouter>
  );
}

export default App;
