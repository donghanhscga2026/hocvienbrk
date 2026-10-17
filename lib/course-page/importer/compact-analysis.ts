import type { WebsiteTemplateAnalysis } from './types'

// Giữ nguồn nguyên trang một lần; các khối chỉ cần metadata để chọn và nối đăng ký.
export function compactExactAnalysis(analysis: WebsiteTemplateAnalysis): WebsiteTemplateAnalysis {
  if (!(analysis.exactSource?.url || analysis.exactSource?.html) || !['html', 'zip'].includes(analysis.sourceType)) return analysis
  return {
    ...analysis,
    sections: analysis.sections.map(section => ({
      id: section.id,
      sourceId: section.sourceId,
      sourceClass: section.sourceClass,
      label: section.label,
      sectionType: section.sectionType,
      enabled: section.enabled,
      sortOrder: section.sortOrder,
      confidence: section.confidence,
      heading: section.heading,
      formFields: section.formFields,
      design: section.design,
      // Giữ ảnh ngoài để chọn thumbnail; ảnh nhúng nằm trong trang nguyên bản.
      images: (section.images || []).filter(image => /^https?:\/\//i.test(image.src)).slice(0, 1),
      paragraphs: [], listItems: [], cards: [], tableRows: [], actions: [], content: {},
    })),
  }
}
