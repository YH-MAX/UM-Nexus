import Image from "next/image";
import type { ListingImage } from "@/lib/trade/api";

function optimizedSource(image: ListingImage): string | null {
  if (!image.public_url) return null;
  try {
    const url = new URL(image.public_url);
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    if (url.protocol !== "https:" || url.origin !== project.origin || !url.pathname.startsWith("/storage/v1/object/public/listing-images/")) return null;
    // Uploads use new UUID object paths. A replacement also receives a new id/hash.
    url.searchParams.set("v", image.content_hash || image.id);
    return url.toString();
  } catch { return null; }
}

export function ListingPhoto({ image, alt, className, sizes, eager = false }: Readonly<{
  image: ListingImage;
  alt: string;
  className: string;
  sizes: string;
  eager?: boolean;
}>) {
  if (!image.public_url) return null;
  const source = optimizedSource(image);
  if (source) return <Image alt={alt} className={className} fill fetchPriority={eager ? "high" : "auto"} loading={eager ? "eager" : "lazy"} sizes={sizes} src={source} />;
  // Keep data/blob previews, development uploads and legacy external URLs usable.
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} className={className} decoding="async" loading={eager ? "eager" : "lazy"} src={image.public_url} />;
}
