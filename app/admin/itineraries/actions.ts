"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  changeItineraryStatusWithFlutterParity,
  createItineraryWithFlutterParity,
  deletePassengerWithFlutterParity,
  deleteTransactionWithFlutterParity,
  deleteItineraryItemWithFlutterParity,
  type AdminNextItineraryWriteSupabaseClient,
  updateItineraryConfirmationDateWithFlutterParity,
  updateItineraryHeaderWithFlutterParity,
  updateItineraryItemsReservationStatusWithFlutterParity,
  upsertPassengerWithFlutterParity,
  upsertTransactionWithFlutterParity,
} from "@/lib/admin-next/itinerary-write-adapter";
import { canCorrectItineraryConfirmationDateRole } from "@/lib/admin-next/itinerary-permissions";
import { requireAdminNextSession } from "@/lib/admin-next/route-boundary";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const CreateItineraryFormSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    passengerCount: z.coerce.number().int().min(1).max(99),
    adults: z.coerce.number().int().min(0).max(99),
    children: z.coerce.number().int().min(0).max(99),
    currencyType: z.enum(["COP", "USD", "EUR"]),
    language: z.enum(["es", "en"]),
    requestType: z.enum(["Cotizacion", "Operacion", "Package Kit"]),
    contactId: z.preprocess(
      (value) => (value === null ? "" : value),
      z.string().uuid().or(z.literal("")),
    ),
    personalizedMessage: z.preprocess(
      (value) => (value === null ? "" : value),
      z.string().trim().max(500),
    ),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "La fecha final debe ser posterior a la inicial",
      });
    }

    if (value.adults + value.children !== value.passengerCount) {
      ctx.addIssue({
        code: "custom",
        path: ["passengerCount"],
        message: "El total debe coincidir con adultos + menores",
      });
    }
  });

const UpdateItineraryHeaderFormSchema = CreateItineraryFormSchema.and(
  z.object({
    itineraryId: z.string().uuid(),
    agentId: z.preprocess(
      (value) => (value === null ? "" : value),
      z.string().uuid().or(z.literal("")),
    ),
    mainImage: z.preprocess(
      (value) => (value === null ? "" : value),
      z.string().trim().max(2000),
    ),
    status: z.string().trim().max(80).optional(),
  }),
);

const ChangeItineraryStatusFormSchema = z.object({
  itineraryId: z.string().uuid(),
  target: z.enum(["budget", "confirmed"]),
});

const UpdateItineraryConfirmationDateFormSchema = z.object({
  itineraryId: z.string().uuid(),
  confirmationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(8).max(300),
});

const UpdateItineraryItemReservationFormSchema = z.object({
  itineraryId: z.string().uuid(),
  itemId: z.string().uuid(),
  reservationStatus: z
    .enum(["true", "false"])
    .transform((value) => value === "true"),
});

const DeleteItineraryItemFormSchema = z.object({
  itineraryId: z.string().uuid(),
  itemId: z.string().uuid(),
});

const UpsertPassengerFormSchema = z.object({
  itineraryId: z.string().uuid(),
  passengerId: z.preprocess(
    (value) => (value === null ? "" : value),
    z.string().trim().min(1).max(80).or(z.literal("")),
  ),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80),
  documentType: z.string().trim().max(40),
  documentNumber: z.string().trim().max(60),
  nationality: z.string().trim().max(80),
  birthDate: z.preprocess(
    (value) => (value === null ? "" : value),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .or(z.literal("")),
  ),
  email: z.preprocess(
    (value) => (value === null ? "" : value),
    z.string().trim().email().or(z.literal("")),
  ),
  phoneNumber: z.string().trim().max(40),
  gender: z.string().trim().max(40),
  isMainPassenger: z
    .enum(["true", "false", "on"])
    .optional()
    .transform((value) => value === "true" || value === "on"),
});

const DeletePassengerFormSchema = z.object({
  itineraryId: z.string().uuid(),
  passengerId: z.string().trim().min(1).max(80),
});

