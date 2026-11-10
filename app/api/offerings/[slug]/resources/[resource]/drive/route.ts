import { NextResponse } from 'next/server'
import { readWorkspaceResource, WorkspaceError } from '@/lib/offerings/workspace'
import { driveLinkInfo, fetchDriveFolderTree } from '@/lib/offerings/drive'

/** Danh sách file trong thư mục Google Drive của một tài nguyên (đã qua kiểm tra quyền sử dụng). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; resource: string }> },
) {
  try {
    const { slug, resource } = await params
    const data = await readWorkspaceResource(slug, resource)
    const info = data.url ? driveLinkInfo(data.url) : null
    if (!info || info.type !== 'folder')
      return NextResponse.json(
        { error: 'Tài nguyên này không phải thư mục Google Drive.' },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
      )
    const entries = await fetchDriveFolderTree(info.id)
    return NextResponse.json(
      { folderUrl: data.url, entries },
      { headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof WorkspaceError ? error.message : 'Không đọc được thư mục Google Drive.',
      },
      {
        status: error instanceof WorkspaceError ? error.status : 500,
        headers: { 'Cache-Control': 'private, no-store' },
      },
    )
  }
}
