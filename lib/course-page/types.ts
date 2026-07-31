import { z } from 'zod';

export type CourseStatus = 'draft' | 'published' | 'archived';

export interface CourseSeoConfig {
  title: string;
  description: string;
  image?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  keywords?: string[];
}

export interface CourseThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  backgroundColor: string;
  surfaceColor?: string;
  textColor: string;
  mutedTextColor?: string;
  borderColor?: string;
  headingFont?: string;
  bodyFont?: string;
  borderRadius?: string;
  buttonRadius?: string;
  containerWidth?: string;
  backgroundImage?: string;
  backgroundOverlay?: string;
}

export interface CourseNavigationConfig {
  logoUrl?: string;
  shortName: string;
  progressLabel?: string;
  showProgress?: boolean;
  ctaText: string;
  ctaTargetSectionId?: string;
  sticky?: boolean;
}

export interface CourseCheckoutConfig {
  enabled: boolean;
  provider: 'sepay' | 'vietqr' | 'manual';
  currency: 'VND';
  defaultPlanId?: string;
  bankAccountId?: string;
  accountName?: string;
  bankCode?: string;
  paymentDescriptionPrefix: string;
  orderExpirationMinutes: number;
  registrationFields: Array<{
    name: 'fullName' | 'phone' | 'email' | string;
    label: string;
    type: 'text' | 'tel' | 'email';
    required: boolean;
    placeholder?: string;
  }>;
  successMode: 'redirect' | 'show_message' | 'redirect_to_zalo';
  successRedirectUrl?: string;
  zaloGroupUrl?: string;
  legalText?: string;
  privacyText?: string;
}

export type CourseSectionType =
  | 'hero'
  | 'quote'
  | 'pain_points'
  | 'benefits'
  | 'outcomes'
  | 'instructor'
  | 'commitment'
  | 'bonuses'
  | 'value_stack'
  | 'roadmap'
  | 'pricing'
  | 'closing_message'
  | 'curriculum'
  | 'testimonials';

export type SectionVisibility = 'all' | 'unregistered' | 'registered';

export interface CourseSectionBase<TType, TContent> {
  id: string;
  sectionKey: string;
  type: TType;
  enabled: boolean;
  sortOrder: number;
  variant?: string;
  anchorId?: string;
  visibility: SectionVisibility;
  content: TContent;
}

// 1. Hero Section Content
export interface HeroSectionContent {
  eyebrow?: string;
  title: string;
  highlightedText?: string;
  description: string;
  imageUrl?: string;
  imageAlt?: string;
  videoUrl?: string;
  startDate?: string;
  durationLabel?: string;
  audience?: string;
  stats?: Array<{
    value: string;
    label: string;
  }>;
  primaryCta: {
    label: string;
    action: 'open_registration' | 'scroll' | 'external_link';
    target?: string;
  };
  secondaryCta?: {
    label: string;
    action: 'scroll' | 'external_link';
    target: string;
  };
}
export type HeroSection = CourseSectionBase<'hero', HeroSectionContent>;

// 2. Quote Section Content
export interface QuoteSectionContent {
  quote: string;
  author?: string;
  caption?: string;
}
export type QuoteSection = CourseSectionBase<'quote', QuoteSectionContent>;

// 3. Pain Points Content
export interface PainPointsSectionContent {
  eyebrow?: string;
  title: string;
  description?: string;
  items: Array<{
    id: string;
    icon?: string;
    title: string;
    description: string;
  }>;
}
export type PainPointsSection = CourseSectionBase<'pain_points', PainPointsSectionContent>;

// 4. Benefits Content
export interface BenefitsSectionContent {
  eyebrow?: string;
  title: string;
  description?: string;
  items: Array<{
    id: string;
    badge?: string;
    icon?: string;
    title: string;
    description: string;
    featured?: boolean;
  }>;
}
export type BenefitsSection = CourseSectionBase<'benefits', BenefitsSectionContent>;

// 5. Outcomes Content
export interface OutcomesSectionContent {
  eyebrow?: string;
  title: string;
  description?: string;
  items: Array<{
    id: string;
    title?: string;
    description: string;
  }>;
}
export type OutcomesSection = CourseSectionBase<'outcomes', OutcomesSectionContent>;

// 6. Instructor Content
export interface InstructorSectionContent {
  eyebrow?: string;
  title: string;
  description?: string;
  instructors: Array<{
    id: string;
    name: string;
    role: string;
    imageUrl?: string;
    imageAlt?: string;
    bio: string[];
    socialLinks?: Array<{
      platform: string;
      url: string;
    }>;
  }>;
}
export type InstructorSection = CourseSectionBase<'instructor', InstructorSectionContent>;

// 7. Commitment Content
export interface CommitmentSectionContent {
  eyebrow?: string;
  title: string;
  description?: string;
  refund?: {
    enabled: boolean;
    headline: string;
    conditions: string[];
    note?: string;
  };
  rewards?: Array<{
    id: string;
    amount?: number;
    currency?: 'VND';
    title: string;
    description: string;
  }>;
}
export type CommitmentSection = CourseSectionBase<'commitment', CommitmentSectionContent>;

// 8. Bonuses Content
export interface BonusesSectionContent {
  eyebrow?: string;
  title: string;
  description?: string;
  items: Array<{
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    statedValue?: number;
    currency?: 'VND';
  }>;
}
export type BonusesSection = CourseSectionBase<'bonuses', BonusesSectionContent>;

// 9. Value Stack Content
export interface ValueStackSectionContent {
  eyebrow?: string;
  title: string;
  description?: string;
  items: Array<{
    id: string;
    label: string;
    minValue?: number;
    maxValue?: number;
    displayValue?: string;
  }>;
  totalDisplayValue: string;
}
export type ValueStackSection = CourseSectionBase<'value_stack', ValueStackSectionContent>;

// 10. Roadmap Content
export interface RoadmapSectionContent {
  eyebrow?: string;
  title: string;
  description?: string;
  phases: Array<{
    id: string;
    period: string;
    title: string;
    description: string;
    details?: string[];
  }>;
}
export type RoadmapSection = CourseSectionBase<'roadmap', RoadmapSectionContent>;

// 11. Pricing Content
export interface PricingSectionContent {
  eyebrow?: string;
  title?: string;
  plans: Array<{
    id: string;
    name: string;
    badge?: string;
    price: number;
    originalPrice?: number;
    currency: 'VND';
    description?: string;
    features?: string[];
    ctaText: string;
    featured?: boolean;
  }>;
  paymentNote?: string;
  securePaymentText?: string;
}
export type PricingSection = CourseSectionBase<'pricing', PricingSectionContent>;

// 12. Closing Message Content
export interface ClosingMessageSectionContent {
  title?: string;
  paragraphs: string[];
  signature?: string;
}
export type ClosingMessageSection = CourseSectionBase<'closing_message', ClosingMessageSectionContent>;

export type CourseSection =
  | HeroSection
  | QuoteSection
  | PainPointsSection
  | BenefitsSection
  | OutcomesSection
  | InstructorSection
  | CommitmentSection
  | BonusesSection
  | ValueStackSection
  | RoadmapSection
  | PricingSection
  | ClosingMessageSection;

export interface CoursePage {
  id: string;
  slug: string;
  name: string;
  status: CourseStatus;
  seo: CourseSeoConfig;
  theme: CourseThemeConfig;
  navigation: CourseNavigationConfig;
  checkoutConfig: CourseCheckoutConfig;
  useTemplate: boolean;
  sections: CourseSection[];
  publishedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}
