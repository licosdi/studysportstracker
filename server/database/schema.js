export const createTables = (db) => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      preferences TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Study Categories (presets)
  db.exec(`
    CREATE TABLE IF NOT EXISTS study_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    )
  `);

  // Football Categories (presets)
  db.exec(`
    CREATE TABLE IF NOT EXISTS football_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT,
      color TEXT DEFAULT '#10b981',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    )
  `);

  // Plan Items (for both study and football)
  db.exec(`
    CREATE TABLE IF NOT EXISTS plan_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      area TEXT NOT NULL CHECK(area IN ('study', 'football')),
      title TEXT NOT NULL,
      notes TEXT,
      category_id INTEGER NOT NULL,
      duration_minutes INTEGER DEFAULT 45,
      intensity TEXT CHECK(intensity IN ('low', 'medium', 'high')),
      status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'completed', 'skipped')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Log Entries (actual completed work)
  db.exec(`
    CREATE TABLE IF NOT EXISTS log_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      area TEXT NOT NULL CHECK(area IN ('study', 'football')),
      date_time TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      plan_item_id INTEGER,
      title TEXT NOT NULL,
      notes TEXT,
      duration_minutes INTEGER NOT NULL,
      intensity TEXT CHECK(intensity IN ('low', 'medium', 'high')),
      points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_item_id) REFERENCES plan_items(id) ON DELETE SET NULL
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_study_categories_user ON study_categories(user_id);
    CREATE INDEX IF NOT EXISTS idx_football_categories_user ON football_categories(user_id);
    CREATE INDEX IF NOT EXISTS idx_plan_items_user_date ON plan_items(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_plan_items_area ON plan_items(area);
    CREATE INDEX IF NOT EXISTS idx_log_entries_user_date ON log_entries(user_id, date_time);
    CREATE INDEX IF NOT EXISTS idx_log_entries_area ON log_entries(area);
    CREATE INDEX IF NOT EXISTS idx_log_entries_category ON log_entries(category_id);
  `);

  console.log('Database tables created successfully');
};

// Function to seed default categories for a new user
export const seedDefaultCategories = (db, userId) => {
  // Default study categories
  const studyCategories = [
    { name: 'Math', color: '#6366f1' },
    { name: 'English', color: '#8b5cf6' },
    { name: 'Physics', color: '#06b6d4' },
    { name: 'Business', color: '#f59e0b' },
    { name: 'Psychology', color: '#ec4899' },
    { name: 'Geography', color: '#10b981' }
  ];

  // Default football categories
  const footballCategories = [
    { name: 'Team Training', type: 'team', color: '#22c55e' },
    { name: 'Strength', type: 'strength', color: '#ef4444' },
    { name: 'Endurance', type: 'endurance', color: '#f97316' },
    { name: 'Ball Work', type: 'ball', color: '#3b82f6' },
    { name: 'Recovery', type: 'recovery', color: '#a855f7' }
  ];

  const insertStudy = db.prepare(`
    INSERT OR IGNORE INTO study_categories (user_id, name, color)
    VALUES (?, ?, ?)
  `);

  const insertFootball = db.prepare(`
    INSERT OR IGNORE INTO football_categories (user_id, name, type, color)
    VALUES (?, ?, ?, ?)
  `);

  for (const cat of studyCategories) {
    insertStudy.run(userId, cat.name, cat.color);
  }

  for (const cat of footballCategories) {
    insertFootball.run(userId, cat.name, cat.type, cat.color);
  }
};
