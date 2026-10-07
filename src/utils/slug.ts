// URL-safe name for a category page: "Dum Biryani - Non-Veg" -> "dum-biryani-non-veg".
// Also imported by the Cloudflare Worker that builds /sitemap.xml, so both always agree.
export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'menu';

export const categoryPath = (name: string): string => `/menu/${slugify(name)}`;
