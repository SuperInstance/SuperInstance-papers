import { type Env } from '../env.d.ts'

// Database schema initialization
export async function initializeDatabase(env: Env): Promise<void> {
  // Check if tables exist by trying to create them
  // They will fail if already exist, which is fine
  try {
    // Users table
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE,
        hashed_password TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        profile_data TEXT,
        learning_preferences TEXT
      )
    `)

    // Progress table
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS progress (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        tutorial_id TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completion_date INTEGER,
        score INTEGER,
        attempts INTEGER DEFAULT 0,
        last_attempt INTEGER,
        state_data TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, tutorial_id)
      )
    `)

    // Pathways table
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS pathways (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        pathway_id TEXT NOT NULL,
        current_step INTEGER DEFAULT 0,
        completed_steps TEXT,
        started_at INTEGER,
        completed_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, pathway_id)
      )
    `)

    // Content access table
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS content_access (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        content_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        accessed_at INTEGER NOT NULL,
        duration INTEGER,
        completed BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Analytics events table
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        event_name TEXT NOT NULL,
        event_data TEXT,
        category TEXT,
        path TEXT,
        referrer TEXT,
        user_agent TEXT,
        ip_address TEXT,
        created_at INTEGER NOT NULL
      )
    `)

    // Create indexes
    await env.DB.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_progress_tutorial_id ON progress(tutorial_id);
      CREATE INDEX IF NOT EXISTS idx_pathways_user_id ON pathways(user_id);
      CREATE INDEX IF NOT EXISTS idx_content_access_user_id ON content_access(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
    `)

    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
    throw error
  }
}

// User operations
export interface User {
  id: string
  email: string
  username?: string
  hashed_password: string
  created_at: number
  updated_at: number
  profile_data?: string
  learning_preferences?: string
}

export async function createUser(
  user: Omit<User, 'id' | 'created_at' | 'updated_at'>,
  env: Env
): Promise<string> {
  const id = crypto.randomUUID()
  const now = Date.now()

  await env.DB.prepare(`
    INSERT INTO users (id, email, username, hashed_password, created_at, updated_at, profile_data, learning_preferences)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    user.email,
    user.username || null,
    user.hashed_password,
    now,
    now,
    user.profile_data || null,
    user.learning_preferences || null
  ).run()

  return id
}

export async function getUserByEmail(email: string, env: Env): Promise<User | null> {
  const result = await env.DB.prepare(`
    SELECT * FROM users WHERE email = ?
  `).bind(email).first()

  return result as User | null
}

export async function getUserById(id: string, env: Env): Promise<User | null> {
  const result = await env.DB.prepare(`
    SELECT * FROM users WHERE id = ?
  `).bind(id).first()

  return result as User | null
}

export async function updateUser(
  id: string,
  updates: Partial<Omit<User, 'id' | 'email' | 'hashed_password' | 'created_at'>>,
  env: Env
): Promise<boolean> {
  const setClauses: string[] = []
  const values: any[] = []

  if (updates.username !== undefined) {
    setClauses.push('username = ?')
    values.push(updates.username)
  }

  if (updates.profile_data !== undefined) {
    setClauses.push('profile_data = ?')
    values.push(updates.profile_data)
  }

  if (updates.learning_preferences !== undefined) {
    setClauses.push('learning_preferences = ?')
    values.push(updates.learning_preferences)
  }

  // Always update updated_at
  setClauses.push('updated_at = ?')
  values.push(Date.now())

  if (setClauses.length === 0) {
    return false
  }

  values.push(id)

  const query = `
    UPDATE users
    SET ${setClauses.join(', ')}
    WHERE id = ?
  `

  const result = await env.DB.prepare(query).bind(...values).run()
  return result.success
}

// Progress operations
export interface Progress {
  id: string
  user_id: string
  tutorial_id: string
  completed: boolean
  completion_date?: number
  score?: number
  attempts: number
  last_attempt?: number
  state_data?: string
}

export async function getProgress(
  userId: string,
  tutorialId: string,
  env: Env
): Promise<Progress | null> {
  const result = await env.DB.prepare(`
    SELECT * FROM progress
    WHERE user_id = ? AND tutorial_id = ?
  `).bind(userId, tutorialId).first()

  return result as Progress | null
}

export async function updateProgress(
  progress: Omit<Progress, 'id'>,
  env: Env
): Promise<string> {
  const existing = await getProgress(progress.user_id, progress.tutorial_id, env)

  if (existing) {
    // Update existing progress
    await env.DB.prepare(`
      UPDATE progress
      SET completed = ?, completion_date = ?, score = ?, attempts = ?, last_attempt = ?, state_data = ?
      WHERE user_id = ? AND tutorial_id = ?
    `).bind(
      progress.completed,
      progress.completion_date || null,
      progress.score || null,
      progress.attempts,
      progress.last_attempt || null,
      progress.state_data || null,
      progress.user_id,
      progress.tutorial_id
    ).run()

    return existing.id
  } else {
    // Create new progress record
    const id = crypto.randomUUID()
    await env.DB.prepare(`
      INSERT INTO progress (id, user_id, tutorial_id, completed, completion_date, score, attempts, last_attempt, state_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      progress.user_id,
      progress.tutorial_id,
      progress.completed,
      progress.completion_date || null,
      progress.score || null,
      progress.attempts,
      progress.last_attempt || null,
      progress.state_data || null
    ).run()

    return id
  }
}

// Helper function for JSON serialization
export function serializeJSON(data: any): string {
  return JSON.stringify(data)
}

export function parseJSON<T>(json: string | null): T | null {
  if (!json) return null
  try {
    return JSON.parse(json) as T
  } catch {
    return null
  }
}