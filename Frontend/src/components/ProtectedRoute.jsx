import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth"; // Tera banaya hua hook[cite: 19]

const ProtectedRoute = ({ children }) => {
  // Context se pata karo user ki state kya hai
  const { user, loading } = useAuth();

  // CASE 1: App abhi just load hui hai aur backend se silent login (token check) chal raha hai.
  // Toh hum UI ko block karke bas ek loader dikhayenge.
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
        <h2>Loading StreamSync Secure Space...</h2>
      </div>
    );
  }

  // CASE 2: Token check ho gaya, aur user NULL mila (matlab sach me logged out hai).
  // Toh hum usko `<Navigate>` component use karke login page pe bhej denge.
  if (!user) {
    // Note: Yahan 'replace' likhna bohot zaroori hai. 
    // Isse history stack me current restricted page save nahi hoga, 
    // warna user browser ka 'Back' button dabayega toh wapas aane ki koshish karega.
    return <Navigate to="/auth" replace />;
  }

  // CASE 3: User logged in hai. 
  // Toh chup-chap jo component (children) usne manga tha, wo render kar do.
  return children;
};

export default ProtectedRoute;