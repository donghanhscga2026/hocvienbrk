import type { ImportedSectionCandidate } from './types'

const REGISTRATION_WORDS = /(?:đăng\s*ký|dang[-_\s]?ky|register|registration|sign[-_\s]?up|signup|enroll|enrollment|opt[-_\s]?in)/i

export function isImportedRegistrationSection(
  section: Pick<ImportedSectionCandidate, 'sectionType' | 'sourceId' | 'sourceClass' | 'label' | 'heading' | 'formFields'>,
) {
  if ((section.formFields?.length || 0) > 0) return true
  if (section.sectionType !== 'registration') return false

  const haystack = [
    section.sourceId,
    section.sourceClass,
    section.label,
    section.heading,
  ].filter(Boolean).join(' ')

  return REGISTRATION_WORDS.test(haystack)
}

export function isRegistrationAnchor(value?: string) {
  if (!value) return false
  const normalized = (() => {
    try { return decodeURIComponent(value) } catch { return value }
  })()
  return REGISTRATION_WORDS.test(normalized.replace(/^#/, ''))
}
