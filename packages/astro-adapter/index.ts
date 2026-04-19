import { z } from 'zod';
import { blockSchema } from '@astro-publisher/core';

export const astroCollectionEntrySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  collection: z.literal('blog'),
  data: z.object({
    title: z.string().min(1),
    excerpt: z.string().optional(),
    seoTitle: z.string().min(1),
    seoDescription: z.string().min(1),
    canonicalUrl: z.string().url().optional(),
    noindex: z.boolean(),
    publishedAt: z.string().datetime().optional(),
    heroImage: z
      .object({
        src: z.string().min(1),
        alt: z.string().min(1),
      })
      .optional(),
    blocks: z.array(blockSchema),
  }),
});

export type AstroCollectionEntry = z.infer<typeof astroCollectionEntrySchema>;

export async function fetchPosts(siteKey: string, baseUrl: string): Promise<AstroCollectionEntry[]> {
  const response = await fetch(`${baseUrl}/api/public/sites/${siteKey}/posts`);
  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.status}`);
  }

  const json = (await response.json()) as { posts: unknown[] };
  return z.array(astroCollectionEntrySchema).parse(json.posts);
}

export async function fetchSiteConfig(siteKey: string, baseUrl: string) {
  const response = await fetch(`${baseUrl}/api/public/sites/${siteKey}/config`);
  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.status}`);
  }

  const json = (await response.json()) as { site: unknown };
  return json.site;
}
