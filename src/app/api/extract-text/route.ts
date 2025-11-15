import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // Forward the request to the FastAPI server
    const fastapiExtractTextUrl = process.env.FASTAPI_EXTRACT_TEXT_URL || 'http://43.200.233.218:8000/api/extract-text'

    const response = await fetch(fastapiExtractTextUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: errorText || 'Failed to extract data' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Extract text API error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

