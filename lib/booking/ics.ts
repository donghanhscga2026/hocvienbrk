/** Sinh nội dung file .ics (iCalendar) cho một buổi hẹn — logic thuần. */

function icsDate(at: Date): string {
  return at.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export interface IcsInput {
  uid: string
  startsAt: Date
  endsAt: Date
  summary: string
  description?: string
  location?: string
}

export function buildIcs(input: IcsInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BRK Academy//Booking 1-1//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${input.uid}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(input.startsAt)}`,
    `DTEND:${icsDate(input.endsAt)}`,
    `SUMMARY:${escapeText(input.summary)}`,
  ]
  if (input.description) lines.push(`DESCRIPTION:${escapeText(input.description)}`)
  if (input.location) lines.push(`LOCATION:${escapeText(input.location)}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

/** Nội dung .ics dạng base64 để đính kèm email qua Brevo. */
export function buildIcsBase64(input: IcsInput): string {
  return Buffer.from(buildIcs(input), 'utf8').toString('base64')
}
