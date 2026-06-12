import type {
  AccountFixture,
  AccountInfoItem,
  AccountPreference,
} from "@/lib/admin-next/fixtures/account";
import { EvoDataState } from "./evo-data-state";
import { EvoIcon, type EvoIconName } from "./icons";

const SECURITY_ICONS: EvoIconName[] = ["sliders", "check", "clock"];
const PREFERENCE_ICONS: EvoIconName[] = ["sliders", "spark"];

export function EvoAccount({ fixture }: { fixture: AccountFixture }) {
  const profile = fixture.profile;

  if (!profile?.email) {
    return (
      <>
        <AccountHeader />
        <EvoDataState
          kind="empty"
          title="Sin perfil visible"
          description="No hay datos de perfil disponibles para esta sesion. La cuenta mantiene el shell operativo sin quedar en blanco."
          testId="admin-next-account-empty"
        />
      </>
    );
  }

  return (
    <>
      <AccountHeader />

      <section data-testid="admin-next-account-root">
        <section className="iti-hero" data-testid="admin-next-account-profile">
          <div className="av s54">{profile.initials}</div>
          <div>
            <div className="mchips">
              {profile.badges.map((badge) => (
                <span className="chip purple" key={badge}>
                  {badge}
                </span>
              ))}
            </div>
            <h2>{profile.name}</h2>
            <p>{profile.email}</p>
          </div>
          {profile.info.slice(0, 3).map((item) => (
            <div className="stat" key={item.id}>
              <div className="k">{item.label}</div>
              <div className="v">{item.value}</div>
            </div>
          ))}
        </section>

        <div className="iti-grid">
          <section className="iti-col">
            <section className="card">
              <div className="card-head">
                <h3>Perfil</h3>
                <span
                  className="btn outline"
                  data-testid="admin-next-account-edit-profile"
                >
                  <EvoIcon name="edit" size={15} /> Editar
                </span>
              </div>
              <div className="kvgrid">
                {profile.info.map((item) => (
                  <Metric item={item} key={item.id} />
                ))}
              </div>
            </section>

            <InfoPanel
              iconNames={SECURITY_ICONS}
              items={fixture.security}
              testId="admin-next-account-security"
              title="Seguridad"
            />

            <InfoPanel
              iconNames={PREFERENCE_ICONS}
              items={fixture.preferences}
              testId="admin-next-account-preferences"
              title="Preferencias"
            />
          </section>

          <section className="iti-col">
            <NotificationsPanel notifications={fixture.notifications} />
            <SignaturePanel signature={fixture.signature} />
          </section>
        </div>
      </section>
    </>
  );
}

function AccountHeader() {
  return (
    <div className="page-head">
      <div>
        <h1>Mi cuenta</h1>
        <div className="sub">Perfil personal, seguridad y preferencias</div>
      </div>
      <div className="actions">
        <span className="btn outline" data-testid="admin-next-account-sign-out">
          <EvoIcon name="back" size={15} /> Cerrar sesion
        </span>
      </div>
    </div>
  );
}

function InfoPanel({
  iconNames,
  items,
  testId,
  title,
}: {
  iconNames: EvoIconName[];
  items: AccountInfoItem[];
  testId: string;
  title: string;
}) {
  return (
    <section className="card" data-testid={testId}>
      <div className="card-head">
        <h3>{title}</h3>
      </div>
      {items.length > 0 ? (
        items.map((item, index) => (
          <article className="trow" key={item.id}>
            <div className="svc-ico">
              <EvoIcon name={iconNames[index] ?? "sliders"} size={15} />
            </div>
            <div className="grow">
              <b>{item.label}</b>
              <span>{item.value}</span>
            </div>
            <span className="chip">Cambiar</span>
          </article>
        ))
      ) : (
        <div className="empty-card">Sin datos visibles.</div>
      )}
    </section>
  );
}

function NotificationsPanel({
  notifications,
}: {
  notifications: AccountPreference[];
}) {
  return (
    <section className="card" data-testid="admin-next-account-notifications">
      <div className="card-head">
        <h3>Notificaciones</h3>
        <span className="chip teal">{notifications.length}</span>
      </div>
      {notifications.map((item) => (
        <article className="trow" key={item.id}>
          <div className="svc-ico">
            <EvoIcon name="bell" size={15} />
          </div>
          <div className="grow">
            <b>{item.label}</b>
            <span>{item.detail}</span>
          </div>
          <span className={item.enabled ? "chip green" : "chip"}>
            {item.enabled ? "Activa" : "Pausada"}
          </span>
        </article>
      ))}
    </section>
  );
}

function SignaturePanel({ signature }: { signature: string[] }) {
  return (
    <section className="card" data-testid="admin-next-account-signature">
      <div className="card-head">
        <h3>Firma en propuestas</h3>
        <span
          className="btn outline"
          data-testid="admin-next-account-edit-signature"
        >
          <EvoIcon name="edit" size={15} /> Editar
        </span>
      </div>
      <div className="empty-card">
        {signature.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}

function Metric({ item }: { item: AccountInfoItem }) {
  return (
    <div className="kv">
      <div className="k">{item.label}</div>
      <div className="v">{item.value}</div>
    </div>
  );
}
