import type {
  SettingsFixture,
  SettingsPermissionRow,
  SettingsSignal,
  SettingsUser,
} from "@/lib/admin-next/fixtures/settings";
import { EvoDataState } from "./evo-data-state";
import { EvoIcon, type EvoIconName } from "./icons";

const NAV_ITEMS: Array<{ id: string; label: string; icon: EvoIconName }> = [
  { id: "agency", label: "Agencia", icon: "building" },
  { id: "team", label: "Usuarios", icon: "users" },
  { id: "permissions", label: "Permisos", icon: "sliders" },
  { id: "billing", label: "Facturacion", icon: "wallet" },
  { id: "integrations", label: "Integraciones", icon: "clip" },
];

export function EvoSettings({ fixture }: { fixture: SettingsFixture }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Configuracion</h1>
          <div className="sub">
            Agencia, usuarios y RBAC · {fixture.agency.name}
          </div>
        </div>
        <div className="actions">
          <span
            className="btn outline"
            data-testid="admin-next-settings-readonly"
          >
            <EvoIcon name="check" size={15} /> Solo lectura
          </span>
          <span className="btn primary" data-testid="admin-next-settings-save">
            <EvoIcon name="edit" size={15} /> Guardar cambios
          </span>
        </div>
      </div>

      <div className="set-grid" data-testid="admin-next-settings-root">
        <aside className="card set-nav" data-testid="admin-next-settings-nav">
          <div className="nav-label">Cuenta</div>
          {NAV_ITEMS.map((item, index) => (
            <a
              className={`set-item${index === 0 ? " on" : ""}`}
              href={`#${item.id}`}
              key={item.id}
            >
              <EvoIcon name={item.icon} size={15} />
              <span>{item.label}</span>
            </a>
          ))}
        </aside>

        <main className="set-body">
          <section className="set-col">
            <AgencyCard fixture={fixture} />
            <UsersCard users={fixture.users} />
          </section>
          <section className="set-col">
            <SignalsCard signals={fixture.signals} />
            <PermissionMatrix rows={fixture.permissionMatrix} />
            <IntegrationsCard fixture={fixture} />
          </section>
        </main>
      </div>
    </>
  );
}

function AgencyCard({ fixture }: { fixture: SettingsFixture }) {
  return (
    <section className="card" data-testid="admin-next-settings-agency">
      <div className="card-head">
        <div className="logo-tile">{initials(fixture.agency.name)}</div>
        <div className="grow">
          <h3>{fixture.agency.name}</h3>
          <div className="sub">{fixture.agency.website}</div>
        </div>
      </div>
      <div className="kvgrid">
        <KeyValue label="Estado" value={fixture.agency.status ?? "Activo"} />
        <KeyValue label="NIT" value={fixture.agency.taxId ?? "Sin NIT"} />
        <KeyValue label="Idioma" value={fixture.agency.locale} />
        <KeyValue label="Moneda" value={fixture.agency.currency} />
        <KeyValue label="Correo" value={fixture.agency.email ?? "Sin correo"} />
        <KeyValue
          label="Telefono"
          value={fixture.agency.phone ?? "Sin telefono"}
        />
      </div>
    </section>
  );
}

function UsersCard({ users }: { users: SettingsUser[] }) {
  return (
    <section className="card" data-testid="admin-next-settings-team">
      <div className="card-head">
        <h3>Usuarios y roles</h3>
      </div>
      {users.length > 0 ? (
        users.map((user) => (
          <div
            className="user-row"
            data-testid={`admin-next-settings-user-${user.id}`}
            key={user.id}
          >
            <div className="av s32">{initials(user.name)}</div>
            <div className="grow">
              <b>{user.name}</b>
              <span>
                {user.email} · {user.lastActivity}
              </span>
            </div>
            <span
              className={
                user.status === "Activo" ? "chip green" : "chip orange"
              }
            >
              {user.status}
            </span>
            <span className="chip purple">{user.role}</span>
          </div>
        ))
      ) : (
        <EvoDataState
          kind="empty"
          title="Sin usuarios visibles"
          description="No hay usuarios activos retornados para esta cuenta. Revisa el filtro de rol o la sincronizacion de permisos."
          testId="admin-next-settings-users-empty"
        />
      )}
    </section>
  );
}

function SignalsCard({ signals }: { signals: SettingsSignal[] }) {
  return (
    <section className="card" data-testid="admin-next-settings-signals">
      <div className="card-head">
        <h3>Gates de configuracion</h3>
      </div>
      {signals.map((signal) => (
        <div
          className="trow"
          data-testid={`admin-next-settings-signal-${signal.id}`}
          key={signal.id}
        >
          <div className="svc-ico">
            <EvoIcon name="spark" size={15} />
          </div>
          <div className="grow">
            <b>{signal.label}</b>
            <span>{signal.detail}</span>
          </div>
          <span className={chipClass(signal.tone)}>{signal.tone}</span>
        </div>
      ))}
    </section>
  );
}

function PermissionMatrix({ rows }: { rows: SettingsPermissionRow[] }) {
  return (
    <section className="card" data-testid="admin-next-settings-permissions">
      <div className="card-head">
        <h3>Matriz RBAC</h3>
      </div>
      {rows.length > 0 ? (
        <>
          <div className="mx-row mx-head">
            <div className="perm">Permiso</div>
            <div className="mx">Admin</div>
            <div className="mx">Agent</div>
            <div className="mx">Contab.</div>
          </div>
          {rows.map((row) => (
            <div
              className="mx-row"
              data-testid={`admin-next-settings-permission-${row.id}`}
              key={row.id}
            >
              <div className="perm">
                <b>{row.permission}</b>
                <span>{row.category}</span>
              </div>
              <PermissionValue value={row.admin} />
              <PermissionValue value={row.agent} />
              <PermissionValue value={row.accounting} />
            </div>
          ))}
        </>
      ) : (
        <EvoDataState
          kind="empty"
          title="Sin matriz RBAC"
          description="No hay roles activos suficientes para construir permisos admin, agent y accounting."
          testId="admin-next-settings-permissions-empty"
        />
      )}
    </section>
  );
}

function IntegrationsCard({ fixture }: { fixture: SettingsFixture }) {
  return (
    <section className="card" data-testid="admin-next-settings-integrations">
      <div className="card-head">
        <h3>Integraciones</h3>
      </div>
      {fixture.integrations.map((integration) => (
        <div className="trow" key={integration.id}>
          <div className="svc-ico">
            <EvoIcon name="clip" size={15} />
          </div>
          <div className="grow">
            <b>{integration.name}</b>
            <span>{integration.detail}</span>
          </div>
          <span className="chip teal">{integration.status}</span>
        </div>
      ))}
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}

function PermissionValue({ value }: { value: boolean }) {
  return <div className={`mx ${value ? "y" : "n"}`}>{value ? "Si" : "No"}</div>;
}

function initials(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "B";
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function chipClass(tone: SettingsSignal["tone"]): string {
  switch (tone) {
    case "success":
      return "chip green";
    case "warning":
      return "chip orange";
    case "danger":
      return "chip red";
    case "live":
      return "chip teal";
    default:
      return "chip purple";
  }
}
