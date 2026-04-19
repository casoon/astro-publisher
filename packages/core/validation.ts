import type { MediaAsset, Post, SiteConfig, ValidationIssue, ValidationResult } from './types';

const GENERIC_ALT_TEXT = new Set(['image', 'foto', 'bild', 'teaserbild', 'hero image']);

function createIssue(
  severity: ValidationIssue['severity'],
  code: string,
  field: string,
  message: string,
): ValidationIssue {
  return { severity, code, field, message };
}

export function validatePost(
  post: Post,
  siteConfig: SiteConfig,
  mediaAssets: MediaAsset[] = [],
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const heroAsset = mediaAssets.find((asset) => asset.id === post.heroImageId);
  const textBlocks = post.blocks.filter((block) => block.type === 'paragraph' || block.type === 'quote');
  const headingBlocks = post.blocks.filter((block) => block.type === 'heading');

  if (!post.title.trim()) {
    issues.push(createIssue('error', 'title_required', 'title', 'Titel muss vorhanden sein.'));
  }

  if (!post.slug.trim()) {
    issues.push(createIssue('error', 'slug_required', 'slug', 'Slug muss vorhanden sein.'));
  }

  if (!post.seoTitle.trim()) {
    issues.push(createIssue('error', 'seo_title_required', 'seoTitle', 'SEO-Titel muss vorhanden sein.'));
  }

  if (!post.seoDescription.trim()) {
    issues.push(
      createIssue('error', 'seo_description_required', 'seoDescription', 'SEO-Description muss vorhanden sein.'),
    );
  }

  if (siteConfig.blogRules.requireHeroImage && !post.heroImageId) {
    issues.push(createIssue('error', 'hero_image_required', 'heroImageId', 'Hero-Bild muss vorhanden sein.'));
  }

  if (post.heroImageId && !heroAsset?.alt?.trim()) {
    issues.push(createIssue('error', 'hero_alt_required', 'heroImageId', 'Hero-Bild braucht Alt-Text.'));
  }

  if (siteConfig.blogRules.requireExcerpt && !post.excerpt?.trim()) {
    issues.push(createIssue('error', 'excerpt_required', 'excerpt', 'Excerpt muss vorhanden sein.'));
  }

  if (siteConfig.blogRules.requireCategory && !post.categoryId) {
    issues.push(createIssue('error', 'category_required', 'categoryId', 'Kategorie muss gesetzt sein.'));
  }

  if (post.blocks.length < siteConfig.blogRules.minBlocks) {
    issues.push(
      createIssue(
        'error',
        'min_blocks',
        'blocks',
        `Mindestens ${siteConfig.blogRules.minBlocks} Blöcke sind erforderlich.`,
      ),
    );
  }

  if (textBlocks.length === 0) {
    issues.push(createIssue('error', 'text_block_required', 'blocks', 'Body braucht mindestens einen Textblock.'));
  }

  for (const block of post.blocks) {
    if (block.type === 'heading' && !block.data.text.trim()) {
      issues.push(createIssue('error', 'heading_empty', 'blocks', 'Überschriften dürfen nicht leer sein.'));
    }

    if (block.type === 'cta' && !block.data.href.trim()) {
      issues.push(createIssue('error', 'cta_link_required', 'blocks', 'CTA-Links dürfen nicht leer sein.'));
    }

    if (block.type === 'faq') {
      for (const item of block.data.items) {
        if (!item.question.trim()) {
          issues.push(createIssue('error', 'faq_question_required', 'blocks', 'FAQ-Fragen dürfen nicht leer sein.'));
        }
      }
    }

    if (block.type === 'image' && GENERIC_ALT_TEXT.has(block.data.alt.trim().toLowerCase())) {
      issues.push(
        createIssue(
          'warning',
          'generic_alt_text',
          'blocks',
          'Alt-Text wirkt generisch und sollte präziser formuliert werden.',
        ),
      );
    }
  }

  if (post.seoTitle.length > 60) {
    issues.push(createIssue('warning', 'seo_title_long', 'seoTitle', 'SEO-Titel ist länger als empfohlen.'));
  }

  if (post.seoDescription.length > 155) {
    issues.push(
      createIssue(
        'warning',
        'seo_description_long',
        'seoDescription',
        'SEO-Description ist länger als empfohlen.',
      ),
    );
  }

  if (post.blocks.length > 0 && headingBlocks.length === 0) {
    issues.push(
      createIssue('warning', 'missing_subheading', 'blocks', 'Ein Zwischenheading verbessert Lesbarkeit und SEO.'),
    );
  }

  if (textBlocks.length > 0 && textBlocks.every((block) => block.type === 'paragraph' && block.data.text.length < 160)) {
    issues.push(createIssue('warning', 'article_too_short', 'blocks', 'Der Artikel wirkt sehr kurz.'));
  }

  if (heroAsset && heroAsset.width > 2800) {
    issues.push(
      createIssue('warning', 'hero_image_large', 'heroImageId', 'Hero-Bild ist ungewöhnlich groß und sollte geprüft werden.'),
    );
  }

  return {
    valid: issues.every((issue) => issue.severity !== 'error'),
    errors: issues.filter((issue) => issue.severity === 'error'),
    warnings: issues.filter((issue) => issue.severity === 'warning'),
  };
}
