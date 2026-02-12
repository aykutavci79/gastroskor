import { redirect } from "next/navigation";

export default function DeriLegacyRedirect({ params }: { params: { slug: string } }) {
  redirect(`/oyku/${params.slug}`);
}
