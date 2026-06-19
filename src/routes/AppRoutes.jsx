import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';

import Login from '../pages/Login';
import Inicio from '../pages/Inicio';
import Turmas from '../pages/Turmas';
import CadastrarFaltas from '../pages/CadastrarFaltas';
import Metricas from '../pages/Metricas';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Login /></ProtectedRoute>} />
        <Route path="/inicio" element={<ProtectedRoute><Inicio /></ProtectedRoute>} />
        <Route path="/turmas" element={<ProtectedRoute><Turmas /></ProtectedRoute>} />
        <Route path="/cadastrarfaltas" element={<ProtectedRoute><CadastrarFaltas /></ProtectedRoute>} />
        <Route path="/metricas" element={<ProtectedRoute><Metricas /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;