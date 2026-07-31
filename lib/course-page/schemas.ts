import { z } from 'zod';

export const courseStatusSchema = z.enum(['draft', 'published', 'archived']);

export const courseSeoConfigSchema = z.object({
  title: z.string().min(1, 'Tiêu đề SEO không được để trống'),
  description: z.string().min(1, 'Mô tả SEO không được để trống'),
  image: z.string().url().optional().or(z.literal('')),
  canonicalUrl: z.string().url().optional().or(z.literal('')),
  noIndex: z.boolean().default(false),
  keywords: z.array(z.string()).optional()
});

export const courseThemeConfigSchema = z.object({
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Mã màu không hợp lệ'),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Mã màu không hợp lệ'),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Mã màu không hợp lệ').optional().or(z.literal('')),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Mã màu không hợp lệ'),
  surfaceColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Mã màu không hợp lệ').optional().or(z.literal('')),
  textColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Mã màu không hợp lệ'),
  mutedTextColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Mã màu không hợp lệ').optional().or(z.literal('')),
  borderColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Mã màu không hợp lệ').optional().or(z.literal('')),
  headingFont: z.string().optional(),
  bodyFont: z.string().optional(),
  borderRadius: z.string().optional(),
  buttonRadius: z.string().optional(),
  containerWidth: z.string().optional(),
  backgroundImage: z.string().url().optional().or(z.literal('')),
  backgroundOverlay: z.string().optional()
});

export const courseNavigationConfigSchema = z.object({
  logoUrl: z.string().url().optional().or(z.literal('')),
  shortName: z.string().min(1, 'Tên viết tắt không được để trống'),
  progressLabel: z.string().optional(),
  showProgress: z.boolean().default(false),
  ctaText: z.string().min(1, 'CTA text không được để trống'),
  ctaTargetSectionId: z.string().optional(),
  sticky: z.boolean().default(true)
});

export const courseCheckoutConfigSchema = z.object({
  enabled: z.boolean().default(true),
  provider: z.enum(['sepay', 'vietqr', 'manual']),
  currency: z.literal('VND').default('VND'),
  defaultPlanId: z.string().optional(),
  bankAccountId: z.string().optional(),
  accountName: z.string().optional(),
  bankCode: z.string().optional(),
  paymentDescriptionPrefix: z.string().min(1, 'Nội dung CK bắt đầu bằng không được rỗng'),
  orderExpirationMinutes: z.number().int().positive().default(15),
  registrationFields: z.array(z.object({
    name: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(['text', 'tel', 'email']),
    required: z.boolean().default(true),
    placeholder: z.string().optional()
  })),
  successMode: z.enum(['redirect', 'show_message', 'redirect_to_zalo']),
  successRedirectUrl: z.string().url().optional().or(z.literal('')),
  zaloGroupUrl: z.string().url().optional().or(z.literal('')),
  legalText: z.string().optional(),
  privacyText: z.string().optional()
});

export const sectionVisibilitySchema = z.enum(['all', 'unregistered', 'registered']);

// 1. Hero
export const heroSectionContentSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string().min(1, 'Tiêu đề không được để trống'),
  highlightedText: z.string().optional(),
  description: z.string().min(1, 'Mô tả không được để trống'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  imageAlt: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal('')),
  startDate: z.string().optional(),
  durationLabel: z.string().optional(),
  audience: z.string().optional(),
  stats: z.array(z.object({
    value: z.string().min(1),
    label: z.string().min(1)
  })).optional(),
  primaryCta: z.object({
    label: z.string().min(1),
    action: z.enum(['open_registration', 'scroll', 'external_link']),
    target: z.string().optional()
  }),
  secondaryCta: z.object({
    label: z.string().min(1),
    action: z.enum(['scroll', 'external_link']),
    target: z.string().min(1)
  }).optional()
});

