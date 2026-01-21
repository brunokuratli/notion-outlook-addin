// Netlify Function - File Upload for Notion Attachments
// Uses Netlify Blobs for storage

import { getStore } from "@netlify/blobs";

export default async (request, context) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
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

  try {
    const { filename, content, contentType } = await request.json();

    if (!filename || !content) {
      return new Response(JSON.stringify({ error: 'Missing filename or content' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Decode base64 content
    const binaryContent = Uint8Array.from(atob(content), c => c.charCodeAt(0));

    // Generate unique key
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${timestamp}-${randomId}-${safeFilename}`;

    // Store in Netlify Blobs
    const store = getStore("email-attachments");
    await store.set(key, binaryContent, {
      metadata: {
        filename: filename,
        contentType: contentType || 'application/octet-stream',
        uploadedAt: new Date().toISOString()
      }
    });

    // Return the URL to access the file
    const url = new URL(request.url);
    const fileUrl = `${url.origin}/api/get-file?key=${encodeURIComponent(key)}`;

    return new Response(JSON.stringify({
      success: true,
      url: fileUrl,
      filename: filename,
      key: key
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
  path: "/api/upload-file"
};
