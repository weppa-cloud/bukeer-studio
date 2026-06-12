import Link from "next/link";
import type {
  ContactDetail,
  ContactSignal,
  ContactTimelineItem,
} from "@/lib/admin-next/fixtures/contacts";
import { EvoIcon } from "./icons";

const TONE_AVATAR: Record<string, string> = {
  primary: "",
  live: "teal",
  warning: "orange",
  success: "green",
};

const TONE_CHIP: Record<string, string> = {
  primary: "chip purple",
  live: "chip teal",
  warning: "chip orange",
  success: "chip green",
};

export function EvoContactDetail({ detail }: { detail: ContactDetail }) {
  const contact = detail.contact;

  return (
    <>
      <div className="page-head">
        <div>
          <Link className="linklike" href="/admin/contacts">
            <EvoIcon name="back" size={14} /> Contactos
          </Link>
          <h1>{contact.name}</h1>
          <div className="sub">
            {contact.badges.join(" · ")} · {contact.lastActivity}
          </div>
        </div>
        <div className="actions">
          <a className="btn outline" data-testid="admin-next-contact-email" href={`mailto:${contact.email}`}>
            <EvoIcon name="mail" size={15} /> Email
          </a>
          <a className="btn primary" data-testid="admin-next-contact-phone" href={`tel:${contact.phone}`}>
            <EvoIcon name="phone" size={15} /> Llamar
          </a>
        </div>
      </div>

      <section className="iti-hero" data-testid="admin-next-contact-detail">
        <div className={`av s54 ${TONE_AVATAR[contact.tone] ?? ""}`}>{contact.initials}</div>
        <div>
          <div className="mchips">
            {contact.badges.map((badge, index) => (
              <span className={badge === "Proveedor" ? "chip teal" : "chip orange"} key={`${badge}-${index}`}>
                {badge}
              </span>
            ))}
          </div>
          <h2>{contact.name}</h2>
          <p>
            {contact.email} · {contact.phone}
          </p>
        </div>
        <div className="stat">
          <div className="k">Itinerarios</div>
          <div className="v">{contact.itineraries}</div>
        </div>
        <div className="stat">
          <div className="k">Saldo</div>
          <div className="v green">{contact.openBalance}</div>
        </div>
        <div className="stat">
          <div className="k">Ventas</div>
          <div className="v">{contact.totalSales}</div>
        </div>
      </section>

      <div className="iti-grid">
        <section className="card" data-testid="admin-next-contact-profile">
          <div className="card-head">
            <h3>Perfil</h3>
          </div>
          <div className="kvgrid">
            {detail.profile.map((item) => (
              <div className="kv" key={item.label}>
                <div className="k">{item.label}</div>
                <div className="v">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card" data-testid="admin-next-contact-signals">
          <div className="card-head">
            <h3>Señales CRM</h3>
          </div>
          {detail.signals.map((signal) => (
            <SignalRow key={signal.id} signal={signal} />
          ))}
        </section>

        <section className="card" data-testid="admin-next-contact-itineraries">
          <div className="card-head">
            <h3>Historial comercial</h3>
          </div>
          {detail.itineraries.length > 0 ? (
            detail.itineraries.map((item) => (
              <TimelineRow item={item} key={item.id} />
            ))
          ) : (
            <div className="empty-card" data-testid="admin-next-contact-itineraries-empty">
              Sin itinerarios relacionados en Supabase.
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function SignalRow({ signal }: { signal: ContactSignal }) {
  return (
    <div className="trow" data-testid={`admin-next-contact-signal-${signal.id}`}>
      <div className="svc-ico">
        <EvoIcon name="spark" size={15} />
      </div>
      <div className="grow">
        <b>{signal.label}</b>
        <span>{signal.detail}</span>
      </div>
      <span className={TONE_CHIP[signal.tone] ?? "chip purple"}>{signal.tone}</span>
    </div>
  );
}

function TimelineRow({ item }: { item: ContactTimelineItem }) {
  const content = (
    <>
      <div className="svc-ico">
        <EvoIcon name="route" size={15} />
      </div>
      <div className="grow">
        <b>{item.title}</b>
        <span>{item.meta}</span>
      </div>
      <div className="amt">
        {item.amount}
        <span>{item.status}</span>
      </div>
    </>
  );

  if (item.id.startsWith("payment-")) {
    return (
      <div className="trow" data-testid={`admin-next-contact-timeline-${item.id}`}>
        {content}
      </div>
    );
  }

  return (
    <Link
      className="trow"
      data-testid={`admin-next-contact-timeline-${item.id}`}
      href={`/admin/itineraries/${item.id}`}
    >
      {content}
    </Link>
  );
}
