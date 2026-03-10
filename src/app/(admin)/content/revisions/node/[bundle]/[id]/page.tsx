import { RevisionList } from './revision-list';

export default async function RevisionListPage({
  params,
}: {
  params: Promise<{ bundle: string; id: string }>;
}) {
  const { bundle, id } = await params;
  const nid = parseInt(id, 10);

  return <RevisionList bundle={bundle} id={nid} />;
}
