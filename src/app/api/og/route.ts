import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

/**
 * SECURITY: Validates that a URL is not targeting private/internal infrastructure.
 * Prevents SSRF (Server-Side Request Forgery) attacks.
 */
function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    const hostname = url.hostname.toLowerCase()

    // Block non-HTTP(S) protocols
    if (!['http:', 'https:'].includes(url.protocol)) return true

    // Block localhost and loopback addresses
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') return true

    // Block private IP ranges
    if (/^10\./.test(hostname)) return true
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true
    if (/^192\.168\./.test(hostname)) return true
    if (/^169\.254\./.test(hostname)) return true
    if (/^f[cd]/i.test(hostname)) return true
    if (hostname === 'metadata.google.internal') return true

    return false
  } catch {
    return true
  }
}

import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const limitCheck = rateLimit(ip, 30, 60 * 1000) // 30 requests per minute

  if (limitCheck.limited) {
    return new NextResponse('Too Many Requests. Please wait before trying again.', { 
      status: 429,
      headers: {
        'Retry-After': Math.ceil(limitCheck.resetIn / 1000).toString(),
        'X-RateLimit-Limit': '30',
        'X-RateLimit-Remaining': limitCheck.remaining.toString(),
      }
    })
  }

  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  // SECURITY: Block private/internal URLs to prevent SSRF
  if (isPrivateUrl(url)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'KeyYapBot/1.0',
      },
      redirect: 'manual', // SECURITY: Don't follow redirects to private IPs automatically
    })

    // SECURITY: If redirect, validate the redirect target
    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get('location')
      if (redirectUrl && isPrivateUrl(redirectUrl)) {
        return NextResponse.json({ error: 'Invalid redirect' }, { status: 400 })
      }
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const metadata = {
      title: $('meta[property="og:title"]').attr('content') || $('title').text() || '',
      description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '',
      image: $('meta[property="og:image"]').attr('content') || '',
      url: url,
    }

    return NextResponse.json(metadata)
  } catch (error) {
    console.error('OG Fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}

