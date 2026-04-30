import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import { ProtectedRoute } from './components/ProtectedRoute'; // Importe aqui

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
        </Routes>
      </Router>
    </div>
    
  );
}

export default AppRoutes;