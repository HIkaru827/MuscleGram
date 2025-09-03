import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('FCM Token API: POST request received')
  
  try {
    const body = await request.text()
    console.log('FCM Token API: Raw request body:', body)
    
    let parsedData
    try {
      parsedData = JSON.parse(body)
      console.log('FCM Token API: Parsed data:', parsedData)
    } catch (parseError) {
      console.error('FCM Token API: JSON parse error:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { userId, token } = parsedData

    console.log('FCM Token API: userId:', userId, 'token length:', token?.length)

    if (!userId || !token) {
      console.error('FCM Token API: Missing required fields - userId:', !!userId, 'token:', !!token)
      return NextResponse.json(
        { error: 'Missing userId or token' },
        { status: 400 }
      )
    }

    // Store FCM token in user document
    console.log('FCM Token API: Attempting to store token for user:', userId)
    const userRef = adminDb.collection('users').doc(userId)
    
    await userRef.update({
      fcmToken: token,
      fcmTokenUpdatedAt: new Date().toISOString()
    })

    console.log('FCM Token API: Token stored successfully for user:', userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('FCM Token API: Detailed error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    })
    return NextResponse.json(
      { error: 'Failed to store FCM token', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    // Remove FCM token from user document
    const userRef = adminDb.collection('users').doc(userId)
    await userRef.update({
      fcmToken: null,
      fcmTokenUpdatedAt: new Date().toISOString()
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing FCM token:', error)
    return NextResponse.json(
      { error: 'Failed to remove FCM token' },
      { status: 500 }
    )
  }
}