// 2. Quote
export const quoteSectionContentSchema = z.object({
  quote: z.string().min(1, 'Nội dung trích dẫn không được để trống'),
  author: z.string().optional(),
  caption: z.string().optional()
});

// 3. Pain Points
export const painPointsSectionContentSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  items: z.array(z.object({
    id: z.string().min(1),
    icon: z.string().optional(),
    title: z.string().min(1),
    description: z.string().min(1)
  }))
});

// 4. Benefits
export const benefitsSectionContentSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  items: z.array(z.object({
    id: z.string().min(1),
    badge: z.string().optional(),
    icon: z.string().optional(),
    title: z.string().min(1),
    description: z.string().min(1),
    featured: z.boolean().default(false)
  }))
});

// 5. Outcomes
export const outcomesSectionContentSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  items: z.array(z.object({
    id: z.string().min(1),
    title: z.string().optional(),
    description: z.string().min(1)
  }))
});

// 6. Instructor
export const instructorSectionContentSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  instructors: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    role: z.string().min(1),
    imageUrl: z.string().url().optional().or(z.literal('')),
    imageAlt: z.string().optional(),
    bio: z.array(z.string()),
    socialLinks: z.array(z.object({
      platform: z.string().min(1),
      url: z.string().url()
    })).optional()
  }))
});

// 7. Commitment
export const commitmentSectionContentSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  refund: z.object({
    enabled: z.boolean().default(true),
    headline: z.string().min(1),
    conditions: z.array(z.string()),
    note: z.string().optional()
  }).optional(),
  rewards: z.array(z.object({
    id: z.string().min(1),
    amount: z.number().optional(),
    currency: z.literal('VND').default('VND'),
    title: z.string().min(1),
    description: z.string().min(1)
  })).optional()
});

// 8. Bonuses
export const bonusesSectionContentSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  items: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    statedValue: z.number().optional(),
    currency: z.literal('VND').default('VND')
  }))
});

// 9. Value Stack
export const valueStackSectionContentSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  items: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
    displayValue: z.string().optional()
  })),
  totalDisplayValue: z.string().min(1)
});

// 10. Roadmap
export const roadmapSectionContentSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  phases: z.array(z.object({
    id: z.string().min(1),
    period: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    details: z.array(z.string()).optional()
  }))
});

// 11. Pricing
export const pricingSectionContentSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  plans: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    badge: z.string().optional(),
    price: z.number().nonnegative(),
    originalPrice: z.number().nonnegative().optional(),
    currency: z.literal('VND').default('VND'),
    description: z.string().optional(),
    features: z.array(z.string()).optional(),
    ctaText: z.string().min(1),
    featured: z.boolean().default(false)
  })),
  paymentNote: z.string().optional(),
  securePaymentText: z.string().optional()
});

// 12. Closing Message
export const closingMessageSectionContentSchema = z.object({
  title: z.string().optional(),
  paragraphs: z.array(z.string()),
  signature: z.string().optional()
});

export const courseSectionSchema = z.object({
  id: z.string().uuid(),
  sectionKey: z.string().min(1),
  type: z.enum([
    'hero',
    'quote',
    'pain_points',
    'benefits',
    'outcomes',
    'instructor',
    'commitment',
    'bonuses',
    'value_stack',
    'roadmap',
    'pricing',
    'closing_message',
    'curriculum',
    'testimonials'
  ]),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  variant: z.string().optional(),
  anchorId: z.string().optional(),
  visibility: sectionVisibilitySchema.default('all'),
  content: z.unknown()
});

export const coursePageSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  status: courseStatusSchema.default('draft'),
  seo: courseSeoConfigSchema,
  theme: courseThemeConfigSchema,
  navigation: courseNavigationConfigSchema,
  checkoutConfig: courseCheckoutConfigSchema,
  useTemplate: z.boolean().default(true),
  sections: z.array(courseSectionSchema),
  publishedAt: z.union([z.date(), z.string()]).nullable(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()])
});
