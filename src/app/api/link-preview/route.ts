import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    const html = await response.text();

    const getMeta = (name: string) => {
      const match = html.match(new RegExp(`<meta[^>]+(?:property|name)="${name}"[^>]+content="([^"]+)"`, 'i')) ||
                    html.match(new RegExp(`<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="${name}"`, 'i'));
      return match ? match[1] : null;
    };

    const title = getMeta('og:title') || html.match(/<title>([^<]+)<\/title>/i)?.[1] || url;
    const description = getMeta('og:description') || getMeta('description') || '';
    const image = getMeta('og:image') || '';

    return NextResponse.json({ title, description, image, url });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch preview' }, { status: 500 });
  }
}