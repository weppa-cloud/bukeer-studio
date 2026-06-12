// Detalle de itinerario Evolución — port del prototipo bukeer-screens-iti.js.
// Las pestañas viven en la URL (?tab=...) para mantener el flujo navegable y testeable.

import Link from "next/link";
import {
  changeAdminNextItineraryStatusAction,
  deleteAdminNextPassengerAction,
  deleteAdminNextTransactionAction,
  deleteAdminNextItineraryItemAction,
  generateAdminNextItineraryPdfAction,
  updateAdminNextItineraryConfirmationDateAction,
  updateAdminNextItineraryItemReservationAction,
  upsertAdminNextPassengerAction,
  upsertAdminNextTransactionAction,
} from "@/app/admin/itineraries/actions";
import type {
  ItineraryDetailItem,
  ItineraryDetailTab,
  ItineraryInstallment,
  ItineraryPaymentMethodOption,
  ItineraryPublicProposal,
  ItinerarySummary,
} from "@/lib/admin-next/fixtures/itineraries";
import type {
  ItineraryAuditItem,
  ItineraryDetailPageData,
} from "@/lib/admin-next/itineraries-adapter";
import { EvoEditItineraryHeaderModal } from "./evo-edit-itinerary-header-modal";
import { EvoIcon, type EvoIconName } from "./icons";

const DETAIL_TABS: Array<{
  id: ItineraryDetailTab;
  label: string;
  icon: EvoIconName;
}> = [
  { id: "services", label: "Items", icon: "route" },
  { id: "passengers", label: "Pasajeros", icon: "users" },
  { id: "payments", label: "Pagos", icon: "card" },
  { id: "suppliers", label: "Proveedores", icon: "building" },
  { id: "preview", label: "Preview", icon: "share" },
];

const TONE_CHIP = {
  primary: "chip purple",
  success: "chip green",
  warning: "chip orange",
  danger: "chip red",
  live: "chip teal",
} as const;

export type ItineraryPdfResult = {
  error?: string;
  kind?: "proposal" | "account_statement";
  url?: string;
};

function chipForTone(tone: ItineraryDetailItem["tone"]): string {
  return TONE_CHIP[tone] ?? "chip";
}

