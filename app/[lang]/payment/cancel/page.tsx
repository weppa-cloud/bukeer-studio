import { PublicPaymentResultPage } from "../payment-result-page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pago cancelado | Bukeer",
};

export default async function PublicPaymentCancelPage(props: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    itinerary_id?: string;
    scheduled_payment_id?: string;
    session_id?: string;
  }>;
}) {
  return <PublicPaymentResultPage kind="cancel" {...props} />;
}
