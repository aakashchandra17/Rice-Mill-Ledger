import { useAuth } from '../context/AuthContext';
import FarmerDetail from './FarmerDetail';

export default function MyLedger() {
  const { user } = useAuth();
  return <FarmerDetail farmerId={user.farmerId} />;
}