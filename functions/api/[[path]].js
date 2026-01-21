// Cloudflare Pages Function - Notion API CORS Proxy
// This handles all requests to /api/*

export async function onRequest(context) {
  const { request } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Notion-Version, X-Notion-Token',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Get the Notion API endpoint from the URL path
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  const notionUrl = `https://api.notion.com/v1${path}${url.search}`;

  // Get authorization - either from header or X-Notion-Token
  const auth = request.headers.get('Authorization') ||
               (request.headers.get('X-Notion-Token') ? `Bearer ${request.headers.get('X-Notion-Token')}` : null);

  if (!auth) {
    return new Response(JSON.stringify({ error: 'No authorization token provided' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    // Forward the request to Notion API
    const notionResponse = await fetch(notionUrl, {
      method: request.method,
      headers: {
        'Authorization': auth,
        'Notion-Version': request.headers.get('Notion-Version') || '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
    });

    const data = await notionResponse.text();

    // Return response with CORS headers
    return new Response(data, {
      status: notionResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Notion-Version, X-Notion-Token',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
