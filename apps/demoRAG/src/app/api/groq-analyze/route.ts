import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const runtime = 'edge';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
    });

    return NextResponse.json({
      result: completion.choices[0]?.message?.content || 'No response'
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to analyze data',
        details: error?.error || null
      },
      { status: 500 }
    );
  }
}
