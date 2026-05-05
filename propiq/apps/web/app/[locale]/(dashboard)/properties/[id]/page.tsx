import { PropertyDetail } from "@/components/properties/PropertyDetail";

export default function PropertyDetailPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  return <PropertyDetail locale={params.locale} id={params.id} />;
}
