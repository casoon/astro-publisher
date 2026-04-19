import { z } from 'zod';

const timestampSchema = z.string().datetime();
const idSchema = z.string().min(1);

export const baseEntitySchema = z.object({
  id: idSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const tenantSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  status: z.enum(['active', 'inactive']),
  repoProvider: z.literal('github'),
  repoOwner: z.string().min(1).optional(),
  repoName: z.string().min(1).optional(),
  repoBranch: z.string().min(1).default('main'),
  siteUrl: z.string().url().optional(),
  previewUrl: z.string().url().optional(),
  contentFormat: z.enum(['json-blocks', 'markdown-blocks']),
  publishMode: z.enum(['direct', 'pull_request']),
  mediaBaseUrl: z.string().url(),
});

export const tenantCreateSchema = tenantSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const userSchema = baseEntitySchema.extend({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  role: z.enum(['superadmin', 'editor']),
});

export const userCreateSchema = userSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const categorySchema = z.object({
  id: idSchema,
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
});

export const siteConfigSchema = baseEntitySchema.extend({
  tenantId: idSchema,
  siteName: z.string().min(1).max(100),
  siteKey: z.string().min(8).max(120),
  contentModelVersion: z.string().min(1),
  enabledPostTypes: z.array(z.literal('blogPost')).min(1),
  categories: z.array(categorySchema),
  tagsEnabled: z.boolean(),
  allowedBlocks: z.array(
    z.enum(['paragraph', 'heading', 'image', 'quote', 'cta', 'faq', 'list']),
  ),
  seoDefaults: z.object({
    titleTemplate: z.string().optional(),
    defaultOgImage: z.string().url().optional(),
  }),
  blogRules: z.object({
    requireHeroImage: z.boolean(),
    requireExcerpt: z.boolean(),
    requireCategory: z.boolean(),
    minBlocks: z.number().int().min(1),
    allowMultipleImagesInRow: z.boolean(),
  }),
});

export const siteConfigCreateSchema = siteConfigSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true,
});

export const paragraphBlockSchema = z.object({
  type: z.literal('paragraph'),
  data: z.object({
    text: z.string().min(1),
  }),
});

export const headingBlockSchema = z.object({
  type: z.literal('heading'),
  data: z.object({
    level: z.union([z.literal(2), z.literal(3)]),
    text: z.string().min(1),
  }),
});

export const imageBlockSchema = z.object({
  type: z.literal('image'),
  data: z.object({
    assetId: idSchema,
    alt: z.string().min(1),
    caption: z.string().max(240).optional(),
  }),
});

export const quoteBlockSchema = z.object({
  type: z.literal('quote'),
  data: z.object({
    text: z.string().min(1),
    cite: z.string().max(120).optional(),
  }),
});

export const ctaBlockSchema = z.object({
  type: z.literal('cta'),
  data: z.object({
    text: z.string().min(1),
    href: z.string().url(),
  }),
});

export const faqBlockSchema = z.object({
  type: z.literal('faq'),
  data: z.object({
    items: z.array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
      }),
    ).min(1),
  }),
});

export const listBlockSchema = z.object({
  type: z.literal('list'),
  data: z.object({
    items: z.array(z.string().min(1)).min(1),
  }),
});

export const blockSchema = z.discriminatedUnion('type', [
  paragraphBlockSchema,
  headingBlockSchema,
  imageBlockSchema,
  quoteBlockSchema,
  ctaBlockSchema,
  faqBlockSchema,
  listBlockSchema,
]);

export const postSchema = baseEntitySchema.extend({
  tenantId: idSchema,
  siteConfigId: idSchema,
  contentType: z.literal('blogPost'),
  status: z.enum(['draft', 'review', 'published']),
  slug: z.string().min(1).max(160).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).optional(),
  categoryId: idSchema.optional(),
  tagIds: z.array(idSchema),
  seoTitle: z.string().min(1).max(70),
  seoDescription: z.string().min(1).max(160),
  canonicalUrl: z.string().url().optional(),
  noindex: z.boolean().default(false),
  heroImageId: idSchema.optional(),
  ogImageId: idSchema.optional(),
  draft: z.boolean(),
  publishedAt: timestampSchema.optional(),
  blocks: z.array(blockSchema),
});

export const postCreateSchema = postSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true,
  siteConfigId: true,
  status: true,
  publishedAt: true,
});

export const postUpdateSchema = postCreateSchema.partial();

export const mediaAssetSchema = baseEntitySchema.extend({
  tenantId: idSchema,
  kind: z.literal('image'),
  filename: z.string().min(1),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().positive(),
  originalKey: z.string().min(1),
  teaserKey: z.string().min(1).optional(),
  ogKey: z.string().min(1).optional(),
  inlineLargeKey: z.string().min(1).optional(),
  inlineSmallKey: z.string().min(1).optional(),
  alt: z.string().min(1).optional(),
  caption: z.string().max(240).optional(),
  focalX: z.number().min(0).max(1).optional(),
  focalY: z.number().min(0).max(1).optional(),
});

export const mediaAssetCreateSchema = mediaAssetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true,
});

export const loginSchema = z.object({
  tenantSlug: z.string().min(1).optional(),
  email: z.string().email(),
  password: z.string().min(8),
});

export const validationIssueSchema = z.object({
  code: z.string().min(1),
  field: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(['warning', 'error']),
});

export const validationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(validationIssueSchema),
  warnings: z.array(validationIssueSchema),
});
