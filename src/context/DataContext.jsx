import { createContext, useContext, useState } from 'react';
import {
  farmers as initialFarmers,
  transactions as initialTransactions,
  weekIntake,
} from '../mockData';
import { useAuth } from './AuthContext';
import { recordIntake, recordPayment } from '../api';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { token } = useAuth();
  const [farmers, setFarmers] = useState(initialFarmers);
  const [transactions, setTransactions] = useState(initialTransactions);

  const today = () => new Date().toISOString().slice(0, 10);

  // the screen only updates after the API call succeeds
  const addIntake = async ({ farmerId, variety, quantity, rate }) => {
    const amount = Math.round(quantity * rate * 100) / 100;
    await recordIntake({ farmerId, variety, quantity, rate, amount }, token);
    setTransactions(prev => [
      ...prev,
      { id: Date.now(), farmerId, type: 'intake', date: today(), variety, quantity, rate, amount },
    ]);
    setFarmers(prev =>
      prev.map(f =>
        f.id === farmerId ? { ...f, stock: f.stock + quantity, owed: f.owed + amount } : f
      )
    );
  };

  const addPayment = async ({ farmerId, amount, mode }) => {
    await recordPayment({ farmerId, amount, mode }, token);
    setTransactions(prev => [
      ...prev,
      { id: Date.now(), farmerId, type: 'payment', date: today(), amount, mode },
    ]);
    setFarmers(prev =>
      prev.map(f => (f.id === farmerId ? { ...f, owed: f.owed - amount } : f))
    );
  };

  return (
    <DataContext.Provider value={{ farmers, transactions, weekIntake, addIntake, addPayment }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}