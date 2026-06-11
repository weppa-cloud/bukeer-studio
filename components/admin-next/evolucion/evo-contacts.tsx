// Contactos Evolución — port exacto del prototipo (bukeer-screens.js contacts()).
// Grid 3 col de contact-cards con badges Cliente/Proveedor, búsqueda y filtros.

import type { ContactsFixture } from '@/lib/admin-next/fixtures/contacts';
import { EvoIcon } from './icons';

const TONE_AVATAR: Record<string, string> = {
  primary: '',
  live: 'teal',
  warning: 'orange',
  success: 'green',
};

function badgeChip(badge: string, index: number) {
  const isProvider = badge === 'Proveedor';
  const isClient = badge === 'Cliente';
  const className = isProvider ? 'chip teal' : isClient ? 'chip orange' : 'chip purple';
  return (
    <span key={`${badge}-${index}`} className={className}>
      {isProvider ? <EvoIcon name="building" size={11} /> : isClient ? <EvoIcon name="user" size={11} /> : null}{' '}
      {badge}
    </span>
  );
}

export function EvoContacts({ fixture, subtitle }: { fixture: ContactsFixture; subtitle: string }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Contactos</h1>
          <div className="sub">{subtitle}</div>
        </div>
        <div className="actions">
          <span className="btn outline" data-testid="admin-next-contacts-import">
            Importar CSV
          </span>
          <span className="btn primary" data-testid="admin-next-contacts-new">
            <EvoIcon name="plus" size={15} /> Nuevo contacto
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div className="searchbox" style={{ width: 340 }} data-testid="admin-next-contacts-search">
          <EvoIcon name="search" size={15} />
          <span>Buscar por nombre, email o teléfono…</span>
        </div>
        <div className="filterbar">
          <span className="fchip on">Todos</span>
          <span className="fchip">Clientes</span>
          <span className="fchip">Proveedores</span>
        </div>
      </div>

      <div className="contact-grid" data-testid="admin-next-contacts-grid">
        {fixture.contacts.map((contact) => (
          <div key={contact.id} className="card contact-card" data-testid={`admin-next-contact-${contact.id}`}>
            <div className="top">
              <div className={`av s40 ${TONE_AVATAR[contact.tone] ?? ''}`}>{contact.initials}</div>
              <div className="nm">
                <b>{contact.name}</b>
                <div className="badges">{contact.badges.map(badgeChip)}</div>
              </div>
              <span className="chev">
                <EvoIcon name="chevR" size={16} />
              </span>
            </div>
            <div className="row">
              <EvoIcon name="mail" size={14} />
              <span>{contact.email}</span>
            </div>
            <div className="row">
              <EvoIcon name="phone" size={14} />
              <span>{contact.phone}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
