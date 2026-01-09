import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Projects from './pages/Projects';
import Calendar from './pages/Calendar';
import Finance from './pages/Finance';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import { ClientSelectionView } from './pages/ClientSelectionView';
import MainLayout from './layouts/MainLayout';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
      <div className="flex flex-col items-center gap-1 text-center">
        <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">
          Bu modül henüz geliştirme aşamasındadır.
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
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
          <Route path="inventory" element={<Inventory />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<div className="p-4">Sayfa bulunamadı</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
