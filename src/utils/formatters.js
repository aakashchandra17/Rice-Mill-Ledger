/**
 * Pure calculation utilities for Grain Ledger
 */

export const rupees = value => {
  if (value === null || value === undefined || value === '') return '₹0';
  const num = Number(value);
  if (Number.isNaN(num)) return '₹0';
  return '₹' + num.toLocaleString('en-IN');
};

export const formatNumber = value => {
  if (value === null || value === undefined || value === '') return '0';
  const num = Number(value);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
};

export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString);

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  });
};

export const formatDateTime = dateString => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString);

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
