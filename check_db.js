const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(DB_PATH);

const TABLE_MAP = {
  users: 'users',
  cars: 'cars',
  providers: 'providers',
  clients: 'clients',
  daybyday: 'daybyday',
  packages: 'packages',
  bookings: 'bookings',
  cashflow: 'cashflow',
  tasks: 'tasks',
  documents: 'documents',
  notifications: 'notifications',
  company_settings: 'company_settings',
};

db.serialize(async () => {
  console.log('--- DATABASE INSPECTION ---');
  for (const [key, table] of Object.entries(TABLE_MAP)) {
    db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
      if (err) {
        console.error(`Error reading table "${table}":`, err.message);
      } else {
        console.log(`Table "${table}": ${rows.length} records`);
        if (rows.length > 0) {
          console.log('Sample record:', JSON.stringify(rows[0], null, 2));
        }
      }
    });
  }
});
