import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const AdminRoute = ({ children }) => {
  const { isAdmin } = useAuth();

  return isAdmin() ? children : <Navigate to="/" />;
};

export default AdminRoute;
