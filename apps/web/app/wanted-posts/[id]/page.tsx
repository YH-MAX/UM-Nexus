import { WantedPostDetailClient } from "./wanted-post-detail-client";

type WantedPostDetailPageProps = Readonly<{
  params: Promise<{
    id: string;
  }>;
}>;

export default async function WantedPostDetailPage({
  params,
}: WantedPostDetailPageProps) {
  const { id } = await params;

  return <WantedPostDetailClient wantedPostId={id} />;
}
