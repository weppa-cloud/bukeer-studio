import type {
  PackageKitsFixture,
  PackageKitTone,
} from "@/lib/admin-next/fixtures/package-kits";
import { EvoDataState } from "./evo-data-state";
import { EvoIcon } from "./icons";

const TONE_CHIP: Record<PackageKitTone, string> = {
  primary: "",
  success: " green",
  warning: " orange",
  live: " teal",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Activo",
  draft: "Borrador",
  archived: "Archivado",
};

export function EvoPackageKits({
  fixture,
  subtitle,
}: {
  fixture: PackageKitsFixture;
  subtitle: string;
}) {
  const selected = fixture.selected;
  const hasKits = fixture.kits.length > 0;

  return (
    <div data-testid="admin-next-package-kits-root">
      <div className="page-head">
        <div>
          <h1>Package Kits</h1>
          <div className="sub">{subtitle}</div>
        </div>
        <div className="actions">
          <span
            className="btn outline"
            data-testid="admin-next-package-kits-apply-preview"
          >
            <EvoIcon name="route" size={14} /> Aplicar a itinerario
          </span>
          <span
            className="btn primary"
            data-testid="admin-next-package-kits-create"
          >
            <EvoIcon name="plus" size={15} /> Crear paquete
          </span>
        </div>
      </div>

      <div className="ptabs" data-testid="admin-next-package-kits-tabs">
        {fixture.signals.map((signal, index) => (
          <span
            key={signal.id}
            className={`ptab${index === 0 ? " on" : ""}`}
            data-testid={`admin-next-package-kits-tab-${signal.id}`}
          >
            <EvoIcon
              name={signal.id === "source" ? "route" : "tag"}
              size={15}
            />{" "}
            {signal.label} · {signal.value}
          </span>
        ))}
      </div>

      <div className="filterbar" data-testid="admin-next-package-kits-toolbar">
        <div className="searchbox" data-testid="admin-next-package-kits-search">
          <EvoIcon name="search" size={15} />
          <span>Buscar package kit, destino o slug...</span>
        </div>
        <span className="fchip">
          Estado <EvoIcon name="chevD" size={12} />
        </span>
        <span className="fchip">
          Destino <EvoIcon name="chevD" size={12} />
        </span>
        <span className="fchip">
          Version <EvoIcon name="chevD" size={12} />
        </span>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>Catalogo reutilizable</h3>
            <span>Kits sincronizados contra Supabase compartido</span>
          </div>
          <span className="chip teal">
            <EvoIcon name="check2" size={13} /> Readonly
          </span>
        </div>
        <div
          className="prod-grid kit-grid"
          data-testid="admin-next-package-kits-grid"
        >
          {hasKits ? (
            fixture.kits.map((kit) => (
              <article
                key={kit.id}
                className="card prod-card"
                data-testid={`admin-next-package-kit-${kit.id}`}
              >
                <div className="prod-img">
                  <div className="ph">
                    <EvoIcon name="tag" size={34} />
                  </div>
                  <span className={`chip tagtop${TONE_CHIP[kit.tone]}`}>
                    {STATUS_LABEL[kit.status] ?? kit.status}
                  </span>
                </div>
                <div className="prod-body">
                  <div className="nm">
                    <b>{kit.name}</b>
                    <span className="rate">
                      <EvoIcon name="clock" size={13} /> {kit.durationLabel}
                    </span>
                  </div>
                  <div className="loc">
                    <EvoIcon name="pin" size={13} />
                    <span>{kit.destination}</span>
                  </div>
                  <div className="feats">
                    <span className="chip">{kit.category}</span>
                    <span className="chip">{kit.versionLabel}</span>
                    <span className="chip">{kit.usageLabel}</span>
                  </div>
                  <div className="foot">
                    <span className="from">Desde</span>
                    <span className="price">{kit.priceLabel}</span>
                    <span className="chip prov">{kit.sourceLabel}</span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <EvoDataState
              kind="empty"
              title="Sin package kits"
              description="No hay paquetes reutilizables para esta cuenta o rango de filtros."
              actionHref="/admin/package-kits"
              actionLabel="Limpiar filtros"
              testId="admin-next-package-kits-empty"
            />
          )}
        </div>
      </section>

      <div className="iti-grid">
        {hasKits ? (
          <aside
            className="card"
            data-testid="admin-next-package-kits-selected"
          >
            <div className="card-head">
              <div>
                <h3>{selected.name}</h3>
                <span>{selected.slug}</span>
              </div>
              <span className={`chip${TONE_CHIP[selected.tone]}`}>
                {STATUS_LABEL[selected.status] ?? selected.status}
              </span>
            </div>

            <p className="sub">{selected.description}</p>

            <div className="bal-grid kit-bal-grid">
              {selected.pricing.map((item) => (
                <div className="bal-cell" key={item.id}>
                  <span>{item.label}</span>
                  <b>{item.value}</b>
                  <small>{item.detail}</small>
                </div>
              ))}
            </div>

            <div className="trow" data-testid="admin-next-package-kits-version">
              <span className="ico">
                <EvoIcon name="file" size={16} />
              </span>
              <div className="grow">
                <b>{selected.version.label}</b>
                <span>
                  {selected.version.number} · {selected.version.passengers} ·{" "}
                  {selected.version.margin}
                </span>
              </div>
              <div className="amt">
                <b>{selected.version.locked}</b>
                <span>Version base</span>
              </div>
            </div>

            <div className="card-head">
              <div>
                <h3>Incluye</h3>
                <span>Resumen operativo para aplicar al itinerario</span>
              </div>
            </div>
            <div className="feats">
              {(selected.inclusions.length > 0
                ? selected.inclusions
                : ["Sin inclusiones registradas"]
              ).map((item) => (
                <span className="chip" key={item}>
                  {item}
                </span>
              ))}
            </div>
            <div className="feats">
              {(selected.highlights.length > 0
                ? selected.highlights
                : ["Sin highlights registrados"]
              ).map((item) => (
                <span className="chip" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </aside>
        ) : (
          <EvoDataState
            kind="empty"
            title="Sin paquete seleccionado"
            description="Selecciona o crea un package kit para ver versionado, precio e inclusiones."
            testId="admin-next-package-kits-selected-empty"
          />
        )}
      </div>

      <section className="card" data-testid="admin-next-package-kits-signals">
        <div className="card-head">
          <div>
            <h3>Senales de paridad F15</h3>
            <span>Estado, versionado y origen contra el backend real</span>
          </div>
        </div>
        {fixture.signals.map((signal) => (
          <div
            className="trow"
            key={signal.id}
            data-testid={`admin-next-package-kits-signal-${signal.id}`}
          >
            <span className="ico">
              <EvoIcon
                name={signal.id === "source" ? "route" : "check2"}
                size={16}
              />
            </span>
            <div className="grow">
              <b>{signal.label}</b>
              <span>{signal.detail}</span>
            </div>
            <div className="amt pos">
              <b>{signal.value}</b>
              <span>{signal.tone}</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
