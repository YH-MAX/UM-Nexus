import { ListingDetailClient } from "./listing-detail-client";

type ListingDetailPageProps = Readonly<{
  params: Promise<{
    id: string;
  }>;
}>;

export default async function ListingDetailPage({
  params,
}: ListingDetailPageProps) {
  const { id } = await params;

  return <ListingDetailClient listingId={id} />;
}
