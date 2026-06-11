// Productos Evolución — port exacto del prototipo (bukeer-screens.js products()).
// Tabs por categoría (Hoteles/Actividades/Vuelos/Traslados), búsqueda + filtros, grid de cards.

import type { ProductsFixture } from '@/lib/admin-next/fixtures/products';
import { EvoIcon, type EvoIconName } from './icons';

const CATEGORY_ICONS: Record<string, EvoIconName> = {
  hotels: 'bed',
  activities: 'ticket',
  flights: 'plane',
  transfers: 'car',
};

const TYPE_ICONS: Record<string, EvoIconName> = {
  Hotel: 'bed',
  Actividad: 'ticket',
  Vuelo: 'plane',
  Traslado: 'car',
};

export function EvoProducts({ fixture, subtitle }: { fixture: ProductsFixture; subtitle: string }) {
  const tabs = fixture.categories.filter((category) => category.key !== 'all');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Productos</h1>
          <div className="sub">{subtitle}</div>
        </div>
        <div className="actions">
          <span className="btn outline" data-testid="admin-next-products-filters">
            <EvoIcon name="sliders" size={14} /> Filtros
          </span>
          <span className="btn primary" data-testid="admin-next-products-new">
            <EvoIcon name="plus" size={15} /> Nuevo producto
          </span>
        </div>
      </div>

      <div className="ptabs" data-testid="admin-next-products-tabs">
        {tabs.map((category, index) => (
          <span
            key={category.key}
            className={`ptab${index === 0 ? ' on' : ''}`}
            data-testid={`admin-next-products-tab-${category.key}`}
          >
            <EvoIcon name={CATEGORY_ICONS[category.key] ?? 'box'} size={15} /> {category.label} ·{' '}
            {category.count}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div className="searchbox" style={{ width: 340 }} data-testid="admin-next-products-search">
          <EvoIcon name="search" size={15} />
          <span>Buscar hotel, ciudad o proveedor…</span>
        </div>
        <span className="fchip">
          <EvoIcon name="pin" size={12} /> Ciudad <EvoIcon name="chevD" size={12} />
        </span>
        <span className="fchip">
          Proveedor <EvoIcon name="chevD" size={12} />
        </span>
        <span className="fchip">
          Tarifa <EvoIcon name="chevD" size={12} />
        </span>
      </div>

      <div className="prod-grid" data-testid="admin-next-products-grid">
        {fixture.products.map((product) => (
          <div key={product.id} className="card prod-card" data-testid={`admin-next-product-${product.id}`}>
            <div className="prod-img">
              <div className="ph">
                <EvoIcon name={TYPE_ICONS[product.type] ?? 'bed'} size={34} />
              </div>
              <span className="chip green tagtop">{product.status}</span>
            </div>
            <div className="prod-body">
              <div className="nm">
                <b>{product.name}</b>
                <span className="rate">
                  <EvoIcon name="star" size={13} /> {product.rating}
                </span>
              </div>
              <div className="loc">
                <EvoIcon name="pin" size={13} />
                <span>{product.location}</span>
              </div>
              <div className="feats">
                {product.features.map((feature) => (
                  <span key={feature} className="chip">
                    {feature}
                  </span>
                ))}
              </div>
              <div className="foot">
                <span className="from">Desde</span>
                <span className="price">{product.fromPrice}</span>
                <span className="per">/ {product.priceUnit}</span>
                <span className="chip prov">{product.provider}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
