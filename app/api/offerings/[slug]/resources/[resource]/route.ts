import { NextResponse } from 'next/server'
import { readWorkspaceResource, WorkspaceError } from '@/lib/offerings/workspace'
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; resource: string }> }) {
  try {
    const { slug, resource } = await params
    return NextResponse.json(await readWorkspaceResource(slug, resource), {
      headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof WorkspaceError ? error.message : 'Không tải được tài nguyên.' },
      {
        status: error instanceof WorkspaceError ? error.status : 500,
        headers: { 'Cache-Control': 'private, no-store' },
      },
    )
  }
}
