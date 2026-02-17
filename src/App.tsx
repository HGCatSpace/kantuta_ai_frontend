import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CasosPage from './pages/CasosPage';
import CasoDetailPage from './pages/CasoDetailPage';
import ChatPage from './pages/ChatPage';
import BibliotecaPage from './pages/BibliotecaPage';
import UsuariosPage from './pages/UsuariosPage';
import AuditoriaCasosPage from './pages/AuditoriaCasosPage';
import ResumenAuditoriaPage from './pages/ResumenAuditoriaPage';
import GestionPromptsPage from './pages/GestionPromptsPage';
import EditorPromptPage from './pages/EditorPromptPage';
import BaseConocimientoPage from './pages/BaseConocimientoPage';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './routes/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas con sidebar */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/casos" element={<CasosPage />} />
          <Route path="/casos/:id" element={<CasoDetailPage />} />
          <Route path="/casos/:casoId/chat/:sessionId" element={<ChatPage />} />
          <Route path="/biblioteca" element={<BibliotecaPage />} />
          <Route path="/admin/users" element={<UsuariosPage />} />
          <Route path="/revision" element={<AuditoriaCasosPage />} />
          <Route path="/revision/:casoNumero/resumen" element={<ResumenAuditoriaPage />} />
          <Route path="/prompts" element={<GestionPromptsPage />} />
          <Route path="/prompts/:idPrompt/editar" element={<EditorPromptPage />} />
          <Route path="/base_de_conocimiento" element={<BaseConocimientoPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
