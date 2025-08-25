import { z } from 'zod'

// Security-focused validation schemas
export const WorkoutPostSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  exercises: z.array(z.object({
    name: z.string().min(1).max(100, 'Exercise name too long'),
    sets: z.array(z.object({
      weight: z.number().min(0).max(1000, 'Weight must be reasonable'),
      reps: z.number().min(0).max(1000, 'Reps must be reasonable'),
    })).min(1, 'At least one set required')
  })).min(1, 'At least one exercise required'),
  duration: z.number().min(1).max(600, 'Duration must be between 1-600 minutes'),
  comment: z.string().max(500, 'Comment too long').optional(),
})

export const UserProfileSchema = z.object({
  displayName: z.string().min(1).max(50, 'Display name must be 1-50 characters'),
  bio: z.string().max(200, 'Bio must be under 200 characters').optional(),
  photoURL: z.string().url('Invalid photo URL').optional(),
})

export const PRRecordSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  exerciseName: z.string().min(1).max(100, 'Exercise name too long'),
  prType: z.enum(['e1RM', 'weight_reps', 'session_volume', '3RM', '5RM', '8RM']),
  value: z.number().min(0).max(10000, 'Value must be reasonable'),
  weight: z.number().min(0).max(1000, 'Weight must be reasonable').optional(),
  reps: z.number().min(0).max(1000, 'Reps must be reasonable').optional(),
})

// Input sanitization functions
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .slice(0, 1000) // Limit length
}

export const sanitizeComment = (comment: string): string => {
  return sanitizeInput(comment)
    .replace(/[<>]/g, '') // Remove HTML brackets
    .slice(0, 500) // Limit comment length
}

// File validation with enhanced security
export const validateImageFileSecure = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 2 * 1024 * 1024 // 2MB (reduced from 5MB)
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    throw new Error('サポートされていないファイル形式です。JPEG、PNG、WebPファイルのみ可能です。')
  }
  
  // Check file size
  if (file.size > maxSize) {
    throw new Error('ファイルサイズが大きすぎます。2MB以下のファイルをアップロードしてください。')
  }
  
  // Check file extension matches MIME type
  const extension = file.name.split('.').pop()?.toLowerCase()
  const expectedExtensions = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp']
  }
  
  const validExtensions = expectedExtensions[file.type as keyof typeof expectedExtensions]
  if (!validExtensions || !extension || !validExtensions.includes(extension)) {
    throw new Error('ファイル拡張子がファイル形式と一致しません。')
  }
  
  // Check for executable file signatures (basic)
  const fileName = file.name.toLowerCase()
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar']
  if (dangerousExtensions.some(ext => fileName.includes(ext))) {
    throw new Error('危険なファイル形式が検出されました。')
  }
  
  return true
}

// Rate limiting helper (client-side tracking)
class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  
  isAllowed(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    
    // Remove expired attempts
    const validAttempts = attempts.filter(time => now - time < windowMs)
    
    if (validAttempts.length >= maxAttempts) {
      return false
    }
    
    // Add current attempt
    validAttempts.push(now)
    this.attempts.set(key, validAttempts)
    
    return true
  }
  
  reset(key: string): void {
    this.attempts.delete(key)
  }
}

export const rateLimiter = new RateLimiter()

// Security logger (production-safe)
export const securityLogger = {
  log: (action: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[SECURITY] ${action}`, data)
    }
  },
  
  warn: (action: string, data?: any) => {
    console.warn(`[SECURITY WARNING] ${action}`, 
      process.env.NODE_ENV === 'production' ? '[DATA_HIDDEN]' : data)
  },
  
  error: (action: string, error?: any) => {
    console.error(`[SECURITY ERROR] ${action}`, 
      process.env.NODE_ENV === 'production' ? '[ERROR_DETAILS_HIDDEN]' : error)
  }
}

// Environment validation
export const validateEnvironment = () => {
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  ]
  
  const missing = requiredEnvVars.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    securityLogger.error('Missing required environment variables', missing)
    throw new Error('Missing required environment configuration')
  }
  
  // Check for demo mode
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo-api-key') {
    securityLogger.warn('Application running in demo mode')
  }
}

export default {
  WorkoutPostSchema,
  UserProfileSchema,
  PRRecordSchema,
  sanitizeInput,
  sanitizeComment,
  validateImageFileSecure,
  rateLimiter,
  securityLogger,
  validateEnvironment
}