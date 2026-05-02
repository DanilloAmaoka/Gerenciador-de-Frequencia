import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Login from '../pages/Login';
import Inicio from '../pages/Inicio';
import Turmas from '../pages/Turmas';
import Turmas from '../pages/Turma';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/turmas" element={<Turmas />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;