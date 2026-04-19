import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import {
  loginSchema,
  mediaAssetCreateSchema,
  postCreateSchema,
  postUpdateSchema,
  siteConfigSchema,
  tenantCreateSchema,
  validationResultSchema,
} from '@astro-publisher/core';
import {
  createAstroCollectionEntry,
  validatePost,
  type AuthUser,
  type MediaAsset,
  type Post,
  type SiteConfig,
  type Tenant,
  type ValidationResult,
} from '@astro-publisher/core';

export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  AUTH_SECRET: string;
}

type Variables = {
  authUser: AuthUser;
  tenantId: string;
};

type AppContext = {
  Bindings: Env;
  Variables: Variables;
};

type RawTenant = {
  id: string;
  name: string;
  slug: string;
  status: Tenant['status'];
  repo_provider: 'github';
  repo_owner: string | null;
  repo_name: string | null;
  repo_branch: string;
  site_url: string | null;
  preview_url: string | null;
  content_format: Tenant['contentFormat'];
  publish_mode: Tenant['publishMode'];
  media_base_url: string;
  created_at: string;
  updated_at: string;
};

type RawUser = {
  id: string;
  tenant_id: string | null;
  email: string;
  name: string;
  password_hash: string;
  role: AuthUser['role'];
  created_at: string;
  updated_at: string;
};

type RawSiteConfig = {
  id: string;
  tenant_id: string;
  site_name: string;
  site_key: string;
  content_model_version: string;
  enabled_post_types: string;
  categories: string;
  tags_enabled: number;
  allowed_blocks: string;
  seo_defaults: string;
  blog_rules: string;
  created_at: string;
  updated_at: string;
};

type RawPost = {
  id: string;
  tenant_id: string;
  site_config_id: string;
  content_type: 'blogPost';
  status: Post['status'];
  slug: string;
  title: string;
  excerpt: string | null;
  category_id: string | null;
  tag_ids: string | null;
  seo_title: string;
  seo_description: string;
  canonical_url: string | null;
  noindex: number;
  hero_image_id: string | null;
  og_image_id: string | null;
  draft: number;
  published_at: string | null;
  blocks_json: string;
  created_at: string;
  updated_at: string;
};

