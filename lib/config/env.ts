/**
 * Environment configuration
 * 
 * Type-safe environment variable access with validation
 */

import { z } from 'zod'

// Environment schema
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  
  // Application
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default('Pandora'),
  
  // Feature flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('false'),
  NEXT_PUBLIC_ENABLE_ERROR_TRACKING: z.string().transform(val => val === 'true').default('false'),
  
  // Upload/Storage (if using UploadThing or similar)
  UPLOADTHING_SECRET: z.string().optional(),
  UPLOADTHING_APP_ID: z.string().optional(),
})

// Validate and parse environment variables
let env: z.infer<typeof envSchema>

try {
  env = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    NEXT_PUBLIC_ENABLE_ERROR_TRACKING: process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING,
    UPLOADTHING_SECRET: process.env.UPLOADTHING_SECRET,
    UPLOADTHING_APP_ID: process.env.UPLOADTHING_APP_ID,
  })
} catch (error) {
  console.error('❌ Invalid environment variables:', error)
  throw new Error('Invalid environment variables')
}

// Type-safe environment access
export const config = {
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  
  // Supabase
  supabase: {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },
  
  // Application
  app: {
    url: env.NEXT_PUBLIC_APP_URL,
    name: env.NEXT_PUBLIC_APP_NAME,
  },
  
  // Features
  features: {
    analytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    errorTracking: env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING,
  },
  
  // Upload
  upload: {
    uploadThingSecret: env.UPLOADTHING_SECRET,
    uploadThingAppId: env.UPLOADTHING_APP_ID,
  },
} as const

// Validate required environment variables at startup
if (config.isProduction) {
  if (!config.supabase.serviceRoleKey) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is not set in production')
  }
}

