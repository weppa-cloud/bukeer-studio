"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createPublicPassengerRegistration,
  type PublicItinerarySupabaseClient,
} from "@/lib/admin-next/public-itinerary";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

const PublicPassengerFormSchema = z.object({
  acceptedTerms: z.literal("on"),
  birthDate: z.preprocess(
    (value) => (value === null ? "" : value),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .or(z.literal("")),
  ),
  documentNumber: z.string().trim().min(3).max(60),
  documentType: z.string().trim().min(2).max(60),
  email: z.preprocess(
    (value) => (value === null ? "" : value),
    z.string().trim().email().or(z.literal("")),
  ),
  firstName: z.string().trim().min(1).max(80),
  gender: z.string().trim().max(40),
  itineraryId: z.string().uuid(),
  isMainPassenger: z
    .enum(["true", "false", "on"])
    .optional()
    .transform((value) => value === "true" || value === "on"),
  lang: z.enum(["es", "en"]),
  lastName: z.string().trim().min(1).max(80),
  nationality: z.string().trim().min(2).max(80),
  phoneNumber: z.string().trim().max(40),
});

export async function addPublicPassengerAction(formData: FormData) {
  const parsed = PublicPassengerFormSchema.safeParse({
    acceptedTerms: formData.get("acceptedTerms"),
    birthDate: formData.get("birthDate"),
    documentNumber: formData.get("documentNumber"),
    documentType: formData.get("documentType"),
    email: formData.get("email"),
    firstName: formData.get("firstName"),
    gender: formData.get("gender"),
    itineraryId: formData.get("itineraryId"),
    isMainPassenger: formData.get("isMainPassenger") ?? "false",
    lang: formData.get("lang"),
    lastName: formData.get("lastName"),
    nationality: formData.get("nationality"),
    phoneNumber: formData.get("phoneNumber"),
  });

  const lang = formData.get("lang") === "en" ? "en" : "es";
  const itineraryId = String(formData.get("itineraryId") ?? "");
  const redirectPath = `/${lang}/view/${itineraryId}?hideEmptyDays=true`;

  if (!parsed.success) {
    redirect(`${redirectPath}&guestError=validation`);
  }

  try {
    await createPublicPassengerRegistration({
      input: parsed.data,
      supabase:
        createSupabaseServiceRoleClient() as unknown as PublicItinerarySupabaseClient,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo registrar";
    redirect(
      `${redirectPath}&guestError=${encodeURIComponent(message.slice(0, 160))}`,
    );
  }

  redirect(`${redirectPath}&guestPassenger=created`);
}
