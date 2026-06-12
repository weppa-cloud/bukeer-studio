"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  createAdminNextItineraryAction,
  type CreateAdminNextItineraryActionState,
} from "@/app/admin/itineraries/actions";
import { EvoIcon } from "./icons";

const initialState: CreateAdminNextItineraryActionState = { status: "idle" };

export function EvoNewItineraryModal({
  closeHref,
  defaultEndDate,
  defaultStartDate,
  writesEnabled,
}: {
  closeHref: string;
  defaultEndDate: string;
  defaultStartDate: string;
  writesEnabled: boolean;
}) {
  const [state, formAction] = useActionState(
    createAdminNextItineraryAction,
    initialState,
  );

  return (
    <div className="modal-veil" data-testid="admin-next-itinerary-create-modal">
      <form action={formAction} className="modal w720">
        <div className="modal-head">
          <div className="t">
            <h3>Nuevo itinerario</h3>
            <div className="sub">Cabecera inicial · RPC Flutter parity</div>
          </div>
          <Link
            aria-label="Cerrar"
            className="x"
            data-testid="admin-next-itinerary-create-cancel"
            href={closeHref}
          >
            <EvoIcon name="x" size={16} />
          </Link>
        </div>

        <div className="modal-body">
          {state.status === "error" ? (
            <div
              className="inline-alert"
              data-testid="admin-next-itinerary-create-error"
            >
              {state.message}
            </div>
          ) : null}

          {!writesEnabled ? (
            <div
              className="inline-alert"
              data-testid="admin-next-itinerary-write-disabled"
            >
              La creación en Next requiere flag de writes, cuenta beta y rol
              autorizado.
            </div>
          ) : null}

          <div className="fgroup">
            <label className="flabel" htmlFor="itinerary-name">
              Nombre
            </label>
            <input
              className="finput"
              data-testid="admin-next-itinerary-create-name"
              defaultValue="Viaje demo"
              id="itinerary-name"
              maxLength={120}
              minLength={3}
              name="name"
              required
            />
            <FieldError errors={state.fieldErrors?.name} />
          </div>

          <div className="fgrid2">
            <div className="fgroup">
              <label className="flabel" htmlFor="itinerary-start-date">
                Fecha inicial
              </label>
              <input
                className="finput"
                data-testid="admin-next-itinerary-create-start"
                defaultValue={defaultStartDate}
                id="itinerary-start-date"
                name="startDate"
                required
                type="date"
              />
              <FieldError errors={state.fieldErrors?.startDate} />
            </div>
            <div className="fgroup">
              <label className="flabel" htmlFor="itinerary-end-date">
                Fecha final
              </label>
              <input
                className="finput"
                data-testid="admin-next-itinerary-create-end"
                defaultValue={defaultEndDate}
                id="itinerary-end-date"
                name="endDate"
                required
                type="date"
              />
              <FieldError errors={state.fieldErrors?.endDate} />
            </div>
          </div>

          <div className="fgrid2">
            <div className="fgroup">
              <label className="flabel" htmlFor="itinerary-adults">
                Adultos
              </label>
              <input
                className="finput"
                data-testid="admin-next-itinerary-create-adults"
                defaultValue="2"
                id="itinerary-adults"
                min={0}
                name="adults"
                required
                type="number"
              />
              <FieldError errors={state.fieldErrors?.adults} />
            </div>
            <div className="fgroup">
              <label className="flabel" htmlFor="itinerary-children">
                Menores
              </label>
              <input
                className="finput"
                data-testid="admin-next-itinerary-create-children"
                defaultValue="0"
                id="itinerary-children"
                min={0}
                name="children"
                required
                type="number"
              />
              <FieldError errors={state.fieldErrors?.children} />
            </div>
          </div>

          <div className="fgroup">
            <label className="flabel" htmlFor="itinerary-passenger-count">
              Total viajeros
            </label>
            <input
              className="finput"
              data-testid="admin-next-itinerary-create-pax"
              defaultValue="2"
              id="itinerary-passenger-count"
              min={1}
              name="passengerCount"
              required
              type="number"
            />
            <FieldError errors={state.fieldErrors?.passengerCount} />
          </div>

          <div className="fgrid2">
            <div className="fgroup">
              <label className="flabel" htmlFor="itinerary-currency">
                Moneda
              </label>
              <select
                className="finput"
                data-testid="admin-next-itinerary-create-currency"
                defaultValue="COP"
                id="itinerary-currency"
                name="currencyType"
              >
                <option value="COP">COP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
              <FieldError errors={state.fieldErrors?.currencyType} />
            </div>
            <div className="fgroup">
              <label className="flabel" htmlFor="itinerary-language">
                Idioma
              </label>
              <select
                className="finput"
                data-testid="admin-next-itinerary-create-language"
                defaultValue="es"
                id="itinerary-language"
                name="language"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
              <FieldError errors={state.fieldErrors?.language} />
            </div>
          </div>

          <div className="fgrid2">
            <div className="fgroup">
              <label className="flabel" htmlFor="itinerary-request-type">
                Tipo
              </label>
              <select
                className="finput"
                data-testid="admin-next-itinerary-create-request-type"
                defaultValue="Cotizacion"
                id="itinerary-request-type"
                name="requestType"
              >
                <option value="Cotizacion">Cotización</option>
                <option value="Operacion">Operación</option>
                <option value="Package Kit">Package Kit</option>
              </select>
              <FieldError errors={state.fieldErrors?.requestType} />
            </div>
            <div className="fgroup">
              <label className="flabel" htmlFor="itinerary-contact-id">
                Contacto
              </label>
              <input
                className="finput"
                data-testid="admin-next-itinerary-create-contact"
                id="itinerary-contact-id"
                name="contactId"
                placeholder="UUID opcional"
              />
              <FieldError errors={state.fieldErrors?.contactId} />
            </div>
          </div>

          <div className="fgroup">
            <label className="flabel" htmlFor="itinerary-message">
              Mensaje personalizado
            </label>
            <textarea
              className="finput"
              data-testid="admin-next-itinerary-create-message"
              id="itinerary-message"
              maxLength={500}
              name="personalizedMessage"
              rows={3}
            />
            <FieldError errors={state.fieldErrors?.personalizedMessage} />
          </div>
        </div>

        <div className="modal-foot">
          <span className="note">
            Crea en Supabase con function_create_itinerary.
          </span>
          <Link className="btn outline" href={closeHref}>
            Cancelar
          </Link>
          <SubmitButton disabled={!writesEnabled} />
        </div>
      </form>
    </div>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn primary"
      data-testid="admin-next-itinerary-create-submit"
      disabled={disabled || pending}
      type="submit"
    >
      <EvoIcon name="plus" size={15} />
      {pending ? "Creando..." : "Crear"}
    </button>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;

  return <div className="field-error">{errors[0]}</div>;
}
