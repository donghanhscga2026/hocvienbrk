import { NextRequest, NextResponse } from 'next/server'
import { updateVideoStatus, getOAuth2Client, refreshAccessToken } from '@/lib/youtube'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()
  let isClosed = false

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        if (!isClosed) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }
      }

      try {
        const session = await auth()
        if (!session?.user?.id) {
          sendEvent({ error: 'Unauthorized', done: true })
          isClosed = true
          controller.close()
          return
        }

        const userId = parseInt(String(session.user.id))
        const { videoIds } = await req.json()

        if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
          sendEvent({ error: 'No videos selected', done: true })
          isClosed = true
          controller.close()
          return
        }

        const ytToken = await prisma.youTubeToken.findUnique({
          where: { userId },
        })

        if (!ytToken) {
          sendEvent({ error: 'Not connected to YouTube', done: true })
          isClosed = true
          controller.close()
          return
        }

        let accessToken = ytToken.accessToken
        const expiresAt = new Date(ytToken.expiresAt)

        if (expiresAt < new Date()) {
          const newTokens = await refreshAccessToken(ytToken.refreshToken)
          accessToken = newTokens.accessToken || accessToken
          
          await prisma.youTubeToken.update({
            where: { userId },
            data: { 
              accessToken: newTokens.accessToken || ytToken.accessToken, 
              expiresAt: newTokens.expiresAt 
            },
          })
        }

        const oauth2Client = getOAuth2Client()
        oauth2Client.setCredentials({ access_token: accessToken })

        let success = 0
        let failed = 0
        const errors: string[] = []

        for (let i = 0; i < videoIds.length; i++) {
          const videoId = videoIds[i]
          
          sendEvent({ 
            current: i + 1, 
            total: videoIds.length, 
            videoId,
            status: 'processing' 
          })

          try {
            const result = await updateVideoStatus(oauth2Client, videoId, 'public')
            if (result) {
              success++
              sendEvent({ 
                current: i + 1, 
                total: videoIds.length, 
                videoId,
                status: 'success' 
              })
            } else {
              failed++
              errors.push(`Video ${videoId}: Update failed`)
              sendEvent({ 
                current: i + 1, 
                total: videoIds.length, 
                videoId,
                status: 'failed',
                error: `Video ${videoId}: Update failed`
              })
            }
          } catch (err: any) {
            failed++
            errors.push(`${videoId}: ${err.message}`)
            sendEvent({ 
              current: i + 1, 
              total: videoIds.length, 
              videoId,
              status: 'failed',
              error: err.message
            })
          }

          if (i < videoIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500))
          }
        }

        sendEvent({ 
          done: true, 
          success, 
          failed, 
          errors,
          total: videoIds.length 
        })
      } catch (error: any) {
        console.error('YouTube Publish Error:', error)
        sendEvent({ error: error.message, done: true })
      } finally {
        isClosed = true
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}