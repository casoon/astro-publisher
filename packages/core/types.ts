export type TenantId = string;
export type UserId = string;
export type SiteConfigId = string;
export type PostId = string;
export type AssetId = string;

export type UserRole = 'superadmin' | 'editor';
export type TenantStatus = 'active' | 'inactive';
export type PublishMode = 'direct' | 'pull_request';
export type ContentFormat = 'json-blocks' | 'markdown-blocks';
export type PostStatus = 'draft' | 'review' | 'published';
export type ValidationSeverity = 'warning' | 'error';

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'image'
  | 'quote'
  | 'cta'
  | 'faq'
  | 'list';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant extends BaseEntity {
  name: string;
  slug: string;
  status: TenantStatus;
  repoProvider: 'github';
  repoOwner?: string;
  repoName?: string;
  repoBranch: string;
  siteUrl?: string;
  previewUrl?: string;
  contentFormat: ContentFormat;
  publishMode: PublishMode;
  mediaBaseUrl: string;
}

export interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthUser extends User {
  tenantId?: TenantId;
}

export interface SiteConfig extends BaseEntity {
  tenantId: TenantId;
  siteName: string;
  siteKey: string;
  contentModelVersion: string;
  enabledPostTypes: Array<'blogPost'>;
  categories: Array<{
    id: string;
    slug: string;
    label: string;
    description?: string;
  }>;
  tagsEnabled: boolean;
  allowedBlocks: BlockType[];
  seoDefaults: {
    titleTemplate?: string;
    defaultOgImage?: string;
  };
  blogRules: {
    requireHeroImage: boolean;
    requireExcerpt: boolean;
    requireCategory: boolean;
    minBlocks: number;
    allowMultipleImagesInRow: boolean;
  };
}

export interface MediaAsset extends BaseEntity {
  tenantId: TenantId;
  kind: 'image';
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  originalKey: string;
  teaserKey?: string;
  ogKey?: string;
  inlineLargeKey?: string;
  inlineSmallKey?: string;
  alt?: string;
  caption?: string;
  focalX?: number;
  focalY?: number;
}

export interface ParagraphBlock {
  type: 'paragraph';
  data: {
    text: string;
  };
}

export interface HeadingBlock {
  type: 'heading';
  data: {
    level: 2 | 3;
    text: string;
  };
}

export interface ImageBlock {
  type: 'image';
  data: {
    assetId: AssetId;
    alt: string;
    caption?: string;
  };
}

export interface QuoteBlock {
  type: 'quote';
  data: {
    text: string;
    cite?: string;
  };
}

export interface CtaBlock {
  type: 'cta';
  data: {
    text: string;
    href: string;
  };
}

export interface FaqBlock {
  type: 'faq';
  data: {
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
}

export interface ListBlock {
  type: 'list';
  data: {
    items: string[];
  };
}

export type PostBlock =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | QuoteBlock
  | CtaBlock
  | FaqBlock
  | ListBlock;

export interface Post extends BaseEntity {
  tenantId: TenantId;
  siteConfigId: SiteConfigId;
  contentType: 'blogPost';
  status: PostStatus;
  slug: string;
  title: string;
  excerpt?: string;
  categoryId?: string;
  tagIds: string[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrl?: string;
  noindex: boolean;
  heroImageId?: AssetId;
  ogImageId?: AssetId;
  draft: boolean;
  publishedAt?: string;
  blocks: PostBlock[];
}

export interface ValidationIssue {
  code: string;
  field: string;
  message: string;
  severity: ValidationSeverity;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface PublicSitePayload {
  site: SiteConfig;
  posts: Post[];
}

export interface AstroCollectionEntry {
  id: string;
  slug: string;
  collection: 'blog';
  data: {
    title: string;
    excerpt?: string;
    seoTitle: string;
    seoDescription: string;
    canonicalUrl?: string;
    noindex: boolean;
    publishedAt?: string;
    heroImage?: {
      src: string;
      alt: string;
    };
    blocks: PostBlock[];
  };
}
