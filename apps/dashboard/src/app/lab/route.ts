import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const filePath = path.join(
    process.cwd(),
    'public',
    'portfolio',
    'bizra_lab_portfolio_masterpiece_v1.html'
  );

  const html = await readFile(filePath, 'utf8');

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // This is a living doc; avoid aggressive caching by default.
      'cache-control': 'no-store',
    },
  });
}
