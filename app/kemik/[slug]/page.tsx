import { redirect } from "next/navigation";

export default function KemikLegacyRedirect({ params }: { params: { slug: string } }) {
  redirect(`/oyku/${params.slug}`);
}
