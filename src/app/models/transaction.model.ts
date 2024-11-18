export const EXPENSE_CATEGORIES = [
  'Accommodation',
  'Transportation',
  'Food & Beverage',
  'Tours & Activities',
  'Marketing',
  'Staff Wages',
  'Insurance',
  'Equipment & Supplies',
  'Maintenance',
  'Commissions',
  'Utilities',
  'Other',
] as const;

export const INCOME_CATEGORIES = [
  'Package Tours',
  'Hotel Bookings',
  'Flight Bookings',
  'Activity Sales',
  'Transport Services',
  'Commission Income',
  'Travel Insurance',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export interface Transaction {
  id: number;
  date: Date;
  amount: number;
  type: 'income' | 'expense';
  category: IncomeCategory | ExpenseCategory;
  description: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  categoryBreakdown: {
    [K in ExpenseCategory | IncomeCategory]: number;
  };
}
