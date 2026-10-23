export const farmers = [
  { id: 1, name: 'Ramu', village: 'Tadepalligudem', stock: 180, owed: 42000 },
  { id: 2, name: 'Lakshmi', village: 'Bhimavaram', stock: 95, owed: 0 },
  { id: 3, name: 'Venkat', village: 'Palakollu', stock: 240, owed: 15500 },
  { id: 4, name: 'Sita', village: 'Narsapuram', stock: 60, owed: 8200 },
];

export const weekIntake = [32, 41, 28, 55, 47, 36, 24];

export const transactions = [
  { id: 1, farmerId: 1, type: 'intake', date: '2026-10-15', quantity: 100, amount: 30000 },
  { id: 2, farmerId: 1, type: 'payment', date: '2026-10-17', amount: 18000 },
  { id: 3, farmerId: 1, type: 'intake', date: '2026-10-18', quantity: 80, amount: 30000 },
];