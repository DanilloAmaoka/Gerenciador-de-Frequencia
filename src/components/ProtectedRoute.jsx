import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({ children }) => {
    const isAuth = localStorage.getItem("logado");

    if (!isAuth) {
        return <Navigate to="/" />;
    }

    return children;
};