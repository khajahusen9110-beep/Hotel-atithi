// Image URL helpers: serve each image at the size it is displayed at.

const UNSPLASH_HOST = 'images.unsplash.com';

const isUnsplash = (url: string): boolean => {
  try {
    return new URL(url).hostname === UNSPLASH_HOST;
  } catch {
    return false;
  }
};

/** Returns the URL resized to `width` CSS pixels when the host supports resizing. */
export const sizedImageUrl = (url: string, width: number, quality = 70): string => {
  if (!isUnsplash(url)) return url;
  const u = new URL(url);
  u.searchParams.set('w', String(Math.round(width)));
  u.searchParams.set('q', String(quality));
  u.searchParams.set('auto', 'format');
  u.searchParams.set('fit', 'crop');
  return u.toString();
};

/** 1x / 2x srcset for resizable hosts; undefined otherwise so the plain src is used. */
export const imageSrcSet = (url: string, width: number): string | undefined => {
  if (!isUnsplash(url)) return undefined;
  return `${sizedImageUrl(url, width)} 1x, ${sizedImageUrl(url, width * 2, 60)} 2x`;
};

export const FALLBACK_FOOD_IMAGE =
  'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=60';

/** Width-descriptor srcset (pair with `sizes`) for resizable hosts; undefined otherwise. */
export const responsiveSrcSet = (url: string, widths: number[]): string | undefined => {
  if (!isUnsplash(url)) return undefined;
  return widths.map((w) => `${sizedImageUrl(url, w)} ${w}w`).join(', ');
};
