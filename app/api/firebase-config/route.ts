import { NextResponse } from 'next/server'

export async function GET() {
  const config = {
    hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    hasStorageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    hasMessagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    hasAppId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    hasVapidKey: !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    apiKeyPrefix: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 10) || 'Not set',
    vapidKeyPrefix: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.substring(0, 10) || 'Not set',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not set',
    isDemoMode: process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo-api-key' || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  }

  return NextResponse.json(config)
}