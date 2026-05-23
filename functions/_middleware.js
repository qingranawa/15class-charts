// functions/_middleware.js — CORS 预检 + 全局响应头

export async function onRequest(context) {
  const { request, next } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const response = await next();
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}
