import type { AdminNextDataStateKind } from "@/lib/admin-next/evolucion-state";
import { EvoIcon, type EvoIconName } from "./icons";

interface EvoDataStateProps {
  kind: AdminNextDataStateKind;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  testId: string;
}

const ICON_BY_KIND: Record<AdminNextDataStateKind, EvoIconName> = {
  empty: "search",
  error: "x",
  permission: "sliders",
};

export function EvoDataState({
  kind,
  title,
  description,
  actionHref,
  actionLabel,
  testId,
}: EvoDataStateProps) {
  return (
    <section
      className="card empty-card"
      data-state-kind={kind}
      data-testid={testId}
      role={kind === "error" || kind === "permission" ? "alert" : "status"}
    >
      <div className="eico">
        <EvoIcon name={ICON_BY_KIND[kind]} size={24} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionHref && actionLabel ? (
        <div className="eactions">
          <a className="btn outline" href={actionHref}>
            {actionLabel}
          </a>
        </div>
      ) : null}
    </section>
  );
}
