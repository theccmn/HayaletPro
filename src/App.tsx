import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Projects from './pages/Projects';
import Calendar from './pages/Calendar';
import Finance from './pages/Finance';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Inventory from './pages/Inventory';
import FaceRecognition from './pages/FaceRecognition';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { ClientSelectionView } from './pages/ClientSelectionView';
import MainLayout from './layouts/MainLayout';
import { Toaster } from 'sonner';
import { GoogleAuthProviderWrapper } from './components/GoogleAuthProviderWrapper';
import { AuthProvider } from './contexts/AuthContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import ProjectDetail from './pages/ProjectDetail';
import OverduePayments from './pages/OverduePayments';
import UpcomingProjects from './pages/UpcomingProjects';

import TemplateBuilder from './pages/TemplateBuilder';
import Workflows from './pages/Workflows';

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppSettingsProvider>
          <GoogleAuthProviderWrapper>
            <Toaster richColors position="top-center" />
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/select/:token" element={<ClientSelectionView />} />

              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="projects" element={<Projects />} />
                <Route path="projects/:id" element={<ProjectDetail />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="finance" element={<Finance />} />
                <Route path="clients" element={<Clients />} />
                <Route path="clients/:id" element={<ClientDetail />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="face-recognition" element={<FaceRecognition />} />
                <Route path="workflows" element={<Workflows />} />
                <Route path="settings" element={<Settings />} />
                <Route path="overdue-payments" element={<OverduePayments />} />
                <Route path="upcoming-projects" element={<UpcomingProjects />} />
                <Route path="templates/new" element={<TemplateBuilder />} />
                <Route path="templates/:id" element={<TemplateBuilder />} />
                <Route path="*" element={<div className="p-4">Sayfa bulunamadı</div>} />
              </Route>
            </Routes>
          </GoogleAuthProviderWrapper>
        </AppSettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
