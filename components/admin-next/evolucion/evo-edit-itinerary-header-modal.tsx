"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  updateAdminNextItineraryHeaderAction,
  type UpdateAdminNextItineraryHeaderActionState,
} from "@/app/admin/itineraries/actions";
import type { ItineraryHeaderEditDefaults } from "@/lib/admin-next/itineraries-adapter";
import { EvoIcon } from "./icons";

const initialState: UpdateAdminNextItineraryHeaderActionState = {
  status: "idle",
};

export function EvoEditItineraryHeaderModal({
  closeHref,
  defaults,
  writesEnabled,
}: {
  closeHref: string;
  defaults: ItineraryHeaderEditDefaults;
  writesEnabled: boolean;
}) {
  const [state, formAction] = useActionState(
    updateAdminNextItineraryHeaderAction,
    initialState,
  );

  return (
    <div className="modal-veil" data-testid="admin-next-itinerary-edit-modal">
      <form action={formAction} className="modal w720">
        <input name="itineraryId" type="hidden" value={defaults.itineraryId} />
        <input name="agentId" type="hidden" value={defaults.agentId} />
        <input name="contactId" type="hidden" value={defaults.contactId} />
        <input name="mainImage" type="hidden" value={defaults.mainImage} />
        <input name="status" type="hidden" value={defaults.status} />

        <div className="modal-head">
          <div className="t">
            <h3>Editar cabecera</h3>
            <div className="sub">Nombre, fechas, moneda y pasajeros</div>
          </div>
          <Link
            aria-label="Cerrar"
            className="x"
            data-testid="admin-next-itinerary-edit-cancel"
            href={closeHref}
          >
            <EvoIcon name="x" size={16} />
          </Link>
        </div>

        <div className="modal-body">
          {state.status === "error" ? (
            <div
              className="inline-alert"
              data-testid="admin-next-itinerary-edit-error"
            >
              {state.message}
            </div>
          ) : null}

          {!writesEnabled ? (
            <div
              className="inline-alert"
              data-testid="admin-next-itinerary-edit-disabled"
            >
              La edición en Next requiere flag de writes, cuenta beta y rol
              autorizado.
            </div>
          ) : null}

          <div className="fgroup">
            <label className="flabel" htmlFor="itinerary-edit-name">
              Nombre
            </label>
            <input
              className="finput"
              data-testid="admin-next-itinerary-edit-name"
              defaultValue={defaults.name}
              id="itinerary-edit-name"
              maxLength={120}
              minLength={3}
              name="name"
              required
            />
            <FieldError errors={state.fieldErrors?.name} />
          </div>

          <div className="fgrid2">
            <div className="fgroup">
              <label className="flabel" htmlFor="itinerary-edit-start">
                Fecha inicial
              </label>
              <input
                className="finput"
                data-testid="admin-next-itinerary-edit-start"
                defaultValue={defaults.startDate}
                id="itinerary-edit-start"
                name="startDate"
                required
                type="date"
              />
              <FieldError errors={state.fieldErrors?.startDate} />
            </div>
            <div className="fgroup">
              <label className="flabel" htmlFor="itinerary-edit-end">
                Fecha final
              </label>
              <input
                className="finput"
                data-testid="admin-next-itinerary-edit-end"
                defaultValue={defaults.endDate}
                id="itinerary-edit-end"
                name="endDate"
                required
                type="date"
              />
              <FieldError errors={state.fieldErrors?.endDate} />
            </div>
          </div>

          <div className="fgrid2">
            <div className="fgroup">
              <label className="flabel" htmlFor="itinerary-edit-adults">
                Adultos
              </label>
              <input
                className="finput"
                data-testid="admin-next-itinerary-edit-adults"
                defaultValue={String(defaults.adults)}
                id="itinerary-edit-adults"
                min={0}
                name="adults"
                required
                type="number"
              />
              <FieldError errors={state.fieldErrors?.adults} />
            </div>
            <div className="fgroup">
              <label className="flabel" htmlFor="itinerary-edit-children">
                Menores
              </label>
              <input
                className="finput"
                data-testid="admin-next-itinerary-edit-children"
                defaultValue={String(defaults.children)}
                id="itinerary-edit-children"
                min={0}
                name="children"
                required
                type="number"
              />
              <FieldError errors={state.fieldErrors?.children} />
            </div>
          </div>

          <div className="fgroup">
            <label className="flabel" htmlFor="itinerary-edit-pax">
              Total viajeros
            </label>
            <input
              className="finput"
              data-testid="admin-next-itinerary-edit-pax"
              defaultValue={String(defaults.passengerCount)}
              id="itinerary-edit-pax"
              min={1}
              name="passengerCount"
              required
              type="number"
            />
            <FieldError errors={state.fieldErrors?.passengerCount} />
          </div>

          <div className="fgrid2">
            <div className="fgroup">
              <label className="flabel" htmlFor="itinerary-edit-currency">
                Moneda
              </label>
              <select
                className="finput"
                data-testid="admin-next-itinerary-edit-currency"
                defaultValue={defaults.currencyType}
                id="itinerary-edit-currency"
                name="currencyType"
              >
                <option value="COP">COP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
              <FieldError errors={state.fieldErrors?.currencyType} />
            </div>
            <div className="fgroup">
              <label className="flabel" htmlFor="itinerary-edit-language">
                Idioma
              </label>
              <select
                className="finput"
                data-testid="admin-next-itinerary-edit-language"
                defaultValue={defaults.language}
                id="itinerary-edit-language"
                name="language"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
              <FieldError errors={state.fieldErrors?.language} />
            </div>
          </div>

          <div className="fgroup">
            <label className="flabel" htmlFor="itinerary-edit-request-type">
              Tipo
            </label>
            <select
              className="finput"
              data-testid="admin-next-itinerary-edit-request-type"
              defaultValue={defaults.requestType}
              id="itinerary-edit-request-type"
              name="requestType"
            >
              <option value="Cotizacion">Cotización</option>
              <option value="Operacion">Operación</option>
              <option value="Package Kit">Package Kit</option>
            </select>
            <FieldError errors={state.fieldErrors?.requestType} />
          </div>

          <div className="fgroup">
            <label className="flabel" htmlFor="itinerary-edit-message">
              Mensaje personalizado
            </label>
            <textarea
              className="finput"
              data-testid="admin-next-itinerary-edit-message"
              defaultValue={defaults.personalizedMessage}
              id="itinerary-edit-message"
              maxLength={500}
              name="personalizedMessage"
              rows={3}
            />
            <FieldError errors={state.fieldErrors?.personalizedMessage} />
          </div>
        </div>

        <div className="modal-foot">
          <span className="note">
            Guarda con PATCH /itineraries como Flutter.
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
      data-testid="admin-next-itinerary-edit-submit"
      disabled={disabled || pending}
      type="submit"
    >
      <EvoIcon name="check" size={15} />
      {pending ? "Guardando..." : "Guardar"}
    </button>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;

  return <div className="field-error">{errors[0]}</div>;
}
