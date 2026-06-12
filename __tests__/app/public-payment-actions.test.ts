import { createPublicCheckoutSessionAction } from "@/app/[lang]/payment/pay/actions";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { headers } from "next/headers";

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

jest.mock("@/lib/supabase/service-role", () => ({
  createSupabaseServiceRoleClient: jest.fn(),
}));

const mockHeaders = jest.mocked(headers);
const mockCreateSupabaseServiceRoleClient = jest.mocked(
  createSupabaseServiceRoleClient,
);

describe("public payment checkout action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHeaders.mockResolvedValue(
      new Headers({
        host: "pay.bukeer.test",
        "x-forwarded-proto": "https",
      }) as never,
    );
  });

  it("invokes the shared checkout edge function with Stripe return URLs", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: { checkout_url: "https://checkout.stripe.test/session" },
      },
      error: null,
    });
    mockCreateSupabaseServiceRoleClient.mockReturnValue({
      functions: { invoke },
    } as never);

    await expect(
      createPublicCheckoutSessionAction(
        formData({
          itineraryId: "11111111-1111-4111-8111-111111111111",
          lang: "es",
          scheduledPaymentId: "22222222-2222-4222-8222-222222222222",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:https://checkout.stripe.test/session");

    expect(invoke).toHaveBeenCalledWith("create-checkout-session", {
      body: {
        cancel_url:
          "https://pay.bukeer.test/es/payment/cancel?itinerary_id=11111111-1111-4111-8111-111111111111&scheduled_payment_id=22222222-2222-4222-8222-222222222222",
        itinerary_id: "11111111-1111-4111-8111-111111111111",
        scheduled_payment_id: "22222222-2222-4222-8222-222222222222",
        success_url:
          "https://pay.bukeer.test/es/payment/success?itinerary_id=11111111-1111-4111-8111-111111111111&scheduled_payment_id=22222222-2222-4222-8222-222222222222&session_id=%7BCHECKOUT_SESSION_ID%7D",
      },
    });
  });

  it("redirects back with a validation error for invalid payment payloads", async () => {
    await expect(
      createPublicCheckoutSessionAction(
        formData({
          itineraryId: "not-a-uuid",
          lang: "es",
          scheduledPaymentId: "",
        }),
      ),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/es/payment/pay?itinerary_id=not-a-uuid&paymentError=validation",
    );
    expect(mockCreateSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("redirects back with the checkout error when the edge function fails", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: {
        success: false,
        error: "Stripe no disponible",
      },
      error: null,
    });
    mockCreateSupabaseServiceRoleClient.mockReturnValue({
      functions: { invoke },
    } as never);

    await expect(
      createPublicCheckoutSessionAction(
        formData({
          itineraryId: "11111111-1111-4111-8111-111111111111",
          lang: "en",
          scheduledPaymentId: "",
        }),
      ),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/en/payment/pay?itinerary_id=11111111-1111-4111-8111-111111111111&paymentError=Stripe%20no%20disponible",
    );
  });
});

function formData(values: {
  itineraryId: string;
  lang: string;
  scheduledPaymentId: string;
}) {
  const data = new FormData();
  data.set("itineraryId", values.itineraryId);
  data.set("lang", values.lang);
  data.set("scheduledPaymentId", values.scheduledPaymentId);
  return data;
}
