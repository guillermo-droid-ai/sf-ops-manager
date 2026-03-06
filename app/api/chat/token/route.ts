// POST /api/chat/token
// Creates a Retell web call and returns an access token for the client SDK
// Also fetches live SF context and injects it as dynamic variables

import { NextResponse } from 'next/server';

const RETELL_API_KEY = process.env.RETELL_API_KEY!;
const AGENT_ID = 'agent_f39c518c9eda0425c9097c34db';

export async function POST(req: Request) {
  try {
    // Get live SF context to inject into the call
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let sfContext = '';
    try {
      const ctxRes = await fetch(`${baseUrl}/api/chat/context`);
      const ctxData = await ctxRes.json();
      sfContext = ctxData.dynamic_variables?.sf_context || '';
    } catch {
      sfContext = 'Live data temporarily unavailable.';
    }

    // Create web call via Retell API
    const res = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: AGENT_ID,
        retell_llm_dynamic_variables: {
          sf_context: sfContext,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Retell API error: ${err}`);
    }

    const data = await res.json();
    return NextResponse.json({ access_token: data.access_token });
  } catch (err: unknown) {
    console.error('Token error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
