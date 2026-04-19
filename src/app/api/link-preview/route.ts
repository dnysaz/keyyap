import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const urlsParam = searchParams.get('urls')

  if (!urlsParam) {
    return NextResponse.json({ links: [] })
  }

  const urls = urlsParam.split(',').filter(Boolean)
  const links = await Promise.all(
    urls.slice(0, 2).map(async (url) => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3000)

        let fetchUrl = url
        let userAgent = 'Mozilla/5.0 (compatible; KeyYap/1.0)'

        if (url.includes('x.com/') || url.includes('twitter.com/')) {
          fetchUrl = url.replace(/x\.com|twitter\.com/g, 'fxtwitter.com')
          userAgent = 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'
        }

        const response = await fetch(fetchUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': userAgent,
          },
        })

        const html = await response.text()
        clearTimeout(timeout)

        const getMeta = (pattern: RegExp): string | undefined => {
          const match = html.match(pattern)
          return match ? match[1] || match[2] : undefined
        }

        let title = getMeta(/<title[^>]*>([^<]+)<\/title>/i) ||
          getMeta(/<meta[^>]*name="title"[^>]*content="([^"]+)"/i) ||
          getMeta(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)

        let description = getMeta(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i) ||
          getMeta(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i)

        const image = getMeta(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
          getMeta(/<meta[^>]*name="twitter:image"[^>]*content="([^"]+)"/i)

        const domain = new URL(url).hostname.replace('www.', '')

        if (title) title = title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
        if (description) description = description.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')


        return { url, title, description, image, domain }
      } catch (error) {
        return { url, domain: new URL(url).hostname.replace('www.', '') }
      }
    })
  )

  return NextResponse.json({ links })
}