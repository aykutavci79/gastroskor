import { redirect } from "next/navigation";

export default function ArDeriStoryRedirectPage({
  params,
}: {
  params: { slug: string };
}) {
  redirect(`/ar/oyku/${params.slug}`);
}
