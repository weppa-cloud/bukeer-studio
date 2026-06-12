// Dashboard Evolución — port exacto del prototipo (bukeer-screens.js dashboard()).
// 4 KPIs · Ventas vs. costo · Cuentas por cobrar próximas · Ranking de vendedores · Actividad reciente.

import Link from 'next/link';
import type { DashboardFixture } from '@/lib/admin-next/fixtures/dashboard';
import { EvoIcon, type EvoIconName } from './icons';

const KPI_ICONS: Record<string, EvoIconName> = {
  'monthly-sales': 'trend',
  receivables: 'wallet',
  payables: 'card',
  itineraries: 'route',
};

const KPI_CHIP: Record<string, string> = {
  success: 'chip green',
  warning: 'chip orange',
  neutral: 'chip',
  live: 'chip teal',
};

const RECEIVABLE_CHIP: Record<string, string> = {
  danger: 'chip red',
  warning: 'chip orange',
  neutral: 'chip',
};

const ACTIVITY_ICON: Record<string, EvoIconName> = {
  success: 'check2',
  live: 'chat',
  warning: 'card',
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

export function EvoDashboard({ fixture, subtitle }: { fixture: DashboardFixture; subtitle: string }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <div className="sub">{subtitle}</div>
        </div>
        <div className="actions">
          <span className="fchip" data-testid="admin-next-dashboard-range">
            <EvoIcon name="cal" size={13} /> Últimos 30 días <EvoIcon name="chevD" size={12} />
          </span>
          <span className="btn primary" data-testid="admin-next-dashboard-new-itinerary">
            <EvoIcon name="plus" size={15} /> Nuevo itinerario
          </span>
        </div>
      </div>

      <div className="kpis" data-testid="admin-next-dashboard-kpis">
        {fixture.kpis.map((kpi) => (
          <div key={kpi.id} className="card kpi" data-testid={`admin-next-kpi-${kpi.id}`}>
            <div className="lbl">
              <EvoIcon name={KPI_ICONS[kpi.id] ?? 'trend'} size={15} />
              <span>{kpi.label}</span>
            </div>
            <div className="val">{kpi.value}</div>
            <div className="meta">
              <span className={KPI_CHIP[kpi.tone] ?? 'chip'}>{kpi.badge}</span>
              <span>{kpi.detail}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="dash-col">
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="card-head">
              <h3>Ventas vs. costo</h3>
              <div className="legend">
                <span>
                  <i style={{ background: 'var(--primary)' }} />
                  Ventas
                </span>
                <span>
                  <i style={{ background: 'var(--teal)' }} />
                  Costo
                </span>
              </div>
            </div>
            <div className="chart" style={{ flex: 1 }} data-testid="admin-next-dashboard-chart">
              {fixture.chart.map((month) => (
                <div key={month.month} className="bargroup">
                  <div className="bars">
                    <div className="bar" style={{ height: `${month.salesPct}%` }} />
                    <div className="bar b2" style={{ height: `${month.costPct}%` }} />
                  </div>
                  <div className="month">{month.month}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Cuentas por cobrar próximas</h3>
              <Link href="/admin/reports" className="linklike">
                Ver reporte
              </Link>
            </div>
            {fixture.receivables.map((row) => (
              <div key={row.id} className="trow" data-testid={`admin-next-receivable-${row.id}`}>
                <div className="av s32">{initialsOf(row.customer)}</div>
                <div className="grow">
                  <b>{row.customer}</b>
                  <span>{row.itinerary}</span>
                </div>
                <span className={RECEIVABLE_CHIP[row.tone] ?? 'chip'}>{row.status}</span>
                <div className="amt">
                  {row.amount}
                  <span>{row.due}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-col">
          <div className="card">
            <div className="card-head">
              <h3>Ranking de vendedores</h3>
              <Link href="/admin/reports" className="linklike">
                Ver reporte
              </Link>
            </div>
            {fixture.sellers.map((seller) => (
              <div key={seller.id} className="trow" data-testid={`admin-next-seller-${seller.id}`}>
                <div
                  style={{
                    width: 20,
                    flex: 'none',
                    textAlign: 'center',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 'var(--fs-sm)',
                    color: seller.rank === 1 ? 'var(--orange)' : 'var(--text3)',
                  }}
                >
                  {seller.rank}
                </div>
                <div className={`av s32 ${seller.rank === 2 ? 'teal' : seller.rank === 3 ? 'orange' : ''}`}>
                  {seller.initials}
                </div>
                <div className="grow">
                  <b>{seller.name}</b>
                  <div className="progress" style={{ marginTop: 5 }}>
                    <i style={{ width: `${seller.progress}%`, background: 'var(--primary)' }} />
                  </div>
                </div>
                <div className="amt">
                  {seller.total}
                  <span>{seller.progress}% de la meta</span>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ flex: 1 }}>
            <div className="card-head">
              <h3>Actividad reciente</h3>
            </div>
            {fixture.activity.map((item) => (
              <div key={item.id} className="trow" data-testid={`admin-next-activity-${item.id}`}>
                <div className="av s32 teal">
                  <EvoIcon name={ACTIVITY_ICON[item.tone] ?? 'check2'} size={15} />
                </div>
                <div className="grow">
                  <b>{item.label}</b>
                  <span>{item.meta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
