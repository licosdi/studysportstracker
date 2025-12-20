export const createTables = (db) => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Study sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      subject TEXT NOT NULL,
      duration INTEGER NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('igcse', 'general')),
      planner_task_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (planner_task_id) REFERENCES planner_tasks(id) ON DELETE SET NULL
    )
  `);

  // Custom presets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('igcse', 'general')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, subject, category)
    )
  `);

  // Planner tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS planner_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      duration INTEGER NOT NULL,
      day TEXT NOT NULL CHECK(day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday')),
      category TEXT NOT NULL CHECK(category IN ('igcse', 'general')),
      completed BOOLEAN NOT NULL DEFAULT 0,
      week_start TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Notion configuration table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notion_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      token TEXT NOT NULL,
      database_id TEXT NOT NULL,
      auto_sync BOOLEAN DEFAULT 1,
      sync_on_timer_complete BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON study_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON study_sessions(date);
    CREATE INDEX IF NOT EXISTS idx_sessions_category ON study_sessions(category);
    CREATE INDEX IF NOT EXISTS idx_planner_user_week ON planner_tasks(user_id, week_start);
    CREATE INDEX IF NOT EXISTS idx_presets_user_category ON custom_presets(user_id, category);
  `);

  console.log('Database tables created successfully');
};
