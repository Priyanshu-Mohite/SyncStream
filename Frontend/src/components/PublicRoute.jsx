import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Jab tak background me token check ho raha hai, tab tak wait karo
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px', color: 'white' }}>
        <h2>Checking session...</h2>
      </div>
    );
  }

  // Agar token mil gaya aur user LOGGED IN hai, toh usko entry mat do. 
  // Seedha Dashboard par dhakka maar do.
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Agar user sach me logged out hai, toh usko Landing/Login page dikha do
  return children;
};

export default PublicRoute;