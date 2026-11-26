/**
 * Calculate net financial settlement between Commissiondar and Farmer.
 *
 * Approved Business Rule:
 *   Difference = Outstanding loan - outstanding amount payable for received stock
 *   - If positive (> 0): Farmer should pay Commissiondar.
 *   - If negative (< 0): Commissiondar should pay farmer (absolute difference).
 *   - If zero (=== 0): Accounts settled.
 *
 * CRITICAL: Never display a negative amount as the final settlement amount.
 * Keep the loan balance and purchase-payment records separate.
 * Settlement is only a combined summary, not a new financial transaction.
 *
 * @param {number} outstandingLoan
 * @param {number} outstandingPayableForStock
 * @returns {{
 *   difference: number,
 *   amount: number, // always non-negative
 *   status: 'farmer_pays_commissiondar' | 'commissiondar_pays_farmer' | 'settled',
 *   label: string,
 *   subtext: string,
 *   colorTone: 'gold' | 'green' | 'muted'
 * }}
 */
export function calculateSettlement(outstandingLoan, outstandingPayableForStock) {
  const loan = Math.max(0, Number(outstandingLoan || 0));
  const payable = Math.max(0, Number(outstandingPayableForStock || 0));
  const diff = Math.round((loan - payable) * 100) / 100;

  if (diff > 0) {
    return {
      difference: diff,
      amount: diff,
      status: 'farmer_pays_commissiondar',
      label: 'Farmer should pay Commissiondar',
      subtext: `Outstanding loan exceeds stock payable amount by ₹${diff.toLocaleString('en-IN')}`,
      colorTone: 'gold',
    };
  }

  if (diff < 0) {
    const absDiff = Math.abs(diff);
    return {
      difference: diff,
      amount: absDiff,
      status: 'commissiondar_pays_farmer',
      label: 'Commissiondar should pay Farmer',
      subtext: `Stock payable amount exceeds outstanding loan by ₹${absDiff.toLocaleString('en-IN')}`,
      colorTone: 'green',
    };
  }

  return {
    difference: 0,
    amount: 0,
    status: 'settled',
    label: 'Accounts Settled',
    subtext: 'No outstanding balance between farmer and commissiondar',
    colorTone: 'muted',
  };
}
