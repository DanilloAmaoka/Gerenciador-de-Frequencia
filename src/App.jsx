import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Turmas from './pages/Turmas';
import CadastrarFaltas from './pages/CadastrarFaltas';
import { ProtectedRoute } from './components/ProtectedRoute';
import Criar_Turma from './pages/Criar_Turma';

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
        </Routes>
      </Router>
    </div>
    
  );
}

export default AppRoutes;