const UpsertTransactionFormSchema = z.object({
  itineraryId: z.string().uuid(),
  transactionId: z.preprocess(
    (value) => (value === null ? "" : value),
    z.string().trim().min(1).max(80).or(z.literal("")),
  ),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: z.coerce.number().positive().max(999_999_999_999),
  paymentMethod: z.string().trim().min(2).max(120),
  type: z.enum(["ingreso", "egreso"]),
  reference: z.string().trim().max(120),
  voucherUrl: z.preprocess(
    (value) => (value === null ? "" : value),
    z.string().trim().url().or(z.literal("")),
  ),
  originalCurrency: z.enum(["COP", "USD", "EUR"]),
  originalAmount: z.coerce.number().positive().max(999_999_999_999).optional(),
  exchangeRate: z.coerce.number().positive().max(1_000_000).default(1),
  conversionDate: z.preprocess(
    (value) => (value === null ? "" : value),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .or(z.literal("")),
  ),
  feeAmount: z.coerce.number().min(0).max(999_999_999_999).default(0),
  totalPaid: z.coerce.number().positive().max(999_999_999_999).optional(),
  isFinalPayment: z
    .enum(["true", "false", "on"])
    .optional()
    .transform((value) => value === "true" || value === "on"),
});

const DeleteTransactionFormSchema = z.object({
  itineraryId: z.string().uuid(),
  transactionId: z.string().trim().min(1).max(80),
});

const GenerateItineraryPdfFormSchema = z.object({
  itineraryId: z.string().uuid(),
  kind: z.enum(["proposal", "account_statement"]),
  hideEmptyDays: z
    .enum(["true", "false", "on"])
    .optional()
    .transform((value) => value !== "false"),
  lang: z.enum(["es", "en"]).optional(),
});

type SupabaseFunctionsInvokeResponse = {
  data: unknown;
  error: { message?: string } | null;
  status?: number;
};

type AdminNextItineraryPdfSupabaseClient = {
  functions: {
    invoke(
      functionName:
        | "create-itinerary-proposal-pdf"
        | "create-account-statement-pdf",
      options: { body: Record<string, unknown> },
    ): Promise<SupabaseFunctionsInvokeResponse>;
  };
};

export type CreateAdminNextItineraryActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function createAdminNextItineraryAction(
  _previousState: CreateAdminNextItineraryActionState,
  formData: FormData,
): Promise<CreateAdminNextItineraryActionState> {
  const session = await requireAdminNextSession({
    nextPath: "/admin/itineraries",
    permission: "planner.approve",
  });

  if (!session.flags.adminNextItineraryWrites) {
    return {
      status: "error",
      message:
        "La creación de itinerarios en Next está cerrada para esta cuenta.",
    };
  }

  const parsed = CreateItineraryFormSchema.safeParse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    passengerCount: formData.get("passengerCount"),
    adults: formData.get("adults"),
    children: formData.get("children"),
    currencyType: formData.get("currencyType"),
    language: formData.get("language"),
    requestType: formData.get("requestType"),
    contactId: formData.get("contactId"),
    personalizedMessage: formData.get("personalizedMessage"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados antes de crear el itinerario.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let itineraryId: string;

  try {
    const supabase =
      (await createSupabaseServerClient()) as unknown as AdminNextItineraryWriteSupabaseClient;

    itineraryId = await createItineraryWithFlutterParity({
      supabase,
      input: {
        ...parsed.data,
        accountId: session.accountId,
        creatorId: session.userId,
        contactId: parsed.data.contactId || null,
        personalizedMessage: parsed.data.personalizedMessage || "",
      },
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo crear el itinerario.",
    };
  }

  revalidatePath("/admin/itineraries");
  redirect(`/admin/itineraries/${itineraryId}`);
}

export type UpdateAdminNextItineraryHeaderActionState =
  CreateAdminNextItineraryActionState;

export async function updateAdminNextItineraryHeaderAction(
  _previousState: UpdateAdminNextItineraryHeaderActionState,
  formData: FormData,
): Promise<UpdateAdminNextItineraryHeaderActionState> {
  const itineraryId = formData.get("itineraryId")?.toString() ?? "";
  const session = await requireAdminNextSession({
    nextPath: itineraryId
      ? `/admin/itineraries/${itineraryId}`
      : "/admin/itineraries",
    permission: "planner.approve",
  });

  if (!session.flags.adminNextItineraryWrites) {
    return {
      status: "error",
      message:
        "La edición de itinerarios en Next está cerrada para esta cuenta.",
    };
  }

  const parsed = UpdateItineraryHeaderFormSchema.safeParse({
    itineraryId,
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    passengerCount: formData.get("passengerCount"),
    adults: formData.get("adults"),
    children: formData.get("children"),
    currencyType: formData.get("currencyType"),
    language: formData.get("language"),
    requestType: formData.get("requestType"),
    contactId: formData.get("contactId"),
    personalizedMessage: formData.get("personalizedMessage"),
    agentId: formData.get("agentId"),
    mainImage: formData.get("mainImage"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados antes de guardar la cabecera.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase =
      (await createSupabaseServerClient()) as unknown as AdminNextItineraryWriteSupabaseClient;

    await updateItineraryHeaderWithFlutterParity({
      supabase,
      input: {
        itineraryId: parsed.data.itineraryId,
        name: parsed.data.name,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        passengerCount: parsed.data.passengerCount,
        adults: parsed.data.adults,
        children: parsed.data.children,
        currencyType: parsed.data.currencyType,
        language: parsed.data.language,
        requestType: parsed.data.requestType,
        personalizedMessage: parsed.data.personalizedMessage || "",
        contactId: parsed.data.contactId || null,
        agentId: parsed.data.agentId || null,
        mainImage: parsed.data.mainImage || "",
        status: parsed.data.status || null,
      },
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el itinerario.",
    };
  }

  revalidatePath("/admin/itineraries");
  revalidatePath(`/admin/itineraries/${parsed.data.itineraryId}`);
  redirect(`/admin/itineraries/${parsed.data.itineraryId}`);
}

export async function changeAdminNextItineraryStatusAction(
  formData: FormData,
): Promise<void> {
  const itineraryId = formData.get("itineraryId")?.toString() ?? "";
  const session = await requireAdminNextSession({
    nextPath: itineraryId
      ? `/admin/itineraries/${itineraryId}`
      : "/admin/itineraries",
    permission: "planner.approve",
  });

  if (!session.flags.adminNextItineraryWrites) {
    throw new Error(
      "El cambio de estado de itinerarios en Next está cerrado para esta cuenta.",
    );
  }

  const parsed = ChangeItineraryStatusFormSchema.parse({
    itineraryId,
    target: formData.get("target"),
  });

  const isConfirmed = parsed.target === "confirmed";

  const supabase =
    (await createSupabaseServerClient()) as unknown as AdminNextItineraryWriteSupabaseClient;

  await changeItineraryStatusWithFlutterParity({
    supabase,
    input: {
      itineraryId: parsed.itineraryId,
      isConfirmed,
      source: "admin_next_detail",
      metadata: {
        surface: "admin_next_itinerary_detail",
        action: isConfirmed ? "confirm" : "reopen_to_budget",
        actor_user_id: session.userId,
      },
    },
  });

  revalidatePath("/admin/itineraries");
  revalidatePath(`/admin/itineraries/${parsed.itineraryId}`);
  redirect(`/admin/itineraries/${parsed.itineraryId}`);
}

export async function updateAdminNextItineraryConfirmationDateAction(
  formData: FormData,
): Promise<void> {
  const itineraryId = formData.get("itineraryId")?.toString() ?? "";
  const session = await requireAdminNextSession({
    nextPath: itineraryId
      ? `/admin/itineraries/${itineraryId}`
      : "/admin/itineraries",
    permission: "planner.approve",
  });

  if (!session.flags.adminNextItineraryWrites) {
    throw new Error(
      "La corrección de fecha de confirmación en Next está cerrada para esta cuenta.",
    );
  }

  if (!canCorrectItineraryConfirmationDateRole(session.role)) {
    throw new Error(
      "La corrección de fecha de confirmación requiere rol admin o super_admin.",
    );
  }

  const parsed = UpdateItineraryConfirmationDateFormSchema.parse({
    itineraryId,
    confirmationDate: formData.get("confirmationDate"),
    reason: formData.get("reason"),
  });

  const supabase =
    (await createSupabaseServerClient()) as unknown as AdminNextItineraryWriteSupabaseClient;

  await updateItineraryConfirmationDateWithFlutterParity({
    supabase,
    input: {
      itineraryId: parsed.itineraryId,
      confirmationDate: parsed.confirmationDate,
      reason: parsed.reason,
    },
  });

  revalidatePath("/admin/itineraries");
  revalidatePath(`/admin/itineraries/${parsed.itineraryId}`);
  redirect(`/admin/itineraries/${parsed.itineraryId}`);
}

export async function updateAdminNextItineraryItemReservationAction(
  formData: FormData,
): Promise<void> {
  const itineraryId = formData.get("itineraryId")?.toString() ?? "";
  const returnTab = formData.get("returnTab")?.toString() ?? "";
  const nextPath =
    itineraryId && returnTab === "suppliers"
      ? `/admin/itineraries/${itineraryId}?tab=suppliers`
      : itineraryId
        ? `/admin/itineraries/${itineraryId}`
        : "/admin/itineraries";
  const session = await requireAdminNextSession({
    nextPath,
    permission: "planner.approve",
  });

  if (!session.flags.adminNextItineraryWrites) {
    throw new Error(
      "La confirmación de reservas en Next está cerrada para esta cuenta.",
    );
  }

  const parsed = UpdateItineraryItemReservationFormSchema.parse({
    itineraryId,
    itemId: formData.get("itemId"),
    reservationStatus: formData.get("reservationStatus"),
  });

  const supabase =
    (await createSupabaseServerClient()) as unknown as AdminNextItineraryWriteSupabaseClient;

  await updateItineraryItemsReservationStatusWithFlutterParity({
    supabase,
    input: {
      accountId: session.accountId,
      itineraryId: parsed.itineraryId,
      itemIds: [parsed.itemId],
      reservationStatus: parsed.reservationStatus,
    },
  });

  revalidatePath("/admin/itineraries");
  revalidatePath(`/admin/itineraries/${parsed.itineraryId}`);
  redirect(
    returnTab === "suppliers"
      ? `/admin/itineraries/${parsed.itineraryId}?tab=suppliers`
      : `/admin/itineraries/${parsed.itineraryId}`,
  );
}

export async function deleteAdminNextItineraryItemAction(
  formData: FormData,
): Promise<void> {
  const itineraryId = formData.get("itineraryId")?.toString() ?? "";
  const session = await requireAdminNextSession({
    nextPath: itineraryId
      ? `/admin/itineraries/${itineraryId}`
      : "/admin/itineraries",
    permission: "planner.approve",
  });

  if (!session.flags.adminNextItineraryWrites) {
    throw new Error(
      "La eliminación de servicios en Next está cerrada para esta cuenta.",
    );
  }

  const parsed = DeleteItineraryItemFormSchema.parse({
    itineraryId,
    itemId: formData.get("itemId"),
  });

  const supabase =
    (await createSupabaseServerClient()) as unknown as AdminNextItineraryWriteSupabaseClient;

  await deleteItineraryItemWithFlutterParity({
    supabase,
    input: {
      accountId: session.accountId,
      itineraryId: parsed.itineraryId,
      itemId: parsed.itemId,
    },
  });

  revalidatePath("/admin/itineraries");
  revalidatePath(`/admin/itineraries/${parsed.itineraryId}`);
  redirect(`/admin/itineraries/${parsed.itineraryId}`);
}

export async function upsertAdminNextPassengerAction(
  formData: FormData,
): Promise<void> {
  const itineraryId = formData.get("itineraryId")?.toString() ?? "";
  const session = await requireAdminNextSession({
    nextPath: itineraryId
      ? `/admin/itineraries/${itineraryId}?tab=passengers`
      : "/admin/itineraries",
    permission: "planner.approve",
  });

  if (!session.flags.adminNextItineraryWrites) {
    throw new Error(
      "La edición de pasajeros en Next está cerrada para esta cuenta.",
    );
  }

  const parsed = UpsertPassengerFormSchema.parse({
    itineraryId,
    passengerId: formData.get("passengerId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    documentType: formData.get("documentType"),
    documentNumber: formData.get("documentNumber"),
    nationality: formData.get("nationality"),
    birthDate: formData.get("birthDate"),
    email: formData.get("email"),
    phoneNumber: formData.get("phoneNumber"),
    gender: formData.get("gender"),
    isMainPassenger: formData.get("isMainPassenger") ?? "false",
  });

  const supabase =
    (await createSupabaseServerClient()) as unknown as AdminNextItineraryWriteSupabaseClient;

  await upsertPassengerWithFlutterParity({
    supabase,
    input: {
      accountId: session.accountId,
      itineraryId: parsed.itineraryId,
      passengerId: parsed.passengerId || null,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      documentType: parsed.documentType,
      documentNumber: parsed.documentNumber,
      nationality: parsed.nationality,
      birthDate: parsed.birthDate || null,
      email: parsed.email,
      phoneNumber: parsed.phoneNumber,
      gender: parsed.gender,
      isMainPassenger: parsed.isMainPassenger,
    },
  });

  revalidatePath("/admin/itineraries");
  revalidatePath(`/admin/itineraries/${parsed.itineraryId}`);
  redirect(`/admin/itineraries/${parsed.itineraryId}?tab=passengers`);
}

export async function deleteAdminNextPassengerAction(
  formData: FormData,
): Promise<void> {
  const itineraryId = formData.get("itineraryId")?.toString() ?? "";
  const session = await requireAdminNextSession({
    nextPath: itineraryId
      ? `/admin/itineraries/${itineraryId}?tab=passengers`
      : "/admin/itineraries",
    permission: "planner.approve",
  });

  if (!session.flags.adminNextItineraryWrites) {
    throw new Error(
      "La eliminación de pasajeros en Next está cerrada para esta cuenta.",
    );
  }

  const parsed = DeletePassengerFormSchema.parse({
    itineraryId,
    passengerId: formData.get("passengerId"),
  });

  const supabase =
    (await createSupabaseServerClient()) as unknown as AdminNextItineraryWriteSupabaseClient;

  await deletePassengerWithFlutterParity({
    supabase,
    input: {
      accountId: session.accountId,
      itineraryId: parsed.itineraryId,
      passengerId: parsed.passengerId,
    },
  });

  revalidatePath("/admin/itineraries");
  revalidatePath(`/admin/itineraries/${parsed.itineraryId}`);
  redirect(`/admin/itineraries/${parsed.itineraryId}?tab=passengers`);
}

export async function generateAdminNextItineraryPdfAction(
  formData: FormData,
): Promise<void> {
  const itineraryId = formData.get("itineraryId")?.toString() ?? "";
  const session = await requireAdminNextSession({
    nextPath: itineraryId
      ? `/admin/itineraries/${itineraryId}?tab=preview`
      : "/admin/itineraries",
    permission: "planner.view",
  });

  const parsed = GenerateItineraryPdfFormSchema.parse({
    itineraryId,
    kind: formData.get("kind"),
    hideEmptyDays: formData.get("hideEmptyDays") ?? "true",
    lang: formData.get("lang") || undefined,
  });

  const functionName =
    parsed.kind === "proposal"
      ? "create-itinerary-proposal-pdf"
      : "create-account-statement-pdf";
  const body: Record<string, unknown> = {
    itineraryId: parsed.itineraryId,
    hideEmptyDays: parsed.hideEmptyDays,
  };
  if (parsed.lang) body.lang = parsed.lang;

  let pdfUrl = "";

  try {
    const supabase =
      (await createSupabaseServerClient()) as unknown as AdminNextItineraryPdfSupabaseClient;
    const response = await supabase.functions.invoke(functionName, { body });

    if (response.error) {
      throw new Error(response.error.message ?? "Error generando PDF");
    }

    pdfUrl = extractPdfUrl(response.data);
    if (!pdfUrl) {
      throw new Error("La funcion no retorno una URL de PDF.");
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo generar el PDF.";
    redirect(
      buildPreviewPdfRedirect(parsed.itineraryId, {
        error: message,
        kind: parsed.kind,
      }),
    );
  }

  revalidatePath(`/admin/itineraries/${parsed.itineraryId}`);
  redirect(
    buildPreviewPdfRedirect(parsed.itineraryId, {
      kind: parsed.kind,
      pdfUrl,
    }),
  );
}

export async function upsertAdminNextTransactionAction(
  formData: FormData,
): Promise<void> {
  const itineraryId = formData.get("itineraryId")?.toString() ?? "";
  const session = await requireAdminNextSession({
    nextPath: itineraryId
      ? `/admin/itineraries/${itineraryId}?tab=payments`
      : "/admin/itineraries",
    permission: "payments.manage",
  });

  if (!session.flags.adminNextItineraryWrites) {
    throw new Error(
      "El registro de pagos en Next está cerrado para esta cuenta.",
    );
  }

  const parsed = UpsertTransactionFormSchema.parse({
    itineraryId,
    transactionId: formData.get("transactionId"),
    date: formData.get("date"),
    value: formData.get("value"),
    paymentMethod: formData.get("paymentMethod"),
    type: formData.get("type"),
    reference: formData.get("reference"),
    voucherUrl: formData.get("voucherUrl"),
    originalCurrency: formData.get("originalCurrency") || "COP",
    originalAmount: formData.get("originalAmount") || formData.get("value"),
    exchangeRate: formData.get("exchangeRate") || "1",
    conversionDate: formData.get("conversionDate") || formData.get("date"),
    feeAmount: formData.get("feeAmount") || "0",
    totalPaid: formData.get("totalPaid") || formData.get("value"),
    isFinalPayment: formData.get("isFinalPayment") ?? "false",
  });

  const supabase =
    (await createSupabaseServerClient()) as unknown as AdminNextItineraryWriteSupabaseClient;

  await upsertTransactionWithFlutterParity({
    supabase,
    input: {
      accountId: session.accountId,
      itineraryId: parsed.itineraryId,
      transactionId: parsed.transactionId || null,
      date: parsed.date,
      value: parsed.value,
      paymentMethod: parsed.paymentMethod,
      type: parsed.type,
      reference: parsed.reference,
      voucherUrl: parsed.voucherUrl || null,
      originalCurrency: parsed.originalCurrency,
      originalAmount: parsed.originalAmount ?? parsed.value,
      exchangeRate: parsed.exchangeRate,
      conversionDate: parsed.conversionDate || parsed.date,
      feeAmount: parsed.feeAmount,
      totalPaid: parsed.totalPaid ?? parsed.value,
      isFinalPayment: parsed.isFinalPayment,
    },
  });

  revalidatePath("/admin/itineraries");
  revalidatePath(`/admin/itineraries/${parsed.itineraryId}`);
  redirect(`/admin/itineraries/${parsed.itineraryId}?tab=payments`);
}

function extractPdfUrl(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;
  const value = record.publicUrl ?? record.url ?? record.pdf_url;
  return typeof value === "string" ? value : "";
}

function buildPreviewPdfRedirect(
  itineraryId: string,
  params: {
    error?: string;
    kind: "proposal" | "account_statement";
    pdfUrl?: string;
  },
): string {
  const searchParams = new URLSearchParams({ tab: "preview" });
  searchParams.set("pdfKind", params.kind);
  if (params.pdfUrl) searchParams.set("pdfUrl", params.pdfUrl);
  if (params.error) searchParams.set("pdfError", params.error);
  return `/admin/itineraries/${itineraryId}?${searchParams.toString()}`;
}

export async function deleteAdminNextTransactionAction(
  formData: FormData,
): Promise<void> {
  const itineraryId = formData.get("itineraryId")?.toString() ?? "";
  const session = await requireAdminNextSession({
    nextPath: itineraryId
      ? `/admin/itineraries/${itineraryId}?tab=payments`
      : "/admin/itineraries",
    permission: "payments.manage",
  });

  if (!session.flags.adminNextItineraryWrites) {
    throw new Error(
      "La eliminación de pagos en Next está cerrada para esta cuenta.",
    );
  }

  const parsed = DeleteTransactionFormSchema.parse({
    itineraryId,
    transactionId: formData.get("transactionId"),
  });

  const supabase =
    (await createSupabaseServerClient()) as unknown as AdminNextItineraryWriteSupabaseClient;

  await deleteTransactionWithFlutterParity({
    supabase,
    input: {
      accountId: session.accountId,
      itineraryId: parsed.itineraryId,
      transactionId: parsed.transactionId,
    },
  });

  revalidatePath("/admin/itineraries");
  revalidatePath(`/admin/itineraries/${parsed.itineraryId}`);
  redirect(`/admin/itineraries/${parsed.itineraryId}?tab=payments`);
}
