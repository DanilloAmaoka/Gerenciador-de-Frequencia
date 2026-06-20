import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Turmas from './pages/Turmas';
import Alertas from './pages/Alertas';
import CadastrarFaltas from './pages/CadastrarFaltas';
import Metricas from './pages/Metricas';
import { ProtectedRoute } from './components/ProtectedRoute';

function AppRoutes() {
  return (
    <div className='fundo-geral'>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
            <Route 
              path="/inicio" 
              element={
                <ProtectedRoute>
                  <Inicio />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/turmas" 
              element={
                <ProtectedRoute>
                  <Turmas />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/cadastrarfaltas" 
              element={
                <ProtectedRoute>
                  <CadastrarFaltas />
                </ProtectedRoute>
              } 
            />

             <Route 
              path="/metricas" 
              element={
                <ProtectedRoute>
                  <Metricas />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/alertas" 
              element={
                <ProtectedRoute>
                  <Alertas />
                </ProtectedRoute>
              } 
            />
        </Routes>
      </Router>
    </div>
    
  );
}

export default AppRoutes;