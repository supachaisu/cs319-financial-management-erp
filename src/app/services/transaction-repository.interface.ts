import type {
  FinancialSummary,
  Transaction,
} from '../models/transaction.model';

export interface TransactionRepository {
  getAll(): Promise<Transaction[]>;
  getById(id: number): Promise<Transaction | null>;
  create(transaction: Omit<Transaction, 'id'>): Promise<Transaction>;
  update(id: number, transaction: Partial<Transaction>): Promise<Transaction>;
  delete(id: number): Promise<void>;

  // Specialized queries
  getByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]>;
  getByType(type: Transaction['type']): Promise<Transaction[]>;
  getByCategory(category: Transaction['category']): Promise<Transaction[]>;

  // Financial reporting
  getFinancialSummary(
    startDate: Date,
    endDate: Date
  ): Promise<FinancialSummary>;
}
