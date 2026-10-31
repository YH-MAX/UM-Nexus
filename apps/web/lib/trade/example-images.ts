import variants from "./example-image-variants.json";

type Variant = (typeof variants)[keyof typeof variants];
type ResponsiveImage = Variant & { card: Variant["full"]; cardSrcSet: string; detailSrcSet: string };
export const exampleImages: Record<string, ResponsiveImage> = Object.fromEntries(Object.entries(variants).map(([id, image]) => {
  const thumbnails = image.thumbnails.length ? image.thumbnails : [image.full];
  return [id, { ...image, card: thumbnails[thumbnails.length - 1], cardSrcSet: thumbnails.map((item) => `${item.src} ${item.width}w`).join(", "), detailSrcSet: [...image.thumbnails, image.full].map((item) => `${item.src} ${item.width}w`).join(", ") }];
}));
export const exampleCardSizes = "(min-width: 1280px) 280px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, calc(100vw - 48px)";