type RawMediaAsset = {
  id: string;
  tenant_id: string;
  kind: 'image';
  filename: string;
  mime_type: MediaAsset['mimeType'];
  width: number;
  height: number;
  size_bytes: number;
  original_key: string;
  teaser_key: string | null;
  og_key: string | null;
  inline_large_key: string | null;
  inline_small_key: string | null;
  alt: string | null;
  caption: string | null;
  focal_x: number | null;
  focal_y: number | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_ALLOWED_BLOCKS = ['paragraph', 'heading', 'image', 'quote', 'cta', 'faq', 'list'] as const;

const app = new Hono<AppContext>();

function jsonResponse<T>(c: Context<AppContext>, status: number, data: T) {
  return c.json(data, status as never);
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapTenant(row: RawTenant): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    repoProvider: row.repo_provider,
    repoOwner: row.repo_owner ?? undefined,
    repoName: row.repo_name ?? undefined,
    repoBranch: row.repo_branch,
    siteUrl: row.site_url ?? undefined,
    previewUrl: row.preview_url ?? undefined,
    contentFormat: row.content_format,
    publishMode: row.publish_mode,
    mediaBaseUrl: row.media_base_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUser(row: RawUser): AuthUser {
  return {
    id: row.id,
    tenantId: row.tenant_id ?? undefined,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSiteConfig(row: RawSiteConfig): SiteConfig {
  const siteConfig = {
    id: row.id,
    tenantId: row.tenant_id,
    siteName: row.site_name,
    siteKey: row.site_key,
    contentModelVersion: row.content_model_version,
    enabledPostTypes: parseJson<Array<'blogPost'>>(row.enabled_post_types, ['blogPost']),
    categories: parseJson<SiteConfig['categories']>(row.categories, []),
    tagsEnabled: Boolean(row.tags_enabled),
    allowedBlocks: parseJson<SiteConfig['allowedBlocks']>(row.allowed_blocks, [...DEFAULT_ALLOWED_BLOCKS]),
    seoDefaults: parseJson<SiteConfig['seoDefaults']>(row.seo_defaults, {}),
    blogRules: parseJson<SiteConfig['blogRules']>(row.blog_rules, {
      requireHeroImage: true,
      requireExcerpt: true,
      requireCategory: false,
      minBlocks: 2,
      allowMultipleImagesInRow: false,
    }),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return siteConfigSchema.parse(siteConfig);
}

function mapPost(row: RawPost): Post {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    siteConfigId: row.site_config_id,
    contentType: row.content_type,
    status: row.status,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? undefined,
    categoryId: row.category_id ?? undefined,
    tagIds: parseJson<string[]>(row.tag_ids ?? '[]', []),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    canonicalUrl: row.canonical_url ?? undefined,
    noindex: Boolean(row.noindex),
    heroImageId: row.hero_image_id ?? undefined,
    ogImageId: row.og_image_id ?? undefined,
    draft: Boolean(row.draft),
    publishedAt: row.published_at ?? undefined,
    blocks: parseJson<Post['blocks']>(row.blocks_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMediaAsset(row: RawMediaAsset): MediaAsset {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    kind: row.kind,
    filename: row.filename,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    sizeBytes: row.size_bytes,
    originalKey: row.original_key,
    teaserKey: row.teaser_key ?? undefined,
    ogKey: row.og_key ?? undefined,
    inlineLargeKey: row.inline_large_key ?? undefined,
    inlineSmallKey: row.inline_small_key ?? undefined,
    alt: row.alt ?? undefined,
    caption: row.caption ?? undefined,
    focalX: row.focal_x ?? undefined,
    focalY: row.focal_y ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  let binary = '';
  for (const byte of new Uint8Array(signature)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function createToken(user: AuthUser, secret: string): Promise<string> {
  const payload = base64UrlEncode(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    exp: Date.now() + 1000 * 60 * 60 * 8,
  }));
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

async function verifyToken(token: string, secret: string): Promise<{ email: string; role: AuthUser['role']; tenantId?: string } | null> {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = await sign(payload, secret);
  if (signature !== expectedSignature) {
    return null;
  }

  const decoded = JSON.parse(base64UrlDecode(payload)) as {
    email: string;
    role: AuthUser['role'];
    tenantId?: string;
    exp: number;
  };

  if (decoded.exp < Date.now()) {
    return null;
  }

  return decoded;
}

const tenantRepository = {
  async findById(db: D1Database, id: string) {
    const row = await db.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first<RawTenant>();
    return row ? mapTenant(row) : null;
  },
  async findBySlug(db: D1Database, slug: string) {
    const row = await db.prepare('SELECT * FROM tenants WHERE slug = ?').bind(slug).first<RawTenant>();
    return row ? mapTenant(row) : null;
  },
  async list(db: D1Database) {
    const rows = await db.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all<RawTenant>();
    return rows.results.map(mapTenant);
  },
  async create(db: D1Database, input: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO tenants (
          id, name, slug, status, repo_provider, repo_owner, repo_name, repo_branch,
          site_url, preview_url, content_format, publish_mode, media_base_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.name,
        input.slug,
        input.status,
        input.repoProvider,
        input.repoOwner ?? null,
        input.repoName ?? null,
        input.repoBranch,
        input.siteUrl ?? null,
        input.previewUrl ?? null,
        input.contentFormat,
        input.publishMode,
        input.mediaBaseUrl,
      )
      .run();
    return this.findById(db, id);
  },
  async update(db: D1Database, id: string, input: Partial<Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>>) {
    const current = await this.findById(db, id);
    if (!current) {
      return null;
    }

    const next = { ...current, ...input };
    await db
      .prepare(
        `UPDATE tenants SET
          name = ?, slug = ?, status = ?, repo_provider = ?, repo_owner = ?, repo_name = ?, repo_branch = ?,
          site_url = ?, preview_url = ?, content_format = ?, publish_mode = ?, media_base_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      )
      .bind(
        next.name,
        next.slug,
        next.status,
        next.repoProvider,
        next.repoOwner ?? null,
        next.repoName ?? null,
        next.repoBranch,
        next.siteUrl ?? null,
        next.previewUrl ?? null,
        next.contentFormat,
        next.publishMode,
        next.mediaBaseUrl,
        id,
      )
      .run();
    return this.findById(db, id);
  },
};

const userRepository = {
  async findByEmail(db: D1Database, email: string) {
    const row = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<RawUser>();
    return row ? { user: mapUser(row), passwordHash: row.password_hash } : null;
  },
};

const siteConfigRepository = {
  async findByTenantId(db: D1Database, tenantId: string) {
    const row = await db
      .prepare('SELECT * FROM site_configs WHERE tenant_id = ? LIMIT 1')
      .bind(tenantId)
      .first<RawSiteConfig>();
    return row ? mapSiteConfig(row) : null;
  },
  async findBySiteKey(db: D1Database, siteKey: string) {
    const row = await db
      .prepare('SELECT * FROM site_configs WHERE site_key = ? LIMIT 1')
      .bind(siteKey)
      .first<RawSiteConfig>();
    return row ? mapSiteConfig(row) : null;
  },
  async createDefault(db: D1Database, tenant: Tenant) {
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO site_configs (
          id, tenant_id, site_name, site_key, content_model_version, enabled_post_types,
          categories, tags_enabled, allowed_blocks, seo_defaults, blog_rules
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        tenant.id,
        tenant.name,
        `${tenant.slug}-site-key`,
        '1.0.0',
        JSON.stringify(['blogPost']),
        JSON.stringify([]),
        1,
        JSON.stringify([...DEFAULT_ALLOWED_BLOCKS]),
        JSON.stringify({}),
        JSON.stringify({
          requireHeroImage: true,
          requireExcerpt: true,
          requireCategory: false,
          minBlocks: 2,
          allowMultipleImagesInRow: false,
        }),
      )
      .run();
    return this.findByTenantId(db, tenant.id);
  },
};

const postRepository = {
  async listByTenant(db: D1Database, tenantId: string) {
    const rows = await db
      .prepare('SELECT * FROM posts WHERE tenant_id = ? ORDER BY updated_at DESC')
      .bind(tenantId)
      .all<RawPost>();
    return rows.results.map(mapPost);
  },
  async listPublishedBySiteConfig(db: D1Database, siteConfigId: string) {
    const rows = await db
      .prepare('SELECT * FROM posts WHERE site_config_id = ? AND draft = 0 ORDER BY published_at DESC, updated_at DESC')
      .bind(siteConfigId)
      .all<RawPost>();
    return rows.results.map(mapPost);
  },
  async findById(db: D1Database, tenantId: string, id: string) {
    const row = await db
      .prepare('SELECT * FROM posts WHERE tenant_id = ? AND id = ?')
      .bind(tenantId, id)
      .first<RawPost>();
    return row ? mapPost(row) : null;
  },
  async findBySlug(db: D1Database, siteConfigId: string, slug: string) {
    const row = await db
      .prepare('SELECT * FROM posts WHERE site_config_id = ? AND slug = ? AND draft = 0')
      .bind(siteConfigId, slug)
      .first<RawPost>();
    return row ? mapPost(row) : null;
  },
  async slugExists(db: D1Database, tenantId: string, slug: string, excludeId?: string) {
    const baseQuery = 'SELECT id FROM posts WHERE tenant_id = ? AND slug = ?';
    const row = excludeId
      ? await db.prepare(`${baseQuery} AND id != ?`).bind(tenantId, slug, excludeId).first<{ id: string }>()
      : await db.prepare(baseQuery).bind(tenantId, slug).first<{ id: string }>();
    return Boolean(row);
  },
  async create(db: D1Database, post: Post) {
    await db
      .prepare(
        `INSERT INTO posts (
          id, tenant_id, site_config_id, content_type, status, slug, title, excerpt, category_id, tag_ids,
          seo_title, seo_description, canonical_url, noindex, hero_image_id, og_image_id, draft, published_at, blocks_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        post.id,
        post.tenantId,
        post.siteConfigId,
        post.contentType,
        post.status,
        post.slug,
        post.title,
        post.excerpt ?? null,
        post.categoryId ?? null,
        JSON.stringify(post.tagIds),
        post.seoTitle,
        post.seoDescription,
        post.canonicalUrl ?? null,
        Number(post.noindex),
        post.heroImageId ?? null,
        post.ogImageId ?? null,
        Number(post.draft),
        post.publishedAt ?? null,
        JSON.stringify(post.blocks),
      )
      .run();
    return this.findById(db, post.tenantId, post.id);
  },
  async update(db: D1Database, post: Post) {
    await db
      .prepare(
        `UPDATE posts SET
          status = ?, slug = ?, title = ?, excerpt = ?, category_id = ?, tag_ids = ?, seo_title = ?, seo_description = ?,
          canonical_url = ?, noindex = ?, hero_image_id = ?, og_image_id = ?, draft = ?, published_at = ?,
          blocks_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND id = ?`,
      )
      .bind(
        post.status,
        post.slug,
        post.title,
        post.excerpt ?? null,
        post.categoryId ?? null,
        JSON.stringify(post.tagIds),
        post.seoTitle,
        post.seoDescription,
        post.canonicalUrl ?? null,
        Number(post.noindex),
        post.heroImageId ?? null,
        post.ogImageId ?? null,
        Number(post.draft),
        post.publishedAt ?? null,
        JSON.stringify(post.blocks),
        post.tenantId,
        post.id,
      )
      .run();
    return this.findById(db, post.tenantId, post.id);
  },
};

const mediaRepository = {
  async listByTenant(db: D1Database, tenantId: string) {
    const rows = await db
      .prepare('SELECT * FROM media_assets WHERE tenant_id = ? ORDER BY created_at DESC')
      .bind(tenantId)
      .all<RawMediaAsset>();
    return rows.results.map(mapMediaAsset);
  },
  async create(db: D1Database, asset: MediaAsset) {
    await db
      .prepare(
        `INSERT INTO media_assets (
          id, tenant_id, kind, filename, mime_type, width, height, size_bytes, original_key,
          teaser_key, og_key, inline_large_key, inline_small_key, alt, caption, focal_x, focal_y
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        asset.id,
        asset.tenantId,
        asset.kind,
        asset.filename,
        asset.mimeType,
        asset.width,
        asset.height,
        asset.sizeBytes,
        asset.originalKey,
        asset.teaserKey ?? null,
        asset.ogKey ?? null,
        asset.inlineLargeKey ?? null,
        asset.inlineSmallKey ?? null,
        asset.alt ?? null,
        asset.caption ?? null,
        asset.focalX ?? null,
        asset.focalY ?? null,
      )
      .run();
    return asset;
  },
};

function forbidden(c: Context<AppContext>) {
  return jsonResponse(c, 403, { error: 'forbidden', message: 'Zugriff verweigert.' });
}

function canAccessTenant(c: Context<AppContext>, tenantId: string) {
  const authUser = c.get('authUser');
  return authUser.role === 'superadmin' || authUser.tenantId === tenantId;
}

const authMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse(c, 401, { error: 'unauthorized', message: 'Bearer-Token fehlt.' });
  }

  const token = authHeader.slice('Bearer '.length);
  const payload = await verifyToken(token, c.env.AUTH_SECRET);
  if (!payload) {
    return jsonResponse(c, 401, { error: 'unauthorized', message: 'Ungültiger oder abgelaufener Token.' });
  }

  const userRecord = await userRepository.findByEmail(c.env.DB, payload.email);
  if (!userRecord) {
    return jsonResponse(c, 401, { error: 'unauthorized', message: 'Benutzer nicht gefunden.' });
  }

  const authUser = userRecord.user;
  const tenantId = c.req.header('x-tenant-id') ?? authUser.tenantId;

  if (!tenantId) {
    return jsonResponse(c, 400, { error: 'bad_request', message: 'Tenant-Kontext fehlt.' });
  }

  if (authUser.role !== 'superadmin' && authUser.tenantId !== tenantId) {
    return jsonResponse(c, 403, { error: 'forbidden', message: 'Tenant-Zugriff ist nicht erlaubt.' });
  }

  c.set('authUser', authUser);
  c.set('tenantId', tenantId);
  await next();
});

app.use('*', async (c, next) => {
  await next();
  c.header('content-type', 'application/json; charset=utf-8');
});

app.get('/api/health', (c) => {
  return jsonResponse(c, 200, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  });
});

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(c, 400, {
      error: 'validation_failed',
      issues: parsed.error.flatten(),
    });
  }

  const userRecord = await userRepository.findByEmail(c.env.DB, parsed.data.email);
  if (!userRecord) {
    return jsonResponse(c, 401, { error: 'unauthorized', message: 'Login fehlgeschlagen.' });
  }

  const passwordHash = await sha256(parsed.data.password);
  if (passwordHash !== userRecord.passwordHash) {
    return jsonResponse(c, 401, { error: 'unauthorized', message: 'Login fehlgeschlagen.' });
  }

  if (parsed.data.tenantSlug && userRecord.user.role !== 'superadmin') {
    const tenant = await tenantRepository.findBySlug(c.env.DB, parsed.data.tenantSlug);
    if (!tenant || tenant.id !== userRecord.user.tenantId) {
      return jsonResponse(c, 401, { error: 'unauthorized', message: 'Tenant passt nicht zum Benutzer.' });
    }
  }

  const token = await createToken(userRecord.user, c.env.AUTH_SECRET);
  const tenant = userRecord.user.tenantId
    ? await tenantRepository.findById(c.env.DB, userRecord.user.tenantId)
    : null;

  return jsonResponse(c, 200, {
    token,
    user: userRecord.user,
    tenant,
  });
});

app.get('/api/me', authMiddleware, async (c) => {
  const tenantId = c.get('tenantId');
  const authUser = c.get('authUser');
  const tenant = await tenantRepository.findById(c.env.DB, tenantId);
  return jsonResponse(c, 200, { user: authUser, tenant });
});

app.get('/api/tenants', authMiddleware, async (c) => {
  const authUser = c.get('authUser');
  if (authUser.role === 'superadmin') {
    const tenants = await tenantRepository.list(c.env.DB);
    return jsonResponse(c, 200, { tenants });
  }

  const tenant = authUser.tenantId ? await tenantRepository.findById(c.env.DB, authUser.tenantId) : null;
  return jsonResponse(c, 200, { tenants: tenant ? [tenant] : [] });
});

app.post('/api/tenants', authMiddleware, async (c) => {
  if (c.get('authUser').role !== 'superadmin') {
    return forbidden(c);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = tenantCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(c, 400, { error: 'validation_failed', issues: parsed.error.flatten() });
  }

  const tenant = await tenantRepository.create(c.env.DB, parsed.data);
  if (!tenant) {
    return jsonResponse(c, 500, { error: 'tenant_create_failed' });
  }

  const siteConfig = await siteConfigRepository.createDefault(c.env.DB, tenant);
  return jsonResponse(c, 201, { tenant, siteConfig });
});

app.get('/api/tenants/:tenantId', authMiddleware, async (c) => {
  const tenantId = c.req.param('tenantId');
  if (!canAccessTenant(c, tenantId)) {
    return forbidden(c);
  }

  const tenant = await tenantRepository.findById(c.env.DB, tenantId);
  if (!tenant) {
    return jsonResponse(c, 404, { error: 'not_found', message: 'Tenant nicht gefunden.' });
  }

  const siteConfig = await siteConfigRepository.findByTenantId(c.env.DB, tenantId);
  return jsonResponse(c, 200, { tenant, siteConfig });
});

app.patch('/api/tenants/:tenantId', authMiddleware, async (c) => {
  const tenantId = c.req.param('tenantId');
  if (c.get('authUser').role !== 'superadmin') {
    return forbidden(c);
  }

  const body = await c.req.json().catch(() => null);
  const updated = await tenantRepository.update(c.env.DB, tenantId, body ?? {});
  if (!updated) {
    return jsonResponse(c, 404, { error: 'not_found', message: 'Tenant nicht gefunden.' });
  }

  return jsonResponse(c, 200, { tenant: updated });
});

app.get('/api/tenants/:tenantId/posts', authMiddleware, async (c) => {
  const tenantId = c.req.param('tenantId');
  if (!canAccessTenant(c, tenantId)) {
    return forbidden(c);
  }

  const posts = await postRepository.listByTenant(c.env.DB, tenantId);
  return jsonResponse(c, 200, { posts });
});

app.post('/api/tenants/:tenantId/posts', authMiddleware, async (c) => {
  const tenantId = c.req.param('tenantId');
  if (!canAccessTenant(c, tenantId)) {
    return forbidden(c);
  }

  const siteConfig = await siteConfigRepository.findByTenantId(c.env.DB, tenantId);
  if (!siteConfig) {
    return jsonResponse(c, 400, { error: 'missing_site_config', message: 'Site-Konfiguration fehlt.' });
  }

  const body = await c.req.json().catch(() => null);
  const parsed = postCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(c, 400, { error: 'validation_failed', issues: parsed.error.flatten() });
  }

  const slugTaken = await postRepository.slugExists(c.env.DB, tenantId, parsed.data.slug);
  if (slugTaken) {
    return jsonResponse(c, 409, { error: 'slug_conflict', message: 'Slug ist bereits vergeben.' });
  }

  const post: Post = {
    id: crypto.randomUUID(),
    tenantId,
    siteConfigId: siteConfig.id,
    contentType: 'blogPost',
    status: parsed.data.draft ? 'draft' : 'review',
    slug: parsed.data.slug,
    title: parsed.data.title,
    excerpt: parsed.data.excerpt,
    categoryId: parsed.data.categoryId,
    tagIds: parsed.data.tagIds,
    seoTitle: parsed.data.seoTitle,
    seoDescription: parsed.data.seoDescription,
    canonicalUrl: parsed.data.canonicalUrl,
    noindex: parsed.data.noindex,
    heroImageId: parsed.data.heroImageId,
    ogImageId: parsed.data.ogImageId,
    draft: parsed.data.draft,
    publishedAt: undefined,
    blocks: parsed.data.blocks,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const created = await postRepository.create(c.env.DB, post);
  return jsonResponse(c, 201, { post: created });
});

app.get('/api/tenants/:tenantId/posts/:postId', authMiddleware, async (c) => {
  const tenantId = c.req.param('tenantId');
  const postId = c.req.param('postId');
  if (!canAccessTenant(c, tenantId)) {
    return forbidden(c);
  }

  const post = await postRepository.findById(c.env.DB, tenantId, postId);
  if (!post) {
    return jsonResponse(c, 404, { error: 'not_found', message: 'Post nicht gefunden.' });
  }

  return jsonResponse(c, 200, { post });
});

app.patch('/api/tenants/:tenantId/posts/:postId', authMiddleware, async (c) => {
  const tenantId = c.req.param('tenantId');
  const postId = c.req.param('postId');
  if (!canAccessTenant(c, tenantId)) {
    return forbidden(c);
  }

  const existing = await postRepository.findById(c.env.DB, tenantId, postId);
  if (!existing) {
    return jsonResponse(c, 404, { error: 'not_found', message: 'Post nicht gefunden.' });
  }

  const body = await c.req.json().catch(() => null);
  const parsed = postUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(c, 400, { error: 'validation_failed', issues: parsed.error.flatten() });
  }

  const nextSlug = parsed.data.slug ?? existing.slug;
  const slugTaken = await postRepository.slugExists(c.env.DB, tenantId, nextSlug, postId);
  if (slugTaken) {
    return jsonResponse(c, 409, { error: 'slug_conflict', message: 'Slug ist bereits vergeben.' });
  }

  const next: Post = {
    ...existing,
    ...parsed.data,
    slug: nextSlug,
    tagIds: parsed.data.tagIds ?? existing.tagIds,
    blocks: parsed.data.blocks ?? existing.blocks,
    status: parsed.data.draft ?? existing.draft ? 'draft' : existing.status,
    updatedAt: new Date().toISOString(),
  };

  const updated = await postRepository.update(c.env.DB, next);
  return jsonResponse(c, 200, { post: updated });
});

async function buildValidationResult(db: D1Database, post: Post): Promise<ValidationResult> {
  const siteConfig = await siteConfigRepository.findByTenantId(db, post.tenantId);
  const mediaAssets = await mediaRepository.listByTenant(db, post.tenantId);

  if (!siteConfig) {
    return {
      valid: false,
      errors: [{ code: 'missing_site_config', field: 'siteConfig', message: 'Site-Konfiguration fehlt.', severity: 'error' }],
      warnings: [],
    };
  }

  return validatePost(post, siteConfig, mediaAssets);
}

app.post('/api/tenants/:tenantId/posts/:postId/validate', authMiddleware, async (c) => {
  const tenantId = c.req.param('tenantId');
  const postId = c.req.param('postId');
  if (!canAccessTenant(c, tenantId)) {
    return forbidden(c);
  }

  const post = await postRepository.findById(c.env.DB, tenantId, postId);
  if (!post) {
    return jsonResponse(c, 404, { error: 'not_found', message: 'Post nicht gefunden.' });
  }

  const result = buildValidationResult(c.env.DB, post);
  return jsonResponse(c, 200, { validation: validationResultSchema.parse(await result) });
});

app.post('/api/tenants/:tenantId/posts/:postId/publish', authMiddleware, async (c) => {
  const tenantId = c.req.param('tenantId');
  const postId = c.req.param('postId');
  if (!canAccessTenant(c, tenantId)) {
    return forbidden(c);
  }

  const post = await postRepository.findById(c.env.DB, tenantId, postId);
  if (!post) {
    return jsonResponse(c, 404, { error: 'not_found', message: 'Post nicht gefunden.' });
  }

  const validation = await buildValidationResult(c.env.DB, post);
  if (!validation.valid) {
    return jsonResponse(c, 422, { error: 'validation_failed', validation });
  }

  const updated = await postRepository.update(c.env.DB, {
    ...post,
    draft: false,
    status: 'published',
    publishedAt: post.publishedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return jsonResponse(c, 200, {
    post: updated,
    validation,
    publishJob: {
      status: 'completed',
      mode: 'content-service',
    },
  });
});

app.get('/api/tenants/:tenantId/media', authMiddleware, async (c) => {
  const tenantId = c.req.param('tenantId');
  if (!canAccessTenant(c, tenantId)) {
    return forbidden(c);
  }

  const assets = await mediaRepository.listByTenant(c.env.DB, tenantId);
  return jsonResponse(c, 200, { assets });
});

app.post('/api/tenants/:tenantId/media/register', authMiddleware, async (c) => {
  const tenantId = c.req.param('tenantId');
  if (!canAccessTenant(c, tenantId)) {
    return forbidden(c);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = mediaAssetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(c, 400, { error: 'validation_failed', issues: parsed.error.flatten() });
  }

  const asset: MediaAsset = {
    id: crypto.randomUUID(),
    tenantId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...parsed.data,
  };

  await mediaRepository.create(c.env.DB, asset);
  return jsonResponse(c, 201, { asset });
});

app.post('/api/tenants/:tenantId/media/upload-url', authMiddleware, async (c) => {
  const tenantId = c.req.param('tenantId');
  if (!canAccessTenant(c, tenantId)) {
    return forbidden(c);
  }

  const filename = c.req.query('filename') ?? 'upload.bin';
  return jsonResponse(c, 200, {
    method: 'PUT',
    uploadUrl: `https://example-r2-upload.invalid/${tenantId}/${filename}`,
    note: 'MVP-Stub. Die Worker/R2-Signierung ist noch nicht angebunden.',
  });
});

app.get('/api/public/sites/:siteKey/config', async (c) => {
  const siteConfig = await siteConfigRepository.findBySiteKey(c.env.DB, c.req.param('siteKey'));
  if (!siteConfig) {
    return jsonResponse(c, 404, { error: 'not_found', message: 'Site-Konfiguration nicht gefunden.' });
  }

  return jsonResponse(c, 200, { site: siteConfig });
});

app.get('/api/public/sites/:siteKey/posts', async (c) => {
  const siteConfig = await siteConfigRepository.findBySiteKey(c.env.DB, c.req.param('siteKey'));
  if (!siteConfig) {
    return jsonResponse(c, 404, { error: 'not_found', message: 'Site-Konfiguration nicht gefunden.' });
  }

  const posts = await postRepository.listPublishedBySiteConfig(c.env.DB, siteConfig.id);
  const mediaAssets = await mediaRepository.listByTenant(c.env.DB, siteConfig.tenantId);
  return jsonResponse(c, 200, {
    site: siteConfig,
    posts: posts.map((post: Post) => createAstroCollectionEntry(post, mediaAssets)),
  });
});

app.get('/api/public/sites/:siteKey/posts/:slug', async (c) => {
  const siteConfig = await siteConfigRepository.findBySiteKey(c.env.DB, c.req.param('siteKey'));
  if (!siteConfig) {
    return jsonResponse(c, 404, { error: 'not_found', message: 'Site-Konfiguration nicht gefunden.' });
  }

  const post = await postRepository.findBySlug(c.env.DB, siteConfig.id, c.req.param('slug'));
  if (!post) {
    return jsonResponse(c, 404, { error: 'not_found', message: 'Post nicht gefunden.' });
  }

  const mediaAssets = await mediaRepository.listByTenant(c.env.DB, siteConfig.tenantId);
  return jsonResponse(c, 200, { post: createAstroCollectionEntry(post, mediaAssets) });
});

app.notFound((c) => {
  return jsonResponse(c, 404, { error: 'not_found', message: `Route ${c.req.path} ist nicht implementiert.` });
});

export default app;
