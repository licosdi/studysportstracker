import db from './db.js';

console.log('Running database migrations...');
console.log('Database initialized successfully!');
console.log('Database location:', process.env.DATABASE_PATH || './server/database/studytracker.db');

db.close();
