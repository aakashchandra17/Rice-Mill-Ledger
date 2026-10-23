import { createContext, useContext, useState } from 'react';
import {
  farmers as initialFarmers,
  transactions as initialTransactions,
  weekIntake,
} from '../mockData';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [farmers, setFarmers] = useState(initialFarmers);
  const [transactions, setTransactions] = useState(initialTransactions);

  const today = () => new Date().toISOString().slice(0, 10);

  const addIntake = ({ farmerId, variety, quantity, rate }) => {
    const amount = Math.round(quantity * rate * 100) / 100;
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

  const addPayment = ({ farmerId, amount, mode }) => {
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