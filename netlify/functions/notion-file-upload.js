// Netlify Function - Upload files directly to Notion
// Uses Notion's File Upload API (available since 2024)

export default async (request, context) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Notion-Version',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const auth = request.headers.get('Authorization');
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
    const { filename, content, contentType, pageId } = await request.json();

    if (!filename || !content || !pageId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Step 1: Create file upload session with Notion
    const createUploadResponse = await fetch('https://api.notion.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { type: 'page_id', page_id: pageId },
        name: filename,
        type: 'file'
      }),
    });

    const uploadSession = await createUploadResponse.json();

    if (!createUploadResponse.ok) {
      return new Response(JSON.stringify({
        error: 'Failed to create upload session',
        details: uploadSession
      }), {
        status: createUploadResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Step 2: Upload the file content to the provided URL
    const uploadUrl = uploadSession.upload_url;

    // Decode base64 content to binary
    const binaryString = atob(content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
      },
      body: bytes,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return new Response(JSON.stringify({
        error: 'Failed to upload file content',
        details: errorText
      }), {
        status: uploadResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Return success with file info
    return new Response(JSON.stringify({
      success: true,
      file_id: uploadSession.id,
      filename: filename
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};

export const config = {
  path: "/api/notion-file-upload"
};
