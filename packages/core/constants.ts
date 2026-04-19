/**
 * Constants for the Astro Publisher core package.
 * These constants define fixed values used across the entire monorepo.
 */

export const CONTENT_TYPES = {
  BLOG_POST: 'blogPost',
  NEWS: 'news',
  CASE_STUDY: 'caseStudy',
} as const;

export const POST_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const;

export const BLOCK_TYPES = {
  PARAGRAPH: 'paragraph',
  HEADING: 'heading',
  IMAGE: 'image',
  QUOTE: 'quote',
  CTA: 'cta',
  FAQ: 'faq',
  LIST: 'list',
} as const;

export const API_ENDPOINTS = {
  PUBLIC_CONFIG: (siteKey: string) => `/api/public/sites/${siteKey}/config`,
  PUBLIC_POSTS: (siteKey: string) => `/api/public/sites/${siteKey}/posts`,
  PUBLIC_POST_DETAIL: (siteKey: string, slug: string) => `/api/public/sites/${siteKey}/posts/${slug}`,
  PUBLIC_CATEGORIES: (siteKey: string) => `/api/public/sites/${siteKey}/categories`,
} as const;

export const ERROR_MESSAGES = {
  AUTH_REQUIRED: 'Authentication required.',
  TENANT_NOT_FOUND: 'Tenant not found.',
  UNAUTHORIZED: 'You do not have permission to perform this action.',
  VALIDATION_FAILED: 'Validation failed.',
  NOT_FOUND: 'Resource not found.',
} as const;
