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

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; KeyYap/1.0)',
          },
        })

        const html = await response.text()
        clearTimeout(timeout)

        const getMeta = (pattern: RegExp): string | undefined => {
          const match = html.match(pattern)
          return match ? match[1] || match[2] : undefined
        }

        const title = getMeta(/<title[^>]*>([^<]+)<\/title>/i) ||
          getMeta(/<meta[^>]*name="title"[^>]*content="([^"]+)"/i) ||
          getMeta(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)

        const description = getMeta(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i) ||
          getMeta(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i)

        const image = getMeta(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
          getMeta(/<meta[^>]*name="twitter:image"[^>]*content="([^"]+)"/i)

        const domain = new URL(url).hostname.replace('www.', '')

        return { url, title, description, image, domain }
      } catch (error) {
        return { url, domain: new URL(url).hostname.replace('www.', '') }
      }
    })
  )

  return NextResponse.json({ links })
}