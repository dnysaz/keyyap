import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // Use a User-Agent that is commonly whitelisted for link previews
    const isTwitter = url.includes('twitter.com') || url.includes('x.com');
    const userAgent = isTwitter 
      ? 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' 
      : 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

    const response = await fetch(url, { 
      next: { revalidate: 3600 },
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      }
    });

    if (!response.ok) {
      return NextResponse.json({ 
        title: url, 
        description: `Source returned ${response.status}. Click to visit.`, 
        image: '', 
        url 
      });
    }

    const html = await response.text();

    const getMeta = (name: string) => {
      const regexes = [
        new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, 'i')
      ];
      
      for (const regex of regexes) {
        const match = html.match(regex);
        if (match) return match[1];
      }
      return null;
    };

    const extractDomain = (url: string) => {
      try { return new URL(url).hostname; } catch { return url; }
    };

    let title = getMeta('og:title') || getMeta('twitter:title') || html.match(/<title>([^<]+)<\/title>/i)?.[1] || extractDomain(url);
    const description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description') || '';
    const image = getMeta('og:image') || getMeta('twitter:image') || '';

    // Safety check for generic browser blocks (like Cloudflare)
    if (title.toLowerCase().includes('just a moment') || title.toLowerCase().includes('checking your browser') || title.toLowerCase().includes('attention required')) {
      return NextResponse.json({ 
        title: url, 
        description: 'Visit the link to view this content.', 
        image: '', 
        url 
      });
    }

    const decode = (str: string) => {
      if (!str) return '';
      return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–');
    };

    return NextResponse.json({ 
      title: decode(title), 
      description: decode(description), 
      image, 
      url: url,
      resolvedUrl: response.url
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch preview' }, { status: 500 });
  }
}