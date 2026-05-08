'use client'

import { useEffect } from 'react'
import { saveSurveyResultAction } from '@/app/actions/survey-actions'
import { notify } from '@/lib/notifications-client'

export default function PendingSurveyHandler() {
    useEffect(() => {
        const savePendingSurvey = async () => {
            const pendingData = localStorage.getItem('pendingSurvey')
            if (!pendingData) return

            try {
                const data = JSON.parse(pendingData)
                const result = await saveSurveyResultAction(data.answers)
                
                if (result.success) {
                    localStorage.removeItem('pendingSurvey')
                    notify({
                        message: 'Lộ trình khảo sát đã được lưu thành công!',
                        type: 'success',
                        duration: 5000
                    })
                }
            } catch (error) {
                console.error('Failed to save pending survey:', error)
            }
        }

        savePendingSurvey()
    }, [])

    return null
}
