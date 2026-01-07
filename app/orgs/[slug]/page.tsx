import { redirect } from "next/navigation"

export default function OrgAliasPage({ params }: { params: { slug: string } }) {
  redirect(`/org/${params.slug}`)
}
