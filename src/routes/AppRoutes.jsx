import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Login from '../pages/Login';
import Inicio from '../pages/Inicio';
import Turmas from '../pages/Turmas';
import TurCadastrarFaltas from '../pages/CadastrarFaltas';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/turmas" element={<Turmas />} />
        <Route path="/cadastrarfaltas" element={<CadastrarFaltas />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;