function statusLabel(status: ItinerarySummary["status"]): string {
  const labels: Record<ItinerarySummary["status"], string> = {
    draft: "Borrador",
    quoted: "Presupuesto",
    won: "Confirmado",
    operating: "En operacion",
    closed: "Finalizado",
  };
  return labels[status];
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function DetailCard({
  item,
  itineraryId,
  writesEnabled,
}: {
  item: ItineraryDetailItem;
  itineraryId: string;
  writesEnabled: boolean;
}) {
  const icon = iconForServiceType(item.service?.type, item.locked);
  const canConfirmReservation = writesEnabled && item.service && !item.locked;
  const canDeleteItem = writesEnabled && Boolean(item.service);

  return (
    <div
      className="card svc-card"
      data-testid={`admin-next-detail-item-${item.id}`}
    >
      <div className="svc-ico">
        <EvoIcon name={icon} size={16} />
      </div>
      <div className="svc-main">
        <b>{item.label}</b>
        <span>{item.detail}</span>
        {item.service ? (
          <div
            className="svc-meta"
            data-testid={`admin-next-detail-item-meta-${item.id}`}
          >
            <span
              className="chip"
              data-testid={`admin-next-detail-item-type-${item.id}`}
            >
              {item.service.type}
            </span>
            <span
              className="chip purple"
              data-testid={`admin-next-detail-item-source-${item.id}`}
            >
              {item.service.source}
            </span>
            <span
              className={item.locked ? "chip green" : "chip orange"}
              data-testid={`admin-next-detail-item-reservation-${item.id}`}
            >
              {item.service.reservation}
            </span>
          </div>
        ) : null}
      </div>
      <div className="svc-amts">
        {item.service ? (
          <div className="svc-money">
            <div className="sum-row">
              <span>Costo</span>
              <b data-testid={`admin-next-detail-item-cost-${item.id}`}>
                {item.service.totalCost}
              </b>
            </div>
            <div className="sum-row">
              <span>Precio</span>
              <b data-testid={`admin-next-detail-item-price-${item.id}`}>
                {item.service.totalPrice}
              </b>
            </div>
            <div className="sum-row">
              <span>Markup</span>
              <b data-testid={`admin-next-detail-item-markup-${item.id}`}>
                {item.service.markup}
              </b>
            </div>
            <div className="svc-provider">
              <span data-testid={`admin-next-detail-item-provider-${item.id}`}>
                {item.service.provider}
              </span>
              <span>{item.service.catalogStatus}</span>
            </div>
            <form
              action={updateAdminNextItineraryItemReservationAction}
              className="svc-action"
              data-testid={`admin-next-detail-item-reservation-form-${item.id}`}
            >
              <input name="itineraryId" type="hidden" value={itineraryId} />
              <input name="itemId" type="hidden" value={item.id} />
              <input name="reservationStatus" type="hidden" value="true" />
              <button
                className={item.locked ? "btn outline" : "btn primary"}
                data-testid={`admin-next-detail-item-confirm-${item.id}`}
                disabled={!canConfirmReservation}
                type="submit"
              >
                <EvoIcon name={item.locked ? "check2" : "check"} size={14} />
                {item.locked ? "Reservado" : "Confirmar"}
              </button>
            </form>
            <form
              action={deleteAdminNextItineraryItemAction}
              className="svc-action"
              data-testid={`admin-next-detail-item-delete-form-${item.id}`}
            >
              <input name="itineraryId" type="hidden" value={itineraryId} />
              <input name="itemId" type="hidden" value={item.id} />
              <button
                className="btn outline"
                data-testid={`admin-next-detail-item-delete-${item.id}`}
                disabled={!canDeleteItem}
                type="submit"
              >
                <EvoIcon name="x" size={14} />
                Eliminar
              </button>
            </form>
          </div>
        ) : (
          <span className={chipForTone(item.tone)}>{item.value}</span>
        )}
      </div>
    </div>
  );
}

function iconForServiceType(
  type: string | undefined,
  locked: boolean | undefined,
): EvoIconName {
  if (locked) return "check2";
  const normalized = type?.trim().toLowerCase() ?? "";
  if (normalized.includes("hotel")) return "bed";
  if (normalized.includes("vuelo")) return "plane";
  if (normalized.includes("transporte")) return "car";
  if (normalized.includes("servicio") || normalized.includes("actividad"))
    return "ticket";
  return "route";
}

function ServicesPanel({
  itineraryId,
  items,
  writesEnabled,
}: {
  itineraryId: string;
  items: ItineraryDetailItem[];
  writesEnabled: boolean;
}) {
  return (
    <div
      className="iti-col"
      data-testid="admin-next-itinerary-tab-panel-services"
    >
      <div className="svc-day">Servicios del itinerario</div>
      {items.map((item) => (
        <DetailCard
          key={item.id}
          item={item}
          itineraryId={itineraryId}
          writesEnabled={writesEnabled}
        />
      ))}
    </div>
  );
}

function PassengerForm({
  item,
  itineraryId,
  mode,
  writesEnabled,
}: {
  item?: ItineraryDetailItem;
  itineraryId: string;
  mode: "create" | "edit";
  writesEnabled: boolean;
}) {
  const passenger = item?.passenger;
  const suffix = item?.id ?? "new";
  const title = mode === "create" ? "Agregar pasajero" : "Editar pasajero";

  return (
    <form
      action={upsertAdminNextPassengerAction}
      className="passenger-form"
      data-testid={`admin-next-passenger-${mode}-form-${suffix}`}
    >
      <input name="itineraryId" type="hidden" value={itineraryId} />
      <input name="passengerId" type="hidden" value={item?.id ?? ""} />
      <div className="passenger-form-head">
        <h3>{title}</h3>
        <span className={writesEnabled ? "chip green" : "chip orange"}>
          {writesEnabled ? "Writes activo" : "Solo lectura"}
        </span>
      </div>
      <div className="fgrid2 passenger-form-grid">
        <label className="flabel" htmlFor={`passenger-first-${suffix}`}>
          Nombre
          <input
            className="finput"
            data-testid={`admin-next-passenger-first-name-${suffix}`}
            defaultValue={passenger?.firstName ?? ""}
            disabled={!writesEnabled}
            id={`passenger-first-${suffix}`}
            maxLength={80}
            name="firstName"
            required
          />
        </label>
        <label className="flabel" htmlFor={`passenger-last-${suffix}`}>
          Apellido
          <input
            className="finput"
            data-testid={`admin-next-passenger-last-name-${suffix}`}
            defaultValue={passenger?.lastName ?? ""}
            disabled={!writesEnabled}
            id={`passenger-last-${suffix}`}
            maxLength={80}
            name="lastName"
          />
        </label>
        <label className="flabel" htmlFor={`passenger-doc-type-${suffix}`}>
          Tipo documento
          <input
            className="finput"
            data-testid={`admin-next-passenger-document-type-${suffix}`}
            defaultValue={passenger?.documentType ?? ""}
            disabled={!writesEnabled}
            id={`passenger-doc-type-${suffix}`}
            maxLength={40}
            name="documentType"
          />
        </label>
        <label className="flabel" htmlFor={`passenger-doc-number-${suffix}`}>
          Numero documento
          <input
            className="finput"
            data-testid={`admin-next-passenger-document-number-${suffix}`}
            defaultValue={passenger?.documentNumber ?? ""}
            disabled={!writesEnabled}
            id={`passenger-doc-number-${suffix}`}
            maxLength={60}
            name="documentNumber"
          />
        </label>
        <label className="flabel" htmlFor={`passenger-nationality-${suffix}`}>
          Nacionalidad
          <input
            className="finput"
            data-testid={`admin-next-passenger-nationality-${suffix}`}
            defaultValue={passenger?.nationality ?? ""}
            disabled={!writesEnabled}
            id={`passenger-nationality-${suffix}`}
            maxLength={80}
            name="nationality"
          />
        </label>
        <label className="flabel" htmlFor={`passenger-birth-${suffix}`}>
          Fecha nacimiento
          <input
            className="finput"
            data-testid={`admin-next-passenger-birth-date-${suffix}`}
            defaultValue={passenger?.birthDate ?? ""}
            disabled={!writesEnabled}
            id={`passenger-birth-${suffix}`}
            name="birthDate"
            type="date"
          />
        </label>
        <label className="flabel" htmlFor={`passenger-email-${suffix}`}>
          Email
          <input
            className="finput"
            data-testid={`admin-next-passenger-email-${suffix}`}
            defaultValue={passenger?.email ?? ""}
            disabled={!writesEnabled}
            id={`passenger-email-${suffix}`}
            maxLength={120}
            name="email"
            type="email"
          />
        </label>
        <label className="flabel" htmlFor={`passenger-phone-${suffix}`}>
          Telefono
          <input
            className="finput"
            data-testid={`admin-next-passenger-phone-${suffix}`}
            defaultValue={passenger?.phoneNumber ?? ""}
            disabled={!writesEnabled}
            id={`passenger-phone-${suffix}`}
            maxLength={40}
            name="phoneNumber"
          />
        </label>
        <label className="flabel" htmlFor={`passenger-gender-${suffix}`}>
          Genero
          <input
            className="finput"
            data-testid={`admin-next-passenger-gender-${suffix}`}
            defaultValue={passenger?.gender ?? ""}
            disabled={!writesEnabled}
            id={`passenger-gender-${suffix}`}
            maxLength={40}
            name="gender"
          />
        </label>
        <label className="passenger-check">
          <input
            data-testid={`admin-next-passenger-main-${suffix}`}
            defaultChecked={passenger?.isMainPassenger ?? false}
            disabled={!writesEnabled}
            name="isMainPassenger"
            type="checkbox"
            value="true"
          />
          Pasajero principal
        </label>
      </div>
      <button
        className="btn primary"
        data-testid={`admin-next-passenger-save-${suffix}`}
        disabled={!writesEnabled}
        type="submit"
      >
        <EvoIcon name="check" size={14} />
        {mode === "create" ? "Agregar" : "Guardar"}
      </button>
    </form>
  );
}

function PassengersPanel({
  itineraryId,
  items,
  writesEnabled,
}: {
  itineraryId: string;
  items: ItineraryDetailItem[];
  writesEnabled: boolean;
}) {
  const passengers = items.filter((item) => item.passenger);
  const emptyItem = passengers.length === 0 ? items[0] : null;

  return (
    <div
      className="iti-col passenger-panel"
      data-testid="admin-next-itinerary-tab-panel-passengers"
    >
      <div className="card passenger-head">
        <div>
          <div className="k">Pasajeros</div>
          <h3>{passengers.length} registrados</h3>
        </div>
        <span className="chip purple">{items.length} filas</span>
      </div>

      {emptyItem ? (
        <div
          className="card inline-alert"
          data-testid="admin-next-passenger-empty"
        >
          {emptyItem.label} · {emptyItem.detail}
        </div>
      ) : (
        <div className="card passenger-list">
          {passengers.map((item) => (
            <div
              key={item.id}
              className="px-row passenger-row"
              data-testid={`admin-next-passenger-${item.id}`}
            >
              <div className="av s40">{initialsOf(item.label)}</div>
              <div className="c nm">
                <b>{item.label}</b>
                <span>{item.detail || "Sin documento registrado"}</span>
              </div>
              <div className="c">
                <div className="k">Rol</div>
                <div className="v">{item.value}</div>
              </div>
              <span className={chipForTone(item.tone)}>
                {item.tone === "success" ? "Completo" : "Pendiente"}
              </span>
              <details className="passenger-edit">
                <summary
                  className="btn outline"
                  data-testid={`admin-next-passenger-edit-toggle-${item.id}`}
                >
                  Editar
                </summary>
                <PassengerForm
                  item={item}
                  itineraryId={itineraryId}
                  mode="edit"
                  writesEnabled={writesEnabled}
                />
              </details>
              <form
                action={deleteAdminNextPassengerAction}
                className="passenger-delete"
                data-testid={`admin-next-passenger-delete-form-${item.id}`}
              >
                <input name="itineraryId" type="hidden" value={itineraryId} />
                <input name="passengerId" type="hidden" value={item.id} />
                <button
                  className="btn outline"
                  data-testid={`admin-next-passenger-delete-${item.id}`}
                  disabled={!writesEnabled}
                  type="submit"
                >
                  <EvoIcon name="x" size={14} />
                  Eliminar
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <details open={passengers.length === 0}>
          <summary
            className="btn primary passenger-add-toggle"
            data-testid="admin-next-passenger-add-toggle"
          >
            <EvoIcon name="plus" size={14} />
            Agregar pasajero
          </summary>
          <div className="passenger-add-body">
            <PassengerForm
              itineraryId={itineraryId}
              mode="create"
              writesEnabled={writesEnabled}
            />
          </div>
        </details>
      </div>
    </div>
  );
}

function SuppliersPanel({
  items,
  itineraryId,
  writesEnabled,
}: {
  items: ItineraryDetailItem[];
  itineraryId: string;
  writesEnabled: boolean;
}) {
  const suppliers = items.filter((item) => item.supplier);
  const emptyItem = suppliers.length === 0 ? items[0] : null;
  const totals = suppliers.reduce(
    (acc, item) => {
      acc.totalCost += item.supplier?.totalCost ?? 0;
      acc.paidCost += item.supplier?.paidCost ?? 0;
      acc.pendingCost += item.supplier?.pendingCost ?? 0;
      acc.itemCount += item.supplier?.itemCount ?? 0;
      return acc;
    },
    { itemCount: 0, paidCost: 0, pendingCost: 0, totalCost: 0 },
  );
  const currencySeed = suppliers[0]?.supplier?.totalCostLabel ?? "$ 0";
  const totalCostLabel = formatSupplierPanelMoney(
    totals.totalCost,
    currencySeed,
  );
  const paidCostLabel = formatSupplierPanelMoney(totals.paidCost, currencySeed);
  const pendingCostLabel = formatSupplierPanelMoney(
    totals.pendingCost,
    currencySeed,
  );

  return (
    <div
      className="iti-col supplier-panel"
      data-testid="admin-next-itinerary-tab-panel-suppliers"
    >
      <div className="card supplier-summary">
        <div className="payment-records-head">
          <div>
            <div className="k">Pagos a proveedores</div>
            <h3>{suppliers.length} proveedores agrupados</h3>
          </div>
          <span className={writesEnabled ? "chip green" : "chip orange"}>
            {writesEnabled ? "Writes activo" : "Solo lectura"}
          </span>
        </div>
        <div className="bal-grid">
          <div className="bal-cell">
            <div className="k">Servicios</div>
            <div className="v">{totals.itemCount}</div>
            <div className="s">Items con proveedor</div>
          </div>
          <div className="bal-cell">
            <div className="k">Total</div>
            <div className="v">{totalCostLabel}</div>
            <div className="s">Costo proveedor</div>
          </div>
          <div className="bal-cell">
            <div className="k">Pagado</div>
            <div className="v green">{paidCostLabel}</div>
            <div className="s">Registrado en items</div>
          </div>
          <div className="bal-cell">
            <div className="k">Pendiente</div>
            <div className="v orange">{pendingCostLabel}</div>
            <div className="s">Por pagar</div>
          </div>
        </div>
      </div>

      {emptyItem ? (
        <div
          className="card inline-alert"
          data-testid="admin-next-supplier-empty"
        >
          {emptyItem.label} · {emptyItem.detail}
        </div>
      ) : (
        suppliers.map((item) => {
          const supplier = item.supplier;
          if (!supplier) return null;

          return (
            <div
              key={item.id}
              className="card prv-card supplier-card"
              data-testid={`admin-next-supplier-${item.id}`}
            >
              <div className="prv-head">
                <div className="av s40">
                  {initialsOf(supplier.providerName)}
                </div>
                <div className="grow">
                  <b data-testid={`admin-next-supplier-name-${item.id}`}>
                    {supplier.providerName}
                  </b>
                  <span>
                    {supplier.itemCount}{" "}
                    {supplier.itemCount === 1 ? "servicio" : "servicios"} ·{" "}
                    {supplier.providerEmail || "Sin email operativo"}
                  </span>
                </div>
                <span className={chipForTone(item.tone)}>
                  {supplier.pendingCount > 0
                    ? `${supplier.pendingCount} pendientes`
                    : "Confirmado"}
                </span>
              </div>

              <div className="supplier-money">
                <div className="sum-row">
                  <span>Costo total</span>
                  <b>{supplier.totalCostLabel}</b>
                </div>
                <div className="sum-row">
                  <span>Pagado</span>
                  <b className="green">{supplier.paidCostLabel}</b>
                </div>
                <div className="sum-row">
                  <span>Pendiente</span>
                  <b className={supplier.pendingCost > 0 ? "orange" : "green"}>
                    {supplier.pendingCostLabel}
                  </b>
                </div>
              </div>

              <div className="supplier-items">
                {supplier.items.map((supplierItem) => (
                  <div
                    key={supplierItem.itemId}
                    className="prv-svc"
                    data-testid={`admin-next-supplier-item-${supplierItem.itemId}`}
                  >
                    <div className="svc-ico">
                      <EvoIcon
                        name={iconForServiceType(
                          supplierItem.productType,
                          supplierItem.reserved,
                        )}
                        size={14}
                      />
                    </div>
                    <div className="grow">
                      <b>{supplierItem.productName}</b>
                      <span>
                        {[
                          supplierItem.productType,
                          supplierItem.rateName
                            ? `Tarifa ${supplierItem.rateName}`
                            : null,
                          supplierItem.serviceDate,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                    <span
                      className={
                        supplierItem.reserved ? "chip green" : "chip orange"
                      }
                    >
                      {supplierItem.reservationStatus}
                    </span>
                    <span className="chip">
                      {supplierItem.messageCount} mensajes
                    </span>
                    <form
                      action={updateAdminNextItineraryItemReservationAction}
                      className="supplier-confirm"
                      data-testid={`admin-next-supplier-confirm-form-${supplierItem.itemId}`}
                    >
                      <input
                        name="itineraryId"
                        type="hidden"
                        value={itineraryId}
                      />
                      <input
                        name="itemId"
                        type="hidden"
                        value={supplierItem.itemId}
                      />
                      <input
                        name="reservationStatus"
                        type="hidden"
                        value="true"
                      />
                      <input name="returnTab" type="hidden" value="suppliers" />
                      <button
                        className="btn outline"
                        data-testid={`admin-next-supplier-confirm-${supplierItem.itemId}`}
                        disabled={!writesEnabled || supplierItem.reserved}
                        type="submit"
                      >
                        <EvoIcon name="check" size={14} />
                        Confirmar
                      </button>
                    </form>
                  </div>
                ))}
              </div>

              <div className="prv-foot">
                <span>
                  {supplier.confirmedCount}/{supplier.itemCount} reservas
                  confirmadas
                </span>
                <button className="btn outline" disabled type="button">
                  <EvoIcon name="send" size={14} />
                  Notificar
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function formatSupplierPanelMoney(value: number, seed: string): string {
  const currency = seed.includes("US$") ? "USD" : "COP";
  return new Intl.NumberFormat("es-CO", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function PaymentsPanel({
  items,
  itineraryId,
  methods,
  installments,
  writesEnabled,
}: {
  items: ItineraryDetailItem[];
  itineraryId: string;
  methods: ItineraryPaymentMethodOption[];
  installments: ItineraryInstallment[];
  writesEnabled: boolean;
}) {
  const transactions = items.filter((item) => item.payment);
  const emptyItem = transactions.length === 0 ? items[0] : null;
  const paid = installments.filter(
    (installment) => installment.status === "paid",
  ).length;
  const progress =
    installments.length > 0
      ? Math.round((paid / installments.length) * 100)
      : 0;

  return (
    <div
      className="iti-col"
      data-testid="admin-next-itinerary-tab-panel-payments"
    >
      <div className="card">
        <div className="bal-grid">
          <div className="bal-cell">
            <div className="k">Pagado</div>
            <div className="v green">
              {paid}/{installments.length}
            </div>
            <div className="s">Cuotas protegidas</div>
          </div>
          <div className="bal-cell">
            <div className="k">Progreso</div>
            <div className="v">{progress}%</div>
            <div className="s">Contra plan actual</div>
          </div>
          <div className="bal-cell">
            <div className="k">Registros</div>
            <div className="v orange">{items.length}</div>
            <div className="s">Transacciones</div>
          </div>
        </div>
        <div className="progress-lg">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="card">
        {installments.map((installment, index) => (
          <div
            key={installment.id}
            className={`cuota${installment.status === "paid" ? " done" : ""}`}
            data-testid={`admin-next-installment-${installment.id}`}
          >
            <div className="n">{index + 1}</div>
            <div className="grow">
              <b>{installment.label}</b>
              <span>{installment.dueDate}</span>
            </div>
            <div className="amt">{installment.amount}</div>
          </div>
        ))}
      </div>

      <div className="card">
        {methods.map((method) => (
          <div
            key={method.id}
            className="pm-row"
            data-testid={`admin-next-payment-method-${method.id}`}
          >
            <div className="pm-ico">
              <EvoIcon
                name={method.id === "card" ? "card" : "wallet"}
                size={16}
              />
            </div>
            <div className="grow">
              <b>{method.label}</b>
              <span>
                {method.total} · Fee {method.fee}
              </span>
            </div>
            <div className={`toggle${method.feeIncluded ? " on" : ""}`}>
              <i />
            </div>
          </div>
        ))}
      </div>

      <div className="card payment-records">
        <div className="payment-records-head">
          <div>
            <div className="k">Historial</div>
            <h3>{transactions.length} pagos registrados</h3>
          </div>
          <span className={writesEnabled ? "chip green" : "chip orange"}>
            {writesEnabled ? "Writes activo" : "Solo lectura"}
          </span>
        </div>
        {emptyItem ? (
          <div className="inline-alert" data-testid="admin-next-payment-empty">
            {emptyItem.label} · {emptyItem.detail}
          </div>
        ) : (
          transactions.map((item) => (
            <div
              key={item.id}
              className="payment-row"
              data-testid={`admin-next-payment-${item.id}`}
            >
              <div className="pm-ico">
                <EvoIcon
                  name={item.payment?.type === "egreso" ? "wallet" : "card"}
                  size={16}
                />
              </div>
              <div className="grow">
                <b>{item.value}</b>
                <span>{item.detail}</span>
              </div>
              <span className={chipForTone(item.tone)}>{item.label}</span>
              <details className="payment-edit">
                <summary
                  className="btn outline"
                  data-testid={`admin-next-payment-edit-toggle-${item.id}`}
                >
                  Editar
                </summary>
                <TransactionForm
                  item={item}
                  itineraryId={itineraryId}
                  mode="edit"
                  writesEnabled={writesEnabled}
                />
              </details>
              <form
                action={deleteAdminNextTransactionAction}
                className="payment-delete"
                data-testid={`admin-next-payment-delete-form-${item.id}`}
              >
                <input name="itineraryId" type="hidden" value={itineraryId} />
                <input name="transactionId" type="hidden" value={item.id} />
                <button
                  className="btn outline"
                  data-testid={`admin-next-payment-delete-${item.id}`}
                  disabled={!writesEnabled}
                  type="submit"
                >
                  <EvoIcon name="x" size={14} />
                  Eliminar
                </button>
              </form>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <details open={transactions.length === 0}>
          <summary
            className="btn primary payment-add-toggle"
            data-testid="admin-next-payment-add-toggle"
          >
            <EvoIcon name="plus" size={14} />
            Registrar pago
          </summary>
          <div className="payment-add-body">
            <TransactionForm
              itineraryId={itineraryId}
              mode="create"
              writesEnabled={writesEnabled}
            />
          </div>
        </details>
      </div>
    </div>
  );
}

function TransactionForm({
  item,
  itineraryId,
  mode,
  writesEnabled,
}: {
  item?: ItineraryDetailItem;
  itineraryId: string;
  mode: "create" | "edit";
  writesEnabled: boolean;
}) {
  const payment = item?.payment;
  const suffix = item?.id ?? "new";

  return (
    <form
      action={upsertAdminNextTransactionAction}
      className="payment-form"
      data-testid={`admin-next-payment-${mode}-form-${suffix}`}
    >
      <input name="itineraryId" type="hidden" value={itineraryId} />
      <input name="transactionId" type="hidden" value={item?.id ?? ""} />
      <input name="originalCurrency" type="hidden" value="COP" />
      <input name="exchangeRate" type="hidden" value="1" />
      <input name="conversionDate" type="hidden" value="" />
      <input name="feeAmount" type="hidden" value="0" />
      <input name="totalPaid" type="hidden" value="" />
      <div className="fgrid2 payment-form-grid">
        <label className="flabel" htmlFor={`payment-date-${suffix}`}>
          Fecha
          <input
            className="finput"
            data-testid={`admin-next-payment-date-${suffix}`}
            defaultValue={payment?.date ?? ""}
            disabled={!writesEnabled}
            id={`payment-date-${suffix}`}
            name="date"
            required
            type="date"
          />
        </label>
        <label className="flabel" htmlFor={`payment-value-${suffix}`}>
          Valor
          <input
            className="finput"
            data-testid={`admin-next-payment-value-${suffix}`}
            defaultValue={payment?.amount ?? ""}
            disabled={!writesEnabled}
            id={`payment-value-${suffix}`}
            min="1"
            name="value"
            required
            step="1"
            type="number"
          />
        </label>
        <label className="flabel" htmlFor={`payment-method-${suffix}`}>
          Metodo
          <input
            className="finput"
            data-testid={`admin-next-payment-method-${suffix}`}
            defaultValue={payment?.paymentMethod ?? "Transferencia bancaria"}
            disabled={!writesEnabled}
            id={`payment-method-${suffix}`}
            maxLength={120}
            name="paymentMethod"
            required
          />
        </label>
        <label className="flabel" htmlFor={`payment-type-${suffix}`}>
          Tipo
          <select
            className="finput"
            data-testid={`admin-next-payment-type-${suffix}`}
            defaultValue={payment?.type === "egreso" ? "egreso" : "ingreso"}
            disabled={!writesEnabled}
            id={`payment-type-${suffix}`}
            name="type"
          >
            <option value="ingreso">Ingreso cliente</option>
            <option value="egreso">Egreso proveedor</option>
          </select>
        </label>
        <label className="flabel" htmlFor={`payment-reference-${suffix}`}>
          Referencia
          <input
            className="finput"
            data-testid={`admin-next-payment-reference-${suffix}`}
            defaultValue={payment?.reference ?? ""}
            disabled={!writesEnabled}
            id={`payment-reference-${suffix}`}
            maxLength={120}
            name="reference"
          />
        </label>
        <label className="flabel" htmlFor={`payment-voucher-${suffix}`}>
          Voucher URL
          <input
            className="finput"
            data-testid={`admin-next-payment-voucher-${suffix}`}
            defaultValue={payment?.voucherUrl ?? ""}
            disabled={!writesEnabled}
            id={`payment-voucher-${suffix}`}
            maxLength={2000}
            name="voucherUrl"
            type="url"
          />
        </label>
      </div>
      <button
        className="btn primary"
        data-testid={`admin-next-payment-save-${suffix}`}
        disabled={!writesEnabled}
        type="submit"
      >
        <EvoIcon name="check" size={14} />
        {mode === "create" ? "Registrar" : "Guardar"}
      </button>
    </form>
  );
}

function PreviewPanel({
  pdfResult,
  publicProposal,
  summary,
  items,
}: {
  pdfResult?: ItineraryPdfResult;
  publicProposal: ItineraryPublicProposal;
  summary: ItinerarySummary;
  items: ItineraryDetailItem[];
}) {
  const previewItems = items.filter((item) => item.preview);
  const emptyItem = previewItems.length === 0 ? items[0] : null;
  const reservedCount = previewItems.filter(
    (item) => item.preview?.reserved,
  ).length;
  const dayCount = new Set(
    previewItems.map(
      (item) => item.preview?.dayNumber ?? item.preview?.serviceDate,
    ),
  ).size;
  const productTypes = new Set(
    previewItems.map((item) => item.preview?.productType).filter(Boolean),
  ).size;

  return (
    <div
      className="card pv-doc"
      data-testid="admin-next-itinerary-tab-panel-preview"
    >
      <div className="pv-hero">
        <div>
          <div className="pv-kicker">Propuesta cliente</div>
          <h2>{summary.title}</h2>
          <div className="pv-meta">
            {summary.customer} · {summary.startDate} - {summary.endDate}
          </div>
        </div>
        <div className="pv-price">
          <div className="k">Total</div>
          <div className="v">{summary.value}</div>
          <div className="s">{summary.pax} pasajeros</div>
        </div>
      </div>

      <div className="preview-action-bar">
        <div>
          <div className="k">Link publico</div>
          <Link
            className="preview-public-link"
            data-testid="admin-next-preview-public-link"
            href={publicProposal.shareUrl}
          >
            {publicProposal.shareUrl}
          </Link>
        </div>
        <div className="preview-actions">
          <form
            action={generateAdminNextItineraryPdfAction}
            data-testid="admin-next-preview-pdf-proposal-form"
          >
            <input name="itineraryId" type="hidden" value={summary.id} />
            <input name="kind" type="hidden" value="proposal" />
            <input name="hideEmptyDays" type="hidden" value="true" />
            <button
              className="btn outline"
              data-testid="admin-next-preview-pdf-proposal"
              type="submit"
            >
              <EvoIcon name="file" size={14} />
              PDF propuesta
            </button>
          </form>
          <form
            action={generateAdminNextItineraryPdfAction}
            data-testid="admin-next-preview-pdf-account-form"
          >
            <input name="itineraryId" type="hidden" value={summary.id} />
            <input name="kind" type="hidden" value="account_statement" />
            <input name="hideEmptyDays" type="hidden" value="true" />
            <button
              className="btn outline"
              data-testid="admin-next-preview-pdf-account"
              type="submit"
            >
              <EvoIcon name="file" size={14} />
              Estado cuenta
            </button>
          </form>
        </div>
      </div>

      {pdfResult?.url ? (
        <div
          className="inline-alert compact preview-pdf-result"
          data-testid="admin-next-preview-pdf-result"
        >
          PDF generado ·{" "}
          <a href={pdfResult.url} target="_blank" rel="noreferrer">
            Abrir{" "}
            {pdfResult.kind === "account_statement"
              ? "estado de cuenta"
              : "propuesta"}
          </a>
        </div>
      ) : null}
      {pdfResult?.error ? (
        <div
          className="inline-alert compact preview-pdf-error"
          data-testid="admin-next-preview-pdf-error"
        >
          No se pudo generar el PDF · {pdfResult.error}
        </div>
      ) : null}

      <div className="preview-stats" data-testid="admin-next-preview-stats">
        <div>
          <div className="k">Dias con contenido</div>
          <div className="v">{dayCount}</div>
        </div>
        <div>
          <div className="k">Servicios</div>
          <div className="v">{previewItems.length}</div>
        </div>
        <div>
          <div className="k">Tipos</div>
          <div className="v">{productTypes}</div>
        </div>
        <div>
          <div className="k">Reservados</div>
          <div className="v">{reservedCount}</div>
        </div>
      </div>

      {emptyItem ? (
        <div
          className="inline-alert compact"
          data-testid="admin-next-preview-empty"
        >
          {emptyItem.label} · {emptyItem.detail}
        </div>
      ) : (
        previewItems.map((item) => {
          const preview = item.preview;
          if (!preview) return null;

          return (
            <div
              key={item.id}
              className="pv-day"
              data-testid={`admin-next-preview-day-${item.id}`}
            >
              <div className="pv-dot" />
              <div className="pv-body">
                <b>{item.label}</b>
                <div
                  className="pv-item preview-item"
                  data-testid={`admin-next-preview-item-${item.id}`}
                >
                  <div
                    className={`pv-thumb ${previewThumbTone(preview.productType, preview.reserved)}`}
                  >
                    <EvoIcon
                      name={previewIconForType(preview.productType)}
                      size={15}
                    />
                  </div>
                  <div className="preview-item-main">
                    <b>{preview.productName}</b>
                    <span>
                      {preview.productType} · {preview.destination} ·{" "}
                      {preview.providerName}
                    </span>
                    <span>{preview.reservationStatus}</span>
                  </div>
                  <div className="pv-amt">{preview.amountLabel}</div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function previewIconForType(type: string): EvoIconName {
  const normalized = type.trim().toLowerCase();
  if (normalized.includes("hotel")) return "bed";
  if (normalized.includes("vuelo")) return "plane";
  if (normalized.includes("transporte")) return "car";
  if (
    normalized.includes("servicio") ||
    normalized.includes("actividad") ||
    normalized.includes("tour")
  ) {
    return "ticket";
  }
  return "route";
}

function previewThumbTone(type: string, reserved: boolean): string {
  if (reserved) return "green";
  const normalized = type.trim().toLowerCase();
  if (normalized.includes("vuelo")) return "teal";
  if (normalized.includes("hotel")) return "purple";
  if (normalized.includes("transporte")) return "orange";
  return "";
}

function SummaryCard({
  canCorrectConfirmationDate,
  confirmationDate,
  summary,
  writesEnabled,
}: {
  canCorrectConfirmationDate: boolean;
  confirmationDate: string;
  summary: ItinerarySummary;
  writesEnabled: boolean;
}) {
  const isConfirmed = summary.status === "won";
  const target = isConfirmed ? "budget" : "confirmed";
  const correctionEnabled =
    writesEnabled && isConfirmed && canCorrectConfirmationDate;

  return (
    <div className="card">
      <div className="card-head">
        <h3>Resumen financiero</h3>
      </div>
      <div className="sum-row">
        <span>Total</span>
        <b>{summary.value}</b>
      </div>
      <div className="sum-row">
        <span>Margen</span>
        <b>{summary.margin}</b>
      </div>
      <div className="sum-row">
        <span>Servicios</span>
        <b>{summary.services}</b>
      </div>
      <div className="sum-div" />
      <div className="margin-box">
        <span>Estado operativo</span>
        <b data-testid="admin-next-itinerary-status-value">
          {statusLabel(summary.status)}
        </b>
      </div>
      <form
        action={changeAdminNextItineraryStatusAction}
        className="action-row"
      >
        <input name="itineraryId" type="hidden" value={summary.id} />
        <input name="target" type="hidden" value={target} />
        <button
          className={isConfirmed ? "btn outline" : "btn primary"}
          data-testid={
            isConfirmed
              ? "admin-next-itinerary-status-reopen"
              : "admin-next-itinerary-status-confirm"
          }
          disabled={!writesEnabled}
          type="submit"
        >
          <EvoIcon name={isConfirmed ? "back" : "check2"} size={15} />
          {isConfirmed ? "Reabrir presupuesto" : "Confirmar itinerario"}
        </button>
      </form>
      {!writesEnabled ? (
        <div
          className="inline-alert compact"
          data-testid="admin-next-itinerary-status-disabled"
        >
          El cambio de estado requiere flag de writes y rol autorizado.
        </div>
      ) : null}
      {isConfirmed ? (
        <>
          <div className="sum-div" />
          <form
            action={updateAdminNextItineraryConfirmationDateAction}
            className="confirm-date-form"
            data-testid="admin-next-itinerary-confirmation-date-form"
          >
            <input name="itineraryId" type="hidden" value={summary.id} />
            <label
              className="flabel"
              htmlFor={`confirmation-date-${summary.id}`}
            >
              Fecha comercial
            </label>
            <input
              className="finput"
              data-testid="admin-next-itinerary-confirmation-date"
              defaultValue={confirmationDate}
              disabled={!correctionEnabled}
              id={`confirmation-date-${summary.id}`}
              name="confirmationDate"
              required
              type="date"
            />
            <label
              className="flabel"
              htmlFor={`confirmation-date-reason-${summary.id}`}
            >
              Motivo
            </label>
            <textarea
              className="finput"
              data-testid="admin-next-itinerary-confirmation-date-reason"
              disabled={!correctionEnabled}
              id={`confirmation-date-reason-${summary.id}`}
              maxLength={300}
              minLength={8}
              name="reason"
              required
              rows={2}
            />
            <button
              className="btn outline"
              data-testid="admin-next-itinerary-confirmation-date-save"
              disabled={!correctionEnabled}
              type="submit"
            >
              <EvoIcon name="check" size={15} />
              Corregir fecha
            </button>
          </form>
          {!correctionEnabled ? (
            <div
              className="inline-alert compact"
              data-testid="admin-next-itinerary-confirmation-date-disabled"
            >
              Solo admin o super_admin puede corregir la fecha comercial.
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function AuditTrail({ auditTrail }: { auditTrail: ItineraryAuditItem[] }) {
  return (
    <div className="card" data-testid="admin-next-itinerary-audit-trail">
      <div className="card-head">
        <h3>Auditoria</h3>
        <span className="chip">{auditTrail.length}</span>
      </div>
      {auditTrail.map((event) => (
        <div
          key={event.id}
          className="trow"
          data-testid={`admin-next-audit-${event.id}`}
        >
          <div className="grow">
            <b>{event.title}</b>
            <span>
              {event.description} · {event.actor}
            </span>
          </div>
          <span className={event.severity === "success" ? "amt pos" : "amt"}>
            {event.source}
          </span>
        </div>
      ))}
    </div>
  );
}

function ActivePanel({
  data,
  pdfResult,
  tab,
  writesEnabled,
}: {
  data: ItineraryDetailPageData;
  pdfResult?: ItineraryPdfResult;
  tab: ItineraryDetailTab;
  writesEnabled: boolean;
}) {
  if (tab === "passengers")
    return (
      <PassengersPanel
        itineraryId={data.summary.id}
        items={data.detail.passengers}
        writesEnabled={writesEnabled}
      />
    );
  if (tab === "suppliers")
    return (
      <SuppliersPanel
        items={data.detail.suppliers}
        itineraryId={data.summary.id}
        writesEnabled={writesEnabled}
      />
    );
  if (tab === "payments") {
    return (
      <PaymentsPanel
        items={data.detail.payments}
        itineraryId={data.summary.id}
        methods={data.paymentPlan.methods}
        installments={data.paymentPlan.installments}
        writesEnabled={writesEnabled}
      />
    );
  }
  if (tab === "preview") {
    return (
      <PreviewPanel
        pdfResult={pdfResult}
        publicProposal={data.publicProposal}
        summary={data.summary}
        items={data.detail.preview}
      />
    );
  }
  return (
    <ServicesPanel
      itineraryId={data.summary.id}
      items={data.detail.services}
      writesEnabled={writesEnabled}
    />
  );
}

function buildItineraryDetailHref({
  id,
  tab,
  edit,
}: {
  id: string;
  tab: ItineraryDetailTab;
  edit?: boolean;
}): string {
  const params = new URLSearchParams();
  if (tab !== "services") params.set("tab", tab);
  if (edit) params.set("edit", "header");

  const query = params.toString();
  return query
    ? `/admin/itineraries/${id}?${query}`
    : `/admin/itineraries/${id}`;
}

export function EvoItineraryDetail({
  data,
  activeTab,
  canCorrectConfirmationDate,
  pdfResult,
  showEditModal,
  writesEnabled,
}: {
  data: ItineraryDetailPageData;
  activeTab: ItineraryDetailTab;
  canCorrectConfirmationDate: boolean;
  pdfResult?: ItineraryPdfResult;
  showEditModal: boolean;
  writesEnabled: boolean;
}) {
  const { summary } = data;
  const detailHref = buildItineraryDetailHref({
    id: summary.id,
    tab: activeTab,
  });

  return (
    <div data-testid="admin-next-itinerary-detail-page">
      <div className="page-head">
        <div>
          <Link href="/admin/itineraries" className="linklike">
            <EvoIcon name="back" size={14} /> Itinerarios
          </Link>
          <h1>{summary.title}</h1>
          <div className="sub">
            {summary.code} · {summary.customer}
          </div>
        </div>
        <div className="actions">
          <span
            className="btn outline"
            data-testid="admin-next-itinerary-share"
          >
            <EvoIcon name="share" size={15} /> Compartir
          </span>
          <Link
            className="btn primary"
            data-testid="admin-next-itinerary-edit"
            href={buildItineraryDetailHref({
              id: summary.id,
              tab: activeTab,
              edit: true,
            })}
          >
            <EvoIcon name="edit" size={15} /> Editar
          </Link>
        </div>
      </div>

      <div className="card iti-hero" data-testid="admin-next-itinerary-detail">
        <div className="av s54">{initialsOf(summary.customer)}</div>
        <div className="who">
          <b>{summary.customer}</b>
          <span>{summary.destination || "Destino por definir"}</span>
          <div className="meta-chips">
            <span className="chip purple">{statusLabel(summary.status)}</span>
            <span className="chip teal">{summary.pax} viajeros</span>
            <span className="chip">
              {summary.startDate} - {summary.endDate}
            </span>
          </div>
        </div>
        <div className="iti-stats">
          <div className="stat">
            <div className="k">Total</div>
            <div className="v">{summary.value}</div>
          </div>
          <div className="stat">
            <div className="k">Margen</div>
            <div className="v green">{summary.margin}</div>
          </div>
          <div className="stat">
            <div className="k">Dias</div>
            <div className="v">{summary.days}</div>
          </div>
        </div>
      </div>

      <div className="iti-tabs">
        {DETAIL_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={buildItineraryDetailHref({ id: summary.id, tab: tab.id })}
            className={`iti-tab${activeTab === tab.id ? " on" : ""}`}
            data-testid={`admin-next-itinerary-tab-${tab.id}`}
          >
            <EvoIcon name={tab.icon} size={14} />
            {tab.label}
            <span className="n">{data.detail[tab.id].length}</span>
          </Link>
        ))}
      </div>

      <div className="iti-grid">
        <ActivePanel
          data={data}
          pdfResult={pdfResult}
          tab={activeTab}
          writesEnabled={writesEnabled}
        />
        <div className="iti-col">
          <SummaryCard
            canCorrectConfirmationDate={canCorrectConfirmationDate}
            confirmationDate={data.confirmationDate}
            summary={summary}
            writesEnabled={writesEnabled}
          />
          <AuditTrail auditTrail={data.auditTrail} />
        </div>
      </div>

      {showEditModal ? (
        <EvoEditItineraryHeaderModal
          closeHref={detailHref}
          defaults={data.editDefaults}
          writesEnabled={writesEnabled}
        />
      ) : null}
    </div>
  );
}
