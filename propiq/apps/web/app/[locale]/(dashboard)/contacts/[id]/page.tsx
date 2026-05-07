import { ContactDetail } from "@/components/contacts/ContactDetail";

export default function ContactDetailPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  return <ContactDetail locale={params.locale} id={params.id} />;
}
