import { redirect } from "next/navigation";

export default function ArKemikStoryRedirectPage({
  params,
}: {
  params: { slug: string };
}) {
  redirect(`/ar/oyku/${params.slug}`);
}
