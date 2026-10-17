// Link-preview image (og:image) for a news article, the same thing chat apps show for a shared link.
const g = globalThis as unknown as { __ogCache?: Map<string, string | null> };
const cache = (g.__ogCache ??= new Map<string, string | null>());

export async function ogImage(url: string): Promise<string | null> {
  if (cache.has(url)) return cache.get(url)!;
  let img: string | null = null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FanTable/1.0; link preview)" },
      signal: AbortSignal.timeout(4000),
    });
    const html = (await res.text()).slice(0, 200_000);
    const tag = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/i)?.[0];
    const content = tag?.match(/content=["']([^"']+)["']/i)?.[1];
    if (content) img = new URL(content.replace(/&amp;/g, "&"), url).toString();
  } catch {
    img = null;
  }
  cache.set(url, img);
  return img;
}
