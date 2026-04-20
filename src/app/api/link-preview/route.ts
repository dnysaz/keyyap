import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

/**
 * SECURITY: Validates that a URL is not targeting private/internal infrastructure.
 */
function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    const hostname = url.hostname.toLowerCase()
    if (!['http:', 'https:'].includes(url.protocol)) return true
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') return true
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

async function safeFetch(url: string, userAgent: string) {
  if (isPrivateUrl(url)) throw new Error('Blocked URL')
  
  const res = await fetch(url, {
    headers: { 'User-Agent': userAgent },
    redirect: 'follow', // Allow following redirects for shortened links
  })

  // Final check on resolved URL
  if (isPrivateUrl(res.url)) throw new Error('Blocked redirect')
  
  return res
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const urlsParam = searchParams.get('urls')

  if (!urlsParam) return NextResponse.json({ links: [] })

  const urls = urlsParam.split(',').filter(Boolean)
  const links = await Promise.all(
    urls.slice(0, 2).map(async (url) => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)

        let fetchUrl = url
        // Discordbot agent is often whitelisted for social previews
        let userAgent = 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'

        // SPECIAL HANDLING
        if (url.includes('x.com') || url.includes('twitter.com')) {
          fetchUrl = url.replace(/x\.com|twitter\.com/g, 'fxtwitter.com')
        } 
        
        // For TikTok and IG, most 'vx'/'dd' proxies are getting legal C&Ds.
        // We will try to fetch directly with a specialized User-Agent first.
        // If that fails or gives the legal notice, we try a different approach.

        let response = await safeFetch(fetchUrl, userAgent)
        let html = await response.text()

        // If we detect the 'Legal Request' notice from a proxy (like vxtiktok)
        if (html.includes('Due to a legal request') || html.includes('this service is no longer available')) {
            // Try direct fetch from the original URL instead of the proxy
            response = await safeFetch(url, userAgent)
            html = await response.text()
        }

        clearTimeout(timeout)

        const $ = cheerio.load(html)
        
        // Metadata extraction
        let title = $('meta[property="og:title"]').attr('content') || 
                    $('meta[name="twitter:title"]').attr('content') || 
                    $('title').text()

        let description = $('meta[property="og:description"]').attr('content') || 
                          $('meta[name="twitter:description"]').attr('content') || 
                          $('meta[name="description"]').attr('content')

        let image = $('meta[property="og:image"]').attr('content') || 
                    $('meta[name="twitter:image"]').attr('content') ||
                    $('meta[property="og:image:secure_url"]').attr('content')

        const domain = new URL(url).hostname.replace('www.', '')
        
        let tiktokId = null
        if (domain === 'vt.tiktok.com' || domain.includes('tiktok.com')) {
           const finalUrl = response.url || url
           const match = finalUrl.match(/video\/(\d+)/)
           if (match) tiktokId = match[1]
        }

        return { 
          url, 
          title: title?.trim() || domain, 
          description: description?.trim(), 
          image, 
          domain, 
          tiktok_id: tiktokId 
        }
      } catch (error) {
        console.error('Preview error:', error)
        return { url, domain: new URL(url).hostname.replace('www.', '') }
      }
    })
  )

  return NextResponse.json({ links })
}