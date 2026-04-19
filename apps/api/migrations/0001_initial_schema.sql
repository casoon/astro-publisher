PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  repo_provider TEXT NOT NULL DEFAULT 'github',
  repo_owner TEXT,
  repo_name TEXT,
  repo_branch TEXT NOT NULL DEFAULT 'main',
  site_url TEXT,
  preview_url TEXT,
  content_format TEXT NOT NULL CHECK (content_format IN ('json-blocks', 'markdown-blocks')),
  publish_mode TEXT NOT NULL CHECK (publish_mode IN ('direct', 'pull_request')),
  media_base_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'editor')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS site_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  site_name TEXT NOT NULL,
  site_key TEXT NOT NULL UNIQUE,
  content_model_version TEXT NOT NULL,
  enabled_post_types TEXT NOT NULL,
  categories TEXT NOT NULL,
  tags_enabled INTEGER NOT NULL DEFAULT 1,
  allowed_blocks TEXT NOT NULL,
  seo_defaults TEXT NOT NULL,
  blog_rules TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  site_config_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('blogPost')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'published')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  category_id TEXT,
  tag_ids TEXT NOT NULL DEFAULT '[]',
  seo_title TEXT NOT NULL,
  seo_description TEXT NOT NULL,
  canonical_url TEXT,
  noindex INTEGER NOT NULL DEFAULT 0,
  hero_image_id TEXT,
  og_image_id TEXT,
  draft INTEGER NOT NULL DEFAULT 1,
  published_at TEXT,
  blocks_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (site_config_id) REFERENCES site_configs(id) ON DELETE CASCADE,
  UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image')),
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  size_bytes INTEGER NOT NULL,
  original_key TEXT NOT NULL,
  teaser_key TEXT,
  og_key TEXT,
  inline_large_key TEXT,
  inline_small_key TEXT,
  alt TEXT,
  caption TEXT,
  focal_x REAL,
  focal_y REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_configs_tenant_id ON site_configs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_posts_tenant_id ON posts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_posts_site_config_id ON posts (site_config_id);
CREATE INDEX IF NOT EXISTS idx_posts_status_draft ON posts (status, draft);
CREATE INDEX IF NOT EXISTS idx_media_assets_tenant_id ON media_assets (tenant_id);
