import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Login from '../pages/Login';
import Inicio from '../pages/Inicio';
import Turmas from '../pages/Turmas';

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