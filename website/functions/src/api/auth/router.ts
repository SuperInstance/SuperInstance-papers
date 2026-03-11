import { Hono } from 'hono'
import { type Env } from '../../env.d.ts'
import { requireAuth, hashPassword, verifyPassword, generateToken, createSession } from '../../shared/auth'
import { registerSchema, loginSchema, profileUpdateSchema, validateRequest } from '../../shared/validation'
import { createUser, getUserByEmail, getUserById, updateUser, parseJSON, serializeJSON } from '../../shared/db'

const router = new Hono<{ Bindings: Env }>()

// Register new user
router.post('/register', async (c) => {
  // Rate limiting
  const ip = c.req.header('cf-connecting-ip') || 'unknown'
  // Note: In production, implement proper rate limiting

  const validation = await validateRequest(registerSchema, c)
  if (!validation.success) return validation.response

  const { email, password, username, name } = validation.data

  // Check if user already exists
  const existingUser = await getUserByEmail(email, c.env)
  if (existingUser) {
    return c.json({
      error: 'Conflict',
      message: 'User with this email already exists',
    }, 409)
  }

  // Hash password
  const hashedPassword = await hashPassword(password)

  // Create user profile data
  const profileData = name ? { name } : undefined

  // Create user in database
  const userId = await createUser({
    email,
    username,
    hashed_password: hashedPassword,
    profile_data: profileData ? serializeJSON(profileData) : undefined,
  }, c.env)

  // Generate JWT token
  const token = generateToken(userId, email, c.env)

  // Create session
  const sessionId = `session:${userId}:${Math.floor(Date.now() / 1000)}`
  await createSession(sessionId, {
    userId,
    email,
    createdAt: Date.now(),
    lastActive: Date.now(),
    userAgent: c.req.header('user-agent'),
    ip,
  }, c.env)

  return c.json({
    success: true,
    message: 'User registered successfully',
    data: {
      userId,
      email,
      username,
      token,
    },
  }, 201)
})

// Login user
router.post('/login', async (c) => {
  const validation = await validateRequest(loginSchema, c)
  if (!validation.success) return validation.response

  const { email, password } = validation.data

  // Get user from database
  const user = await getUserByEmail(email, c.env)
  if (!user) {
    return c.json({
      error: 'Unauthorized',
      message: 'Invalid email or password',
    }, 401)
  }

  // Verify password
  const passwordValid = await verifyPassword(password, user.hashed_password)
  if (!passwordValid) {
    return c.json({
      error: 'Unauthorized',
      message: 'Invalid email or password',
    }, 401)
  }

  // Generate JWT token
  const token = generateToken(user.id, user.email, c.env)

  // Create session
  const sessionId = `session:${user.id}:${Math.floor(Date.now() / 1000)}`
  const ip = c.req.header('cf-connecting-ip') || 'unknown'
  await createSession(sessionId, {
    userId: user.id,
    email: user.email,
    createdAt: Date.now(),
    lastActive: Date.now(),
    userAgent: c.req.header('user-agent'),
    ip,
  }, c.env)

  // Parse profile data
  const profileData = parseJSON(user.profile_data)

  return c.json({
    success: true,
    message: 'Login successful',
    data: {
      userId: user.id,
      email: user.email,
      username: user.username,
      profile: profileData,
      token,
    },
  })
})

// Refresh token (extend session)
router.post('/refresh', requireAuth(), async (c) => {
  const user = c.get('user')
  const existingUser = await getUserById(user.id, c.env)

  if (!existingUser) {
    return c.json({
      error: 'Unauthorized',
      message: 'User not found',
    }, 401)
  }

  // Generate new token
  const token = generateToken(user.id, user.email, c.env)

  // Update session
  const sessionId = `session:${user.id}:${Math.floor(Date.now() / 1000)}`
  const ip = c.req.header('cf-connecting-ip') || 'unknown'
  await createSession(sessionId, {
    userId: user.id,
    email: user.email,
    createdAt: Date.now(),
    lastActive: Date.now(),
    userAgent: c.req.header('user-agent'),
    ip,
  }, c.env)

  return c.json({
    success: true,
    message: 'Token refreshed',
    data: {
      token,
    },
  })
})

// Logout user
router.post('/logout', requireAuth(), async (c) => {
  const user = c.get('user')

  // Delete session
  await c.env.SESSIONS.delete(user.sessionId)

  return c.json({
    success: true,
    message: 'Logout successful',
  })
})

// Get user profile
router.get('/profile', requireAuth(), async (c) => {
  const user = c.get('user')
  const dbUser = await getUserById(user.id, c.env)

  if (!dbUser) {
    return c.json({
      error: 'Not Found',
      message: 'User not found',
    }, 404)
  }

  const profileData = parseJSON(dbUser.profile_data)
  const learningPreferences = parseJSON(dbUser.learning_preferences)

  return c.json({
    success: true,
    data: {
      userId: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      profile: profileData,
      learningPreferences,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    },
  })
})

// Update user profile
router.put('/profile', requireAuth(), async (c) => {
  const user = c.get('user')

  const validation = await validateRequest(profileUpdateSchema, c)
  if (!validation.success) return validation.response

  const updates = validation.data

  // Prepare update data
  const updateData: any = {}

  if (updates.name || updates.avatar || updates.bio) {
    // Get existing profile data
    const dbUser = await getUserById(user.id, c.env)
    const existingProfile = dbUser?.profile_data ? parseJSON(dbUser.profile_data) || {} : {}

    // Merge with updates
    updateData.profile_data = serializeJSON({
      ...existingProfile,
      ...(updates.name && { name: updates.name }),
      ...(updates.avatar && { avatar: updates.avatar }),
      ...(updates.bio && { bio: updates.bio }),
    })
  }

  if (updates.preferences) {
    // Get existing preferences
    const dbUser = await getUserById(user.id, c.env)
    const existingPreferences = dbUser?.learning_preferences ? parseJSON(dbUser.learning_preferences) || {} : {}

    // Merge with updates
    updateData.learning_preferences = serializeJSON({
      ...existingPreferences,
      ...updates.preferences,
    })
  }

  // Update user in database
  const success = await updateUser(user.id, updateData, c.env)

  if (!success) {
    return c.json({
      error: 'Internal Error',
      message: 'Failed to update profile',
    }, 500)
  }

  // Get updated user data
  const updatedUser = await getUserById(user.id, c.env)

  return c.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      profile: updatedUser?.profile_data ? parseJSON(updatedUser.profile_data) : null,
      learningPreferences: updatedUser?.learning_preferences ? parseJSON(updatedUser.learning_preferences) : null,
    },
  })
})

export default router