export type ImportedSourceType = 'url' | 'html'

export type ImportedSectionType =
  | 'header'
  | 'hero'
  | 'pain_points'
  | 'outcomes'
  | 'roadmap'
  | 'gallery'
  | 'instructor'
  | 'bonuses'
  | 'pricing'
  | 'fit'
  | 'faq'
  | 'registration'
  | 'closing_message'
  | 'footer'
  | 'sticky_cta'
  | 'rich_content'

export type ImportedDesign = {
  backgroundColor?: string
  textColor?: string
  accentColor?: string
  alignment?: 'left' | 'center' | 'right'
  suggestedLayout?: 'single' | 'split' | 'grid' | 'timeline' | 'gallery'
  columns?: number
  borderRadius?: string
  padding?: string
  maxWidth?: string
}

export type ImportedImage = {
  src: string
  alt?: string
}

export type ImportedCard = {
  title?: string
  subtitle?: string
  text?: string
  image?: ImportedImage
}

export type ImportedAction = {
  label: string
  href?: string
  kind: 'link' | 'button'
}

export type ImportedSectionCandidate = {
  id: string
  sourceId?: string
  sourceClass?: string
  label: string
  sectionType: ImportedSectionType
  enabled: boolean
  sortOrder: number
  confidence: number
  heading?: string
  paragraphs: string[]
  listItems: string[]
  images: ImportedImage[]
  cards: ImportedCard[]
  tableRows: string[]
  actions: ImportedAction[]
  faqItems?: Array<{ question: string; answer: string }>
  formFields?: Array<{ name?: string; type?: string; placeholder?: string }>
  content: Record<string, unknown>
  design: ImportedDesign
}

export type WebsiteTemplateAnalysis = {
  sourceType: ImportedSourceType
  sourceUrl?: string
  finalUrl?: string
  title: string
  description?: string
  language?: string
  colors: string[]
  fonts: string[]
  theme: {
    primaryColor?: string
    secondaryColor?: string
    backgroundColor?: string
    textColor?: string
    headingFont?: string
    bodyFont?: string
    borderRadius?: string
    containerWidth?: string
  }
  sections: ImportedSectionCandidate[]
  stats: {
    sections: number
    images: number
    links: number
    forms: number
  }
  warnings: string[]
}

export type StoredTemplateSnapshot = {
  name: string
  seo: Record<string, unknown>
  theme: Record<string, unknown>
  navigation: Record<string, unknown>
  checkoutConfig: Record<string, unknown>
  useTemplate: boolean
  sections: Array<{
    sectionKey: string
    sectionType: string
    variant?: string | null
    anchorId?: string | null
    enabled: boolean
    sortOrder: number
    visibility: 'all' | 'unregistered' | 'registered'
    content: Record<string, unknown>
  }>
}
