// Conversaciones Evolución — port exacto del prototipo (bukeer-screens.js conversations()).
// Layout 330px / 1fr / 300px: lista con filtros, hilo con composer + IA, panel CRM derecho.

import Link from 'next/link';
import type {
  ConversationChannel,
  ConversationsFixture,
  ConversationSummary,
} from '@/lib/admin-next/fixtures/conversations';
import { EvoIcon, type EvoIconName } from './icons';

const CHANNEL_BADGE: Record<ConversationChannel, { className: string; icon: EvoIconName }> = {
  whatsapp: { className: 'wa', icon: 'phone' },
  email: { className: 'mail', icon: 'mail' },
  web: { className: 'ig', icon: 'chat' },
};

const TONE_AVATAR: Record<string, string> = {
  primary: '',
  live: 'teal',
  warning: 'orange',
};

const TEMPERATURE_LABEL: Record<string, string> = {
  cold: 'Frío',
  warm: 'Tibio',
  hot: 'Caliente',
};

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function ConversationItem({
  conversation,
  active,
}: {
  conversation: ConversationSummary;
  active: boolean;
}) {
  const channel = CHANNEL_BADGE[conversation.channel];
  return (
    <div
      className={`conv-item${active ? ' active' : ''}`}
      data-testid={`admin-next-conversation-${conversation.id}`}
    >
      <div className={`av s40 ${TONE_AVATAR[conversation.tone] ?? ''}`}>
        {initialsOf(conversation.customerName)}
      </div>
      <div className="body">
        <div className="l1">
          <span className={`ch-badge ${channel.className}`}>
            <EvoIcon name={channel.icon} size={9} />
          </span>
          <b>{conversation.customerName}</b>
          <time>{conversation.lastMessageAt}</time>
        </div>
        <div className="snippet">{conversation.lastMessage}</div>
        <div className="l3">
          <span className="chip teal">{conversation.agencyLabel}</span>
          {conversation.unreadCount > 0 ? <span className="unread">{conversation.unreadCount}</span> : null}
        </div>
      </div>
    </div>
  );
}

