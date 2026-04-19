import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:8082',
  'http://127.0.0.1:8082',
])

const normalizeOrigin = (origin: string) => origin.trim().toLowerCase().replace(/\/+$/, '')

const parseEnvAllowedOrigins = () => {
  const raw = String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return new Set(raw.map(normalizeOrigin))
}

const envAllowedOrigins = parseEnvAllowedOrigins()

const isLocalDevOrigin = (origin: string) => /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)

const isAllowedOrigin = (origin: string | null) => {
  if (!origin) return false
  const normalized = normalizeOrigin(origin)
  return DEFAULT_ALLOWED_ORIGINS.has(normalized) || envAllowedOrigins.has(normalized) || isLocalDevOrigin(origin)
}

const applyCorsHeaders = (response: NextResponse, origin: string | null, reqHeaders: string | null) => {
  if (isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin as string)
    response.headers.append('Vary', 'Origin')
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', reqHeaders || 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400')
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api')) {
    const origin = request.headers.get('origin')
    const reqHeaders = request.headers.get('access-control-request-headers')

    if (request.method === 'OPTIONS') {
      const preflight = new NextResponse(null, { status: 204 })
      applyCorsHeaders(preflight, origin, reqHeaders)
      return preflight
    }

    const response = NextResponse.next()
    applyCorsHeaders(response, origin, reqHeaders)
    return response
  }

  return await createClient(request)
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
