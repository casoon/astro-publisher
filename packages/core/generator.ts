import type { AstroCollectionEntry, MediaAsset, Post } from './types';

export function createAstroCollectionEntry(
  post: Post,
  mediaAssets: MediaAsset[] = [],
): AstroCollectionEntry {
  const heroAsset = mediaAssets.find((asset) => asset.id === post.heroImageId);

  return {
    id: post.id,
    slug: post.slug,
    collection: 'blog',
    data: {
      title: post.title,
      excerpt: post.excerpt,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      canonicalUrl: post.canonicalUrl,
      noindex: post.noindex,
      publishedAt: post.publishedAt,
      heroImage: heroAsset
        ? {
            src: heroAsset.teaserKey ?? heroAsset.originalKey,
            alt: heroAsset.alt ?? '',
          }
        : undefined,
      blocks: post.blocks,
    },
  };
}
