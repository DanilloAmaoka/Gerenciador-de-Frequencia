import { Navigate } from 'react-router-dom';
import { auth } from '../firebase/config';

export const ProtectedRoute = ({ children }) => {
  if (!auth.currentUser) {
    return <Navigate to="/" />;
  }

  return children;
};