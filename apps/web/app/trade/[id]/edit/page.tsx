import { EditListingClient } from "./edit-listing-client";

type EditListingPageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

export default async function EditListingPage({ params }: EditListingPageProps) {
  const { id } = await params;
  return <EditListingClient listingId={id} />;
}
