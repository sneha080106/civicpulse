import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LandingPage from './pages/LandingPage';
import CitizenInputPage from './pages/CitizenInputPage';
import DashboardPage from './pages/DashboardPage';
import PrioritiesPage from './pages/PrioritiesPage';
import PriorityDetailPage from './pages/PriorityDetailPage';
import MessagingSimulatorPage from './pages/MessagingSimulatorPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import ProtectedRoute from './components/ProtectedRoute';
import { STAFF_ROLES } from './utils/roles';

const App = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/citizen" element={<CitizenInputPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/priorities" element={<PrioritiesPage />} />
        <Route path="/priorities/:id" element={<PriorityDetailPage />} />
        <Route path="/messaging-simulator" element={<MessagingSimulatorPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={STAFF_ROLES}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
};

export default App;
