type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

type SupabaseRpcResult = {
  data: unknown;
  error: SupabaseErrorLike | null;
};

type SupabaseUpdateResult = {
  error: SupabaseErrorLike | null;
};

type SupabaseInsertResult = {
  data?: unknown;
  error: SupabaseErrorLike | null;
};

type SupabaseUpdateFilter = {
  eq(column: string, value: string): SupabaseUpdateFilter;
  in(column: string, values: string[]): SupabaseUpdateFilter;
  then(
    resolve: (value: SupabaseUpdateResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ): Promise<unknown>;
};

export type AdminNextItineraryWriteSupabaseClient = {
  rpc(
    functionName:
      | "delete_transaction"
      | "function_create_itinerary"
      | "function_update_itinerary_confirmation_date"
      | "function_update_itinerary_items_status"
      | "function_update_itinerary_status_with_history",
    args: Record<string, unknown>,
  ): Promise<SupabaseRpcResult>;
  from(
    table: "itineraries" | "itinerary_items" | "passenger" | "transactions",
  ): {
    delete(): SupabaseUpdateFilter;
    insert(values: Record<string, unknown>): PromiseLike<SupabaseInsertResult>;
    update(values: Record<string, unknown>): SupabaseUpdateFilter;
  };
};

export type CreateAdminNextItineraryInput = {
  name: string;
  startDate: string;
  endDate: string;
  passengerCount: number;
  adults: number;
  children: number;
  currencyType: string;
  language: string;
  requestType: string;
  personalizedMessage?: string;
  contactId?: string | null;
  accountId: string;
  creatorId: string;
};

export type UpdateAdminNextItineraryHeaderInput = {
  itineraryId: string;
  name: string;
  startDate: string;
  endDate: string;
  passengerCount: number;
  adults: number;
  children: number;
  currencyType: string;
  language: string;
  requestType: string;
  personalizedMessage?: string;
  contactId?: string | null;
  agentId?: string | null;
  status?: string | null;
  mainImage?: string | null;
  validUntil?: string | null;
};

export type ChangeAdminNextItineraryStatusInput = {
  itineraryId: string;
  isConfirmed: boolean;
  source: string;
  metadata: Record<string, unknown>;
};

export type UpdateAdminNextItineraryConfirmationDateInput = {
  itineraryId: string;
  confirmationDate: string;
  reason: string;
};

export type UpdateAdminNextItineraryItemReservationInput = {
  accountId: string;
  itineraryId: string;
  itemIds: string[];
  reservationStatus: boolean;
};

export type DeleteAdminNextItineraryItemInput = {
  accountId: string;
  itineraryId: string;
  itemId: string;
};

export type UpsertAdminNextPassengerInput = {
  accountId: string;
  itineraryId: string;
  passengerId?: string | null;
  firstName: string;
  lastName: string;
  documentType?: string;
  documentNumber?: string;
  nationality?: string;
  birthDate?: string | null;
  email?: string;
  phoneNumber?: string;
  gender?: string;
  isMainPassenger: boolean;
};

export type DeleteAdminNextPassengerInput = {
  accountId: string;
  itineraryId: string;
  passengerId: string;
};

export type UpsertAdminNextTransactionInput = {
  accountId: string;
  itineraryId: string;
  transactionId?: string | null;
  date: string;
  value: number;
  paymentMethod: string;
  type: "ingreso" | "egreso";
  reference?: string;
  voucherUrl?: string | null;
  originalCurrency?: string;
  originalAmount?: number | null;
  exchangeRate?: number;
  conversionDate?: string;
  roundingAdjustment?: number;
  feeAmount?: number;
  totalPaid?: number | null;
  idItemItinerary?: string | null;
  scheduledPaymentId?: string | null;
  isFinalPayment?: boolean;
};

export type DeleteAdminNextTransactionInput = {
  accountId: string;
  itineraryId: string;
  transactionId: string;
};

export async function createItineraryWithFlutterParity({
  input,
  supabase,
}: {
  input: CreateAdminNextItineraryInput;
  supabase: AdminNextItineraryWriteSupabaseClient;
}): Promise<string> {
  const { data, error } = await supabase.rpc("function_create_itinerary", {
    name: input.name,
    itinerary_start_date: input.startDate,
    itinerary_passenger_count: input.passengerCount,
    itinerary_end_date: input.endDate,
    itinerary_currency_type: input.currencyType,
    itinerary_valid_until: null,
    itinerary_agent: input.creatorId,
    contact_id: input.contactId || null,
    itinerary_language: input.language,
    creator_id: input.creatorId,
    itinerary_request_type: input.requestType,
    itinerary_id_fm: null,
    account_id: input.accountId,
    input_currency: null,
    itinerary_status: "Presupuesto",
    input_types_increase: null,
    itinerary_personalized_message: input.personalizedMessage ?? "",
    itinerary_main_image: "",
  });

  if (error) {
    throw new Error(error.message || "No se pudo crear el itinerario");
  }

  const itineraryId = extractCreatedItineraryId(data);

  if (!itineraryId) {
    throw new Error("El backend creó el itinerario pero no retornó un ID");
  }

  const updateResult = await supabase
    .from("itineraries")
    .update({
      adults: input.adults,
      children: input.children,
    })
    .eq("id", itineraryId);

  if (updateResult.error) {
    throw new Error(
      updateResult.error.message ||
        "El itinerario se creó, pero no se pudo guardar el desglose de pasajeros",
    );
  }

  return itineraryId;
}

export async function updateItineraryHeaderWithFlutterParity({
  input,
  supabase,
}: {
  input: UpdateAdminNextItineraryHeaderInput;
  supabase: AdminNextItineraryWriteSupabaseClient;
}): Promise<void> {
  const headerPayload: Record<string, unknown> = {
    name: input.name,
    start_date: input.startDate,
    passenger_count: input.passengerCount,
    end_date: input.endDate,
    currency_type: input.currencyType,
    valid_until: input.validUntil ?? null,
    agent: input.agentId || null,
    id_contact: input.contactId || null,
    language: input.language,
    request_type: input.requestType,
    personalized_message: input.personalizedMessage ?? "",
    main_image: input.mainImage ?? "",
  };

  if (input.status) {
    headerPayload.status = input.status;
  }

  const headerResult = await supabase
    .from("itineraries")
    .update(headerPayload)
    .eq("id", input.itineraryId);

  if (headerResult.error) {
    throw new Error(
      headerResult.error.message || "No se pudo actualizar el itinerario",
    );
  }

  const passengerResult = await supabase
    .from("itineraries")
    .update({
      adults: input.adults,
      children: input.children,
    })
    .eq("id", input.itineraryId);

  if (passengerResult.error) {
    throw new Error(
      passengerResult.error.message ||
        "El itinerario se actualizó, pero no se pudo guardar el desglose de pasajeros",
    );
  }
}

export async function changeItineraryStatusWithFlutterParity({
  input,
  supabase,
}: {
  input: ChangeAdminNextItineraryStatusInput;
  supabase: AdminNextItineraryWriteSupabaseClient;
}): Promise<void> {
  const { data, error } = await supabase.rpc(
    "function_update_itinerary_status_with_history",
    {
      p_itinerary_id: input.itineraryId,
      p_is_confirmed: input.isConfirmed,
      p_source: input.source,
      p_metadata: input.metadata,
    },
  );

  if (error) {
    throw new Error(error.message || "No se pudo cambiar el estado");
  }

  if (data !== true) {
    throw new Error("El backend rechazó el cambio de estado");
  }
}

export async function updateItineraryConfirmationDateWithFlutterParity({
  input,
  supabase,
}: {
  input: UpdateAdminNextItineraryConfirmationDateInput;
  supabase: AdminNextItineraryWriteSupabaseClient;
}): Promise<void> {
  const { data, error } = await supabase.rpc(
    "function_update_itinerary_confirmation_date",
    {
      p_itinerary_id: input.itineraryId,
      p_confirmation_date: input.confirmationDate,
      p_reason: input.reason,
    },
  );

  if (error) {
    throw new Error(
      error.message || "No se pudo corregir la fecha de confirmación",
    );
  }

  if (data !== true) {
    throw new Error("El backend rechazó la corrección de fecha");
  }
}

export async function updateItineraryItemsReservationStatusWithFlutterParity({
  input,
  supabase,
}: {
  input: UpdateAdminNextItineraryItemReservationInput;
  supabase: AdminNextItineraryWriteSupabaseClient;
}): Promise<void> {
  const { data, error } = await supabase.rpc(
    "function_update_itinerary_items_status",
    {
      item_ids: input.itemIds,
      reservation_status: input.reservationStatus,
    },
  );

  if (!error && data !== false) return;

  const missingRpc = error?.code === "PGRST202";

  if (error && !missingRpc) {
    throw new Error(
      error.message || "No se pudo actualizar el estado de reserva",
    );
  }

  const updateResult = (await supabase
    .from("itinerary_items")
    .update({ reservation_status: input.reservationStatus })
    .eq("account_id", input.accountId)
    .eq("id_itinerary", input.itineraryId)
    .in("id", input.itemIds)) as SupabaseUpdateResult;

  if (updateResult.error) {
    throw new Error(
      updateResult.error.message ||
        "No se pudo actualizar el estado de reserva",
    );
  }
}

export async function deleteItineraryItemWithFlutterParity({
  input,
  supabase,
}: {
  input: DeleteAdminNextItineraryItemInput;
  supabase: AdminNextItineraryWriteSupabaseClient;
}): Promise<void> {
  const deleteResult = (await supabase
    .from("itinerary_items")
    .delete()
    .eq("account_id", input.accountId)
    .eq("id_itinerary", input.itineraryId)
    .eq("id", input.itemId)) as SupabaseUpdateResult;

  if (deleteResult.error) {
    throw new Error(
      deleteResult.error.message ||
        "No se pudo eliminar el servicio del itinerario",
    );
  }
}

export async function upsertPassengerWithFlutterParity({
  input,
  supabase,
}: {
  input: UpsertAdminNextPassengerInput;
  supabase: AdminNextItineraryWriteSupabaseClient;
}): Promise<void> {
  const payload = buildPassengerPayload(input);

  if (input.passengerId) {
    const updateResult = (await supabase
      .from("passenger")
      .update(payload)
      .eq("account_id", input.accountId)
      .eq("itinerary_id", input.itineraryId)
      .eq("id", input.passengerId)) as SupabaseUpdateResult;

    if (updateResult.error) {
      throw new Error(
        updateResult.error.message || "No se pudo actualizar el pasajero",
      );
    }

    return;
  }

  const insertResult = await supabase.from("passenger").insert({
    ...payload,
    account_id: input.accountId,
    itinerary_id: input.itineraryId,
  });

  if (insertResult.error) {
    throw new Error(
      insertResult.error.message || "No se pudo agregar el pasajero",
    );
  }
}

export async function deletePassengerWithFlutterParity({
  input,
  supabase,
}: {
  input: DeleteAdminNextPassengerInput;
  supabase: AdminNextItineraryWriteSupabaseClient;
}): Promise<void> {
  const deleteResult = (await supabase
    .from("passenger")
    .delete()
    .eq("account_id", input.accountId)
    .eq("itinerary_id", input.itineraryId)
    .eq("id", input.passengerId)) as SupabaseUpdateResult;

  if (deleteResult.error) {
    throw new Error(
      deleteResult.error.message || "No se pudo eliminar el pasajero",
    );
  }
}

export async function upsertTransactionWithFlutterParity({
  input,
  supabase,
}: {
  input: UpsertAdminNextTransactionInput;
  supabase: AdminNextItineraryWriteSupabaseClient;
}): Promise<void> {
  const payload = buildTransactionPayload(input);

  if (input.transactionId) {
    const updateResult = (await supabase
      .from("transactions")
      .update(payload)
      .eq("account_id", input.accountId)
      .eq("id_itinerary", input.itineraryId)
      .eq("id", input.transactionId)) as SupabaseUpdateResult;

    if (updateResult.error) {
      throw new Error(
        updateResult.error.message || "No se pudo actualizar el pago",
      );
    }

    return;
  }

  const insertResult = await supabase.from("transactions").insert({
    ...payload,
    account_id: input.accountId,
    id_itinerary: input.itineraryId,
  });

  if (insertResult.error) {
    throw new Error(
      insertResult.error.message || "No se pudo registrar el pago",
    );
  }
}

export async function deleteTransactionWithFlutterParity({
  input,
  supabase,
}: {
  input: DeleteAdminNextTransactionInput;
  supabase: AdminNextItineraryWriteSupabaseClient;
}): Promise<void> {
  const transactionIdAsNumber = Number(input.transactionId);
  const { error } = await supabase.rpc("delete_transaction", {
    p_transaction_id: Number.isFinite(transactionIdAsNumber)
      ? transactionIdAsNumber
      : input.transactionId,
    p_account_id: input.accountId,
  });

  if (!error) return;

  const missingRpc = error.code === "PGRST202" || error.code === "42883";
  if (!missingRpc) {
    throw new Error(error.message || "No se pudo eliminar el pago");
  }

  const deleteResult = (await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("account_id", input.accountId)
    .eq("id_itinerary", input.itineraryId)
    .eq("id", input.transactionId)) as SupabaseUpdateResult;

  if (deleteResult.error) {
    throw new Error(
      deleteResult.error.message || "No se pudo eliminar el pago",
    );
  }
}

export function extractCreatedItineraryId(data: unknown): string | null {
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];

    if (isRecord(first)) {
      const itineraryId = first.itinerary_id ?? first.id;
      return typeof itineraryId === "string" && itineraryId.length > 0
        ? itineraryId
        : null;
    }
  }

  if (isRecord(data)) {
    const itineraryId = data.itinerary_id ?? data.id;
    return typeof itineraryId === "string" && itineraryId.length > 0
      ? itineraryId
      : null;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function buildPassengerPayload(
  input: UpsertAdminNextPassengerInput,
): Record<string, unknown> {
  return {
    name: input.firstName,
    last_name: input.lastName,
    type_id: input.documentType ?? "",
    number_id: input.documentNumber ?? "",
    nationality: input.nationality ?? "",
    birth_date: input.birthDate || null,
    email: input.email ?? "",
    phone_number: input.phoneNumber ?? "",
    gender: input.gender ?? "",
    is_main_passenger: input.isMainPassenger,
  };
}

function buildTransactionPayload(
  input: UpsertAdminNextTransactionInput,
): Record<string, unknown> {
  return {
    date: input.date,
    value: input.value,
    payment_method: input.paymentMethod,
    type: input.type,
    voucher_url: input.voucherUrl || null,
    reference: input.reference ?? "",
    original_currency: input.originalCurrency ?? "COP",
    original_amount: input.originalAmount ?? input.value,
    exchange_rate: input.exchangeRate ?? 1,
    conversion_date: input.conversionDate || input.date,
    is_final_payment: input.isFinalPayment ?? false,
    id_item_itinerary: input.idItemItinerary || null,
    rounding_adjustment: input.roundingAdjustment ?? 0,
    fee_amount: input.feeAmount ?? 0,
    total_paid: input.totalPaid ?? input.value,
    scheduled_payment_id: input.scheduledPaymentId || null,
  };
}
