import { NextRequest, NextResponse } from 'next/server'

const TRANSLATE_API_URL = process.env.TRANSLATE_API_URL || 'http://43.200.233.218:8000/api/translate'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    if (!body.source || !body.text || !body.targets) {
      return NextResponse.json(
        { error: 'Missing required fields: source, text, targets' },
        { status: 400 }
      )
    }

    // Forward the request to the FastAPI translation service
    const response = await fetch(TRANSLATE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: body.source,
        text: body.text,
        targets: body.targets,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: errorText || 'Failed to translate' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Translate API error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

