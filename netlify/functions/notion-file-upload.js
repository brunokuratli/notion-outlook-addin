// Netlify Function - Upload files to Notion using the correct File Upload API
// See: https://developers.notion.com/docs/uploading-small-files

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
    const { filename, content, contentType } = await request.json();

    if (!filename || !content) {
      return new Response(JSON.stringify({ error: 'Missing required fields (filename, content)' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Step 1: Create a file upload object
    const createResponse = await fetch('https://api.notion.com/v1/file_uploads', {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'single_part',
        filename: filename,
      }),
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      return new Response(JSON.stringify({
        error: 'Failed to create file upload',
        details: createData
      }), {
        status: createResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const uploadUrl = createData.upload_url;
    const fileUploadId = createData.id;

    // Step 2: Upload the file content using multipart/form-data
    // Decode base64 to binary
    const binaryString = atob(content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create FormData with the file
    const formData = new FormData();
    const blob = new Blob([bytes], { type: contentType || 'application/octet-stream' });
    formData.append('file', blob, filename);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Notion-Version': '2022-06-28',
      },
      body: formData,
    });

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok) {
      return new Response(JSON.stringify({
        error: 'Failed to upload file content',
        details: uploadData
      }), {
        status: uploadResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Return success with file upload ID
    return new Response(JSON.stringify({
      success: true,
      file_upload_id: fileUploadId,
      status: uploadData.status,
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
