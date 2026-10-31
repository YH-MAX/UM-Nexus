import { ListingDetailClient } from "./listing-detail-client";
import { notFound } from "next/navigation";
import { ExampleListingDetail } from "@/components/trade/example-listing-detail";
import { getListingExample, listingExamples } from "@/lib/trade/listing-examples";

type ListingDetailPageProps = Readonly<{
  params: Promise<{
    id: string;
  }>;
}>;

export default async function ListingDetailPage({
  params,
}: ListingDetailPageProps) {
  const { id } = await params;

  if (id.startsWith("example-")) {
    const item = getListingExample(id);
    if (!item) notFound();
    const related = listingExamples.filter((other) => other.category === item.category && other.id !== item.id).slice(0, 6);
    return <ExampleListingDetail item={item} related={related} />;
  }

  return <ListingDetailClient listingId={id} />;
}

export async function generateMetadata({ params }: ListingDetailPageProps) {
  const { id } = await params;
  if (!id.startsWith("example-")) return {};
  const item = getListingExample(id);
  return { title: item ? `${item.title} · Demo | UM Nexus` : "Example not found | UM Nexus", robots: { index: false, follow: true } };
}
