const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erro ao abrir banco:', err.message);
    process.exit(1);
  }
});

db.all('SELECT * FROM users', [], (err, rows) => {
  if (err) {
    console.error('Erro ao buscar usuários:', err.message);
  } else {
    console.log('USUÁRIOS CADASTRADOS:');
    console.log(rows);
  }
  db.close();
});
