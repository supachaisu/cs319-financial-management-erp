import Database from 'better-sqlite3';
import type { TransactionRepository } from './transaction-repository.interface';
import {
  FinancialSummary,
  Transaction,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '../models/transaction.model';

type SQLiteRow = {
  type: string;
  category: string;
  total: number | string;
  [key: string]: any;
};

export class SQLiteTransactionRepository implements TransactionRepository {
  constructor(private db: Database.Database) {}

  async getAll(): Promise<Transaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM transactions ORDER BY date DESC'
    );
    const rows = stmt.all();
    return rows.map(this.mapTransaction);
  }

  async getById(id: number): Promise<Transaction | null> {
    const stmt = this.db.prepare('SELECT * FROM transactions WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapTransaction(row) : null;
  }

  async create(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    try {
      this.validateTransaction(transaction);
      this.validateConsistency(transaction);
      const stmt = this.db.prepare(
        'INSERT INTO transactions (date, amount, type, category, description) VALUES (?, ?, ?, ?, ?)'
      );
      const result = stmt.run(
        transaction.date.toISOString(),
        transaction.amount,
        transaction.type,
        transaction.category,
        transaction.description
      );
      return this.getById(result.lastInsertRowid as number).then((tx) => {
        if (!tx) throw new Error('Failed to create transaction');
        return tx;
      });
    } catch (error: unknown) {
      throw new Error(
        `Failed to create transaction: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async update(
    id: number,
    transaction: Partial<Transaction>
  ): Promise<Transaction> {
    try {
      this.validateTransaction(transaction);
      this.validateConsistency(transaction);
      const sets: string[] = [];
      const values: any[] = [];

      Object.entries(transaction).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          sets.push(`${key} = ?`);
          values.push(
            key === 'date' && value instanceof Date
              ? value.toISOString()
              : value
          );
        }
      });

      values.push(id);
      const stmt = this.db.prepare(
        `UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`
      );
      stmt.run(...values);

      return this.getById(id).then((tx) => {
        if (!tx) throw new Error(`Transaction with id ${id} not found`);
        return tx;
      });
    } catch (error: unknown) {
      throw new Error(
        `Failed to update transaction: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async delete(id: number): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM transactions WHERE id = ?');
    stmt.run(id);
  }

  async getByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date DESC'
    );
    const rows = stmt.all(
      startDate.toISOString(),
      endDate.toISOString()
    ) as SQLiteRow[];
    return rows.map(this.mapTransaction);
  }

  async getByType(type: Transaction['type']): Promise<Transaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM transactions WHERE type = ? ORDER BY date DESC'
    );
    const rows = stmt.all(type);
    return rows.map(this.mapTransaction);
  }

  async getByCategory(
    category: Transaction['category']
  ): Promise<Transaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM transactions WHERE category = ? ORDER BY date DESC'
    );
    const rows = stmt.all(category);
    return rows.map(this.mapTransaction);
  }

  async getFinancialSummary(
    startDate: Date,
    endDate: Date
  ): Promise<FinancialSummary> {
    const stmt = this.db.prepare(`
      SELECT 
        type,
        category,
        SUM(amount) as total
      FROM transactions 
      WHERE date BETWEEN ? AND ?
      GROUP BY type, category
    `);
    const rows = stmt.all(
      startDate.toISOString(),
      endDate.toISOString()
    ) as SQLiteRow[];

    const categoryBreakdown = {} as FinancialSummary['categoryBreakdown'];
    let totalIncome = 0;
    let totalExpenses = 0;

    rows.forEach((row: SQLiteRow) => {
      const { type, category, total } = row;
      const amount = Number(total);
      if (type === 'income') {
        totalIncome += amount;
      } else {
        totalExpenses += amount;
      }
      categoryBreakdown[category as keyof typeof categoryBreakdown] = amount;
    });

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      categoryBreakdown,
    };
  }

  async createMany(
    transactions: Omit<Transaction, 'id'>[]
  ): Promise<Transaction[]> {
    const stmt = this.db.prepare(
      'INSERT INTO transactions (date, amount, type, category, description) VALUES (?, ?, ?, ?, ?)'
    );

    const createdIds: number[] = [];
    const insertMany = this.db.transaction((txs: Omit<Transaction, 'id'>[]) => {
      for (const tx of txs) {
        this.validateTransaction(tx);
        const result = stmt.run(
          tx.date.toISOString(),
          tx.amount,
          tx.type,
          tx.category,
          tx.description
        );
        createdIds.push(result.lastInsertRowid as number);
      }
    });

    insertMany(transactions);
    const results = await Promise.all(createdIds.map((id) => this.getById(id)));
    if (results.some((tx) => tx === null)) {
      throw new Error('Failed to create one or more transactions');
    }
    return results as Transaction[];
  }

  private mapTransaction(row: any): Transaction {
    const type = String(row.type);
    if (type !== 'income' && type !== 'expense') {
      throw new Error(`Invalid transaction type: ${type}`);
    }

    const category = String(row.category) as Transaction['category'];
    if (
      !Object.values(EXPENSE_CATEGORIES).includes(
        category as (typeof EXPENSE_CATEGORIES)[number]
      ) &&
      !Object.values(INCOME_CATEGORIES).includes(
        category as (typeof INCOME_CATEGORIES)[number]
      )
    ) {
      throw new Error(`Invalid transaction category: ${category}`);
    }

    return {
      id: Number(row.id),
      date: new Date(row.date),
      amount: Number(row.amount),
      type,
      category,
      description: String(row.description),
    };
  }

  private validateTransaction(transaction: Partial<Transaction>): void {
    if (transaction.amount && transaction.amount < 0) {
      throw new Error('Amount must be positive');
    }
    if (transaction.date && !(transaction.date instanceof Date)) {
      throw new Error('Invalid date format');
    }
  }

  private validateConsistency(transaction: Partial<Transaction>): void {
    if (
      transaction.type === 'income' &&
      transaction.category &&
      !INCOME_CATEGORIES.includes(
        transaction.category as (typeof INCOME_CATEGORIES)[number]
      )
    ) {
      throw new Error('Invalid category for income transaction');
    }
    if (
      transaction.type === 'expense' &&
      transaction.category &&
      !EXPENSE_CATEGORIES.includes(
        transaction.category as (typeof EXPENSE_CATEGORIES)[number]
      )
    ) {
      throw new Error('Invalid category for expense transaction');
    }
  }
}