export function EvoConversations({
  fixture,
  subtitle,
}: {
  fixture: ConversationsFixture;
  subtitle: string;
}) {
  const selected = fixture.selected;
  const channel = CHANNEL_BADGE[selected.channel];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Conversaciones</h1>
          <div className="sub">{subtitle}</div>
        </div>
        <div className="actions">
          <span className="btn outline">
            <EvoIcon name="sliders" size={14} /> Vista kanban
          </span>
          <span className="btn primary" data-testid="admin-next-conversations-new">
            <EvoIcon name="plus" size={15} /> Nueva
          </span>
        </div>
      </div>

      <div className="conv" data-testid="admin-next-conversations-layout">
        <div className="conv-list">
          <div className="conv-tools">
            <div className="searchbox">
              <EvoIcon name="search" size={15} />
              <span>Buscar conversación…</span>
            </div>
            <div className="filterbar">
              <span className="fchip on">Mías · {fixture.conversations.length}</span>
              <span className="fchip">Sin asignar</span>
              <span className="fchip">Todas</span>
            </div>
            <div className="filterbar">
              <span className="fchip">
                <span
                  className="dot"
                  style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--teal)' }}
                />{' '}
                Abiertas <EvoIcon name="chevD" size={11} />
              </span>
              <span className="fchip" style={{ marginLeft: 'auto' }}>
                <EvoIcon name="sliders" size={12} /> Filtros
              </span>
            </div>
          </div>
          <div className="conv-items">
            {fixture.conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === selected.id}
              />
            ))}
          </div>
        </div>

        <div className="thread">
          <div className="thread-head">
            <div className="av s32">{initialsOf(selected.customerName)}</div>
            <div className="who">
              <b>{selected.customerName}</b>
              <span>
                {selected.channel === 'whatsapp' ? 'WhatsApp' : selected.channel === 'email' ? 'Email' : 'Web'} ·{' '}
                {fixture.selected.crm.phone} · {selected.slaLabel}
              </span>
            </div>
            <div className="actions">
              <span className="chip teal">
                <span className="dot" />
                Abierta
              </span>
              <span className="btn outline" style={{ fontSize: 'var(--fs-xs)', padding: '5px 11px' }}>
                <EvoIcon name="check2" size={13} /> Resolver
              </span>
              <span className="iconbtn">
                <EvoIcon name="more" size={16} />
              </span>
            </div>
          </div>
          <div className="msgs">
            <div className="daysep">Hoy</div>
            {selected.messages.map((message) =>
              message.author === 'assistant' ? (
                <div key={message.id} className="msg note">
                  <EvoIcon name="spark" size={13} /> {message.body}
                </div>
              ) : (
                <div key={message.id} className={`msg ${message.author === 'customer' ? 'in' : 'out'}`}>
                  {message.body}
                  {message.author === 'agent' ? (
                    <div className="mt">
                      <EvoIcon name="check2" size={13} /> {message.timestamp}
                    </div>
                  ) : null}
                </div>
              ),
            )}
          </div>
          <div className="composer">
            <div className="hint">Escribe una respuesta…</div>
            <div className="tools">
              <EvoIcon name="clip" size={16} />
              <span style={{ width: 10 }} />
              <EvoIcon name="box" size={16} />
              <span style={{ width: 10 }} />
              <EvoIcon name="mic" size={16} />
              <span className="sep" />
              <span className="ai-pill">
                <EvoIcon name="spark" size={13} /> Asistente IA
              </span>
              <div className="send">
                <span className="chip">Responder</span>
                <div className="sendbtn">
                  <EvoIcon name="send" size={15} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="crm-panel">
          <div className="panel-sec" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="av s40">{initialsOf(selected.customerName)}</div>
            <div style={{ minWidth: 0 }}>
              <b style={{ fontWeight: 500, display: 'block' }}>{selected.customerName}</b>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)' }}>
                {selected.agencyLabel} · {fixture.selected.crm.phone}
              </span>
            </div>
            <Link
              href="/admin/contacts"
              className="linklike"
              style={{ marginLeft: 'auto', flex: 'none' }}
            >
              Ver
            </Link>
          </div>

          <div className="panel-sec">
            <h4>Asignación</h4>
            <div className="panel-kv">
              <div className="av s24">{initialsOf(selected.owner)}</div>
              <span>{selected.owner}</span>
            </div>
            <div className="panel-kv">
              <EvoIcon name="users" size={14} />
              <span>Equipo: Ventas · asignación automática</span>
            </div>
          </div>

          <div className="panel-sec">
            <h4>Calificación del lead</h4>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 9 }}>
              {(['cold', 'warm', 'hot'] as const).map((temperature) => (
                <span
                  key={temperature}
                  className={`fchip${selected.temperature === temperature ? ' on' : ''}`}
                  style={{ padding: '4px 11px' }}
                >
                  {temperature === 'hot' ? <EvoIcon name="spark" size={11} /> : null}{' '}
                  {TEMPERATURE_LABEL[temperature]}
                </span>
              ))}
            </div>
            <div className="panel-kv">
              <EvoIcon name="trend" size={14} />
              <span>Valor estimado: {selected.valueLabel}</span>
            </div>
            <span
              className="btn primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              data-testid="admin-next-conversations-new-request"
            >
              <EvoIcon name="plus" size={14} /> Crear solicitud
            </span>
          </div>

          <div className="panel-sec">
            <h4>Itinerario vinculado</h4>
            <Link href="/admin/itineraries" className="iti-mini" style={{ display: 'block' }}>
              <b>{fixture.selected.linkedItinerary.title}</b>
              <div className="sub">
                {fixture.selected.linkedItinerary.id} · {fixture.selected.linkedItinerary.state}
              </div>
              <div className="progress">
                <i style={{ width: '45%' }} />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 7,
                  fontSize: 'var(--fs-xs)',
                  color: 'var(--text3)',
                }}
              >
                <span>{fixture.selected.linkedItinerary.state}</span>
                <b style={{ color: 'var(--text2)', fontWeight: 500 }}>{selected.valueLabel}</b>
              </div>
            </Link>
          </div>

          <div className="panel-sec">
            <h4>Etiquetas</h4>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="chip teal">{selected.agencyLabel}</span>
              <span className="chip purple">{selected.itineraryId}</span>
              <span className="chip orange">{selected.slaLabel}</span>
            </div>
          </div>

          <div className="panel-sec">
            <h4>Notas</h4>
            {fixture.selected.notes.map((note) => (
              <div
                key={note.id}
                style={{ fontSize: 'var(--fs-sm)', color: 'var(--text2)', lineHeight: 1.5 }}
              >
                {note.body}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
