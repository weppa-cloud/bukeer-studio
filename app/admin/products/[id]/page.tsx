import type { ReactNode } from "react";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import { EvoProductDetail } from "@/components/admin-next/evolucion/evo-product-detail";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { buildAdminNextReadErrorState } from "@/lib/admin-next/evolucion-state";
import { getAdminNextDataSourceMode } from "@/lib/admin-next/flags";
import {
  createProductsAdapter,
  type AdminNextProductsReadonlySupabaseClient,
} from "@/lib/admin-next/products-adapter";
import { requireAdminNextSession } from "@/lib/admin-next/route-boundary";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Detalle de producto | Bukeer Admin Next",
};

export default async function AdminNextProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAdminNextSession({
    nextPath: `/admin/products/${id}`,
  });
  const requestedDataSourceMode = getAdminNextDataSourceMode();
  const dataSourceMode =
    requestedDataSourceMode === "readonly" &&
    session.flags.adminNextBetaReadonly
      ? "readonly"
      : "fixture";
  let content: ReactNode;

  try {
    const adapter =
      dataSourceMode === "readonly"
        ? createProductsAdapter({
            mode: "readonly",
            supabase:
              (await createSupabaseServerClient()) as unknown as AdminNextProductsReadonlySupabaseClient,
            accountId: session.accountId,
          })
        : createProductsAdapter(dataSourceMode);
    const detail = await adapter.getProductDetail(id);

    content = detail ? (
      <EvoProductDetail detail={detail} />
    ) : (
      <EvoDataState
        kind="empty"
        title="Producto no encontrado"
        description="Este producto no existe para la cuenta actual o ya no esta disponible en el catalogo compartido."
        actionHref="/admin/products"
        actionLabel="Volver al catalogo"
        testId="admin-next-product-detail-empty"
      />
    );
  } catch (error) {
    const state = buildAdminNextReadErrorState({
      area: "el detalle de producto",
      error,
    });
    content = (
      <EvoDataState
        {...state}
        actionHref={`/admin/products/${id}`}
        actionLabel="Reintentar"
        testId="admin-next-product-detail-error"
      />
    );
  }

  return (
    <EvoShell
      userName={session.displayName}
      accountLabel={session.email}
      role={session.role}
      activeKey="products"
    >
      {content}
    </EvoShell>
  );
}
