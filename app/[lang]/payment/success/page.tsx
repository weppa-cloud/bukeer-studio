import { PublicPaymentResultPage } from "../payment-result-page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pago enviado | Bukeer",
};

export default async function PublicPaymentSuccessPage(props: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    itinerary_id?: string;
    scheduled_payment_id?: string;
    session_id?: string;
  }>;
}) {
  return <PublicPaymentResultPage kind="success" {...props} />;
}
