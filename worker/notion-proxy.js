// Cloudflare Worker - Notion API CORS Proxy
// Deploy this to Cloudflare Workers (free tier available)

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Notion-Version',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Get the Notion API endpoint from the URL path
    const url = new URL(request.url);
    const notionUrl = `https://api.notion.com${url.pathname}${url.search}`;

    // Forward the request to Notion API
    const notionResponse = await fetch(notionUrl, {
      method: request.method,
      headers: {
        'Authorization': request.headers.get('Authorization'),
        'Notion-Version': request.headers.get('Notion-Version') || '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: request.method !== 'GET' ? await request.text() : undefined,
    });

    // Return response with CORS headers
    const response = new Response(notionResponse.body, {
      status: notionResponse.status,
      statusText: notionResponse.statusText,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Notion-Version',
      },
    });

    return response;
  },
};
