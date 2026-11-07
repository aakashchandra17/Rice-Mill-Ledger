
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import { weekIntake } from '../mockData';
import { useAuth } from './AuthContext';

import {
  getFarmers,
  createFarmer,
  recordIntake,
  recordPayment,
} from '../api';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { token, user } = useAuth();

  const [farmers, setFarmers] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [farmersLoading, setFarmersLoading] = useState(false);
  const [farmersError, setFarmersError] = useState('');

  const today = () => new Date().toISOString().slice(0, 10);

  // Load farmers from the actual backend.
  const refreshFarmers = useCallback(async () => {
    if (!token) {
      setFarmers([]);
      return;
    }

    setFarmersLoading(true);
    setFarmersError('');

    try {
      const data = await getFarmers(token);

      const normalizedFarmers = (Array.isArray(data) ? data : []).map(
        (farmer) => ({
          ...farmer,
          id: Number(farmer.id),
          name: farmer.name || '',
          village: farmer.village || '',
          stock: Number(farmer.stock || 0),
          owed: Number(farmer.owed || 0),
        })
      );

      setFarmers(normalizedFarmers);
    } catch (error) {
      setFarmersError(error.message || 'Unable to load farmers.');
      throw error;
    } finally {
      setFarmersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setFarmers([]);
      setTransactions([]);
      return;
    }

    refreshFarmers().catch(() => {});
  }, [token, refreshFarmers]);

  // Create a farmer in the backend.
  const addFarmerRecord = async ({ name, village }) => {
    if (!token) {
      throw new Error('Please log in again.');
    }

    const farmerName = name?.trim();
    const farmerVillage = village?.trim();

    if (!farmerName || !farmerVillage) {
      throw new Error('Please enter the farmer name and village.');
    }

    await createFarmer(
  {
    name: farmerName,
    village: farmerVillage,
  },
  token
);

    await refreshFarmers();
  };

  // Record intake using a real backend item ID.
  const addIntake = async ({
    farmerId,
    farmer_id,
    itemId,
    item_id,
    variety,
    quantity,
    rate,
    moisturePct,
    brokerId,
    commissionAmount,
  }) => {
    if (!token) {
  throw new Error('Please log in again.');
}
    const id = Number(farmer_id ?? farmerId);
    const productId = Number(item_id ?? itemId);
    const qty = Number(quantity);
    const rt = Number(rate);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Please select a valid farmer.');
    }

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new Error(
        'A valid item ID is required. The intake form must provide an item ID from the backend.'
      );
    }

    if (
      !Number.isFinite(qty) ||
      qty <= 0 ||
      !Number.isFinite(rt) ||
      rt < 0
    ) {
      throw new Error('Please enter a valid quantity and rate.');
    }

    const amount = Math.round(qty * rt * 100) / 100;

    await recordIntake(
      {
        farmer_id: id,
        item_id: productId,
        quantity: qty,
        rate: rt,
        moisture_pct:
          moisturePct == null || moisturePct === ''
            ? null
            : Number(moisturePct),
        broker_id:
          brokerId == null || brokerId === ''
            ? null
            : Number(brokerId),
        commission_amount:
          commissionAmount == null || commissionAmount === ''
            ? null
            : Number(commissionAmount),
      },
      token
    );

    setTransactions((prev) => [
      ...prev,
      {
        id: Date.now(),
        farmerId: id,
        type: 'intake',
        date: today(),
        variety,
        quantity: qty,
        rate: rt,
        amount,
      },
    ]);

    await refreshFarmers();
  };

  // Existing Record Payment functionality preserved.
  const addPayment = async ({
    farmerId,
    farmer_id,
    amount,
    mode,
  }) => {
    if (!token) {
      throw new Error('Please log in again.');
    }
    const id = Number(farmer_id ?? farmerId);
    const paymentAmount = Number(amount);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Please select a valid farmer.');
    }

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      throw new Error('Please enter a valid payment amount.');
    }

    await recordPayment(
      {
        farmer_id: id,
        amount: paymentAmount,
        mode: mode || null,
      },
      token
    );

    setTransactions((prev) => [
      ...prev,
      {
        id: Date.now(),
        farmerId: id,
        type: 'payment',
        date: today(),
        amount: paymentAmount,
        mode: mode || null,
      },
    ]);

    await refreshFarmers();
  };

  return (
    <DataContext.Provider
      value={{
        farmers,
        transactions,
        weekIntake,
        addIntake,
        addPayment,
        addFarmerRecord,
        refreshFarmers,
        farmersLoading,
        farmersError,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
