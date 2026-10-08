export const dynamic = 'force-static'

export async function GET() {
  // Local Next.js development does not run the Cloudflare Pages Worker.
  // The real session endpoint is handled by cloudflare/_worker.js in Pages.
  return Response.json(null, { headers: { 'Cache-Control': 'no-store' } })
}
