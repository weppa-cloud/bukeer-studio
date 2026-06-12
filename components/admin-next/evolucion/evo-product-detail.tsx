import Link from "next/link";
import type {
  ProductCatalogResolution,
  ProductDetail,
  ProductGalleryImage,
  ProductRate,
  ProductSignal,
} from "@/lib/admin-next/fixtures/products";
import { EvoIcon, type EvoIconName } from "./icons";

const TYPE_ICONS: Record<string, EvoIconName> = {
  Hotel: "bed",
  Hoteles: "bed",
  Actividad: "ticket",
  Actividades: "ticket",
  Vuelo: "plane",
  Vuelos: "plane",
  Traslado: "car",
  Traslados: "car",
};

export function EvoProductDetail({ detail }: { detail: ProductDetail }) {
  const product = detail.selected;
  const iconName = TYPE_ICONS[product.type] ?? "box";
  const heroImage = product.galleryImages[0];

  return (
    <>
      <div className="page-head">
        <div>
          <Link className="linklike" href="/admin/products">
            <EvoIcon name="back" size={14} /> Productos
          </Link>
          <h1>{product.name}</h1>
          <div className="sub">
            {product.type} · {product.location} · {product.provider}
          </div>
        </div>
        <div className="actions">
          <span className="btn outline" data-testid="admin-next-product-resolve">
            <EvoIcon name="spark" size={15} /> Resolver catálogo
          </span>
          <span className="btn primary" data-testid="admin-next-product-edit">
            <EvoIcon name="plus" size={15} /> Editar
          </span>
        </div>
      </div>

      <section className="iti-hero" data-testid="admin-next-product-detail">
        <div className="svc-ico">
          <EvoIcon name={iconName} size={20} />
        </div>
        <div className="who">
          <b>{product.name}</b>
          <span>
            {product.code} · {product.masterCatalogStatus}
          </span>
          <div className="meta-chips">
            <span className="chip purple">{product.type}</span>
            <span className={product.rateState === "active" ? "chip green" : "chip orange"}>
              {product.status}
            </span>
          </div>
        </div>
        <div className="iti-stats">
          <div className="stat">
            <div className="k">Desde</div>
            <div className="v green">{product.fromPrice}</div>
          </div>
          <div className="stat">
            <div className="k">Rating</div>
            <div className="v">{product.rating}</div>
          </div>
          <div className="stat">
            <div className="k">Fotos</div>
            <div className="v">{product.imageCount}</div>
          </div>
        </div>
      </section>

      <div className="iti-grid">
        <section className="card pd-gallery" data-testid="admin-next-product-gallery">
          <div className="pd-main">
            {heroImage ? <ProductImage image={heroImage} /> : <EvoIcon name={iconName} size={44} />}
            <span className="chip green tagtop">{product.galleryStatus}</span>
            <span className="chip purple tagn">{heroImage?.source ?? "sin-fotos"}</span>
          </div>
          <div className="pd-thumbs">
            {product.galleryImages.length > 0
              ? product.galleryImages.slice(0, 4).map((image) => (
                  <div className="pd-thumb" key={image.url}>
                    <ProductImage image={image} />
                  </div>
                ))
              : [0, 1, 2, 3].map((index) => (
                  <div className="pd-thumb" key={index}>
                    <EvoIcon name={iconName} size={18} />
                  </div>
                ))}
          </div>
        </section>

        <section className="card" data-testid="admin-next-product-profile">
          <div className="card-head">
            <h3>Ficha operativa</h3>
          </div>
          <div className="kvgrid">
            <div className="kv">
              <div className="k">Proveedor</div>
              <div className="v">{product.provider}</div>
            </div>
            <div className="kv">
              <div className="k">Email</div>
              <div className="v">{product.providerEmail}</div>
            </div>
            <div className="kv">
              <div className="k">Ubicación</div>
              <div className="v">{product.location}</div>
            </div>
            <div className="kv">
              <div className="k">Tarifa base</div>
              <div className="v">
                {product.fromPrice} / {product.priceUnit}
              </div>
            </div>
          </div>
          <p className="sub" data-testid="admin-next-product-description">
            {product.description}
          </p>
        </section>

        <section className="card" data-testid="admin-next-product-rates">
          <div className="card-head">
            <h3>Tarifas</h3>
          </div>
          {detail.rates.length > 0 ? (
            detail.rates.map((rate) => <RateRow key={rate.id} rate={rate} />)
          ) : (
            <div className="empty-card" data-testid="admin-next-product-rates-empty">
              Sin tarifas activas para venta.
            </div>
          )}
        </section>

        <section className="card" data-testid="admin-next-product-catalog">
          <div className="card-head">
            <h3>Catálogo V2</h3>
          </div>
          {detail.catalogResolutions.slice(0, 3).map((resolution) => (
            <CatalogRow key={resolution.id} resolution={resolution} />
          ))}
        </section>

        <section className="card" data-testid="admin-next-product-signals">
          <div className="card-head">
            <h3>Señales</h3>
          </div>
          {detail.signals.map((signal) => (
            <SignalRow key={signal.id} signal={signal} />
          ))}
        </section>
      </div>
    </>
  );
}

function ProductImage({ image }: { image: ProductGalleryImage }) {
  return <img alt={image.alt} className="pd-photo" src={image.url} />;
}

function RateRow({ rate }: { rate: ProductRate }) {
  return (
    <div className="trow" data-testid={`admin-next-product-rate-${rate.id}`}>
      <div className="svc-ico">
        <EvoIcon name="card" size={15} />
      </div>
      <div className="grow">
        <b>{rate.name}</b>
        <span>{rate.detail}</span>
      </div>
      <div className="amt">
        {rate.sale}
        <span>
          costo {rate.cost} · margen {rate.margin}
        </span>
      </div>
    </div>
  );
}

function CatalogRow({ resolution }: { resolution: ProductCatalogResolution }) {
  return (
    <div className="trow" data-testid={`admin-next-product-catalog-${resolution.id}`}>
      <div className="svc-ico">
        <EvoIcon name="box" size={15} />
      </div>
      <div className="grow">
        <b>{resolution.sourceName}</b>
        <span>{resolution.masterName}</span>
      </div>
      <span className={resolution.action === "link" ? "chip green" : "chip orange"}>
        {resolution.confidence}
      </span>
    </div>
  );
}

function SignalRow({ signal }: { signal: ProductSignal }) {
  return (
    <div className="trow" data-testid={`admin-next-product-signal-${signal.id}`}>
      <div className="svc-ico">
        <EvoIcon name="spark" size={15} />
      </div>
      <div className="grow">
        <b>{signal.label}</b>
        <span>{signal.detail}</span>
      </div>
      <span className="chip purple">{signal.value}</span>
    </div>
  );
}
