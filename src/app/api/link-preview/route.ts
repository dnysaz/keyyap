import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // Determine the user agent based on the URL. Some sites (like Twitter/X) only return rich metadata to known bots.
    const isTwitter = url.includes('twitter.com') || url.includes('x.com');
    const userAgent = isTwitter 
      ? 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' 
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const response = await fetch(url, { 
      next: { revalidate: 3600 },
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    const html = await response.text();

    const getMeta = (name: string) => {
      const match = html.match(new RegExp(`<meta[^>]+(?:property|name)="${name}"[^>]+content="([^"]+)"`, 'i')) ||
                    html.match(new RegExp(`<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="${name}"`, 'i'));
      return match ? match[1] : null;
    };

    const title = getMeta('og:title') || getMeta('twitter:title') || html.match(/<title>([^<]+)<\/title>/i)?.[1] || url;
    const description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description') || '';
    const image = getMeta('og:image') || getMeta('twitter:image') || '';

    return NextResponse.json({ title, description, image, url });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch preview' }, { status: 500 });
  }
}