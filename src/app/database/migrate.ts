import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'finance.db');
const MIGRATIONS_PATH = path.join(__dirname, 'migrations');

function runMigrations(): void {
    const db = new Database(DB_PATH);
    
    try {
        // Read all migration files
        const migrations = fs.readdirSync(MIGRATIONS_PATH)
            .filter(file => file.endsWith('.sql'))
            .sort();

        // Run each migration in sequence
        for (const migrationFile of migrations) {
            console.log(`Running migration: ${migrationFile}`);
            const migration = fs.readFileSync(
                path.join(MIGRATIONS_PATH, migrationFile), 
                'utf8'
            );
            
            db.exec(migration);
            console.log(`Completed migration: ${migrationFile}`);
        }
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

runMigrations(); 