"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type {
  ReportDefinition,
  ReportId,
  ReportInsight,
  ReportRow,
  ReportsFixture,
  ReportTone,
} from "@/lib/admin-next/fixtures/reports";
import { EvoDataState } from "./evo-data-state";
import { EvoIcon } from "./icons";

const DEFAULT_REPORT: ReportId = "sales";

export function EvoReports({ fixture }: { fixture: ReportsFixture }) {
  const searchParams = useSearchParams();
  const reportParam = searchParams?.get("report") as ReportId | null;
  const rangeParam = searchParams?.get("range") ?? "90d";
  const selectedReport = useMemo(
    () =>
      fixture.reports.find((report) => report.id === reportParam) ??
      fixture.reports.find((report) => report.id === DEFAULT_REPORT) ??
      fixture.reports[0],
    [fixture.reports, reportParam],
  );

  if (!selectedReport) {
    return (
      <>
        <ReportsHeader rangeParam={rangeParam} />
        <EvoDataState
          kind="empty"
          title="Sin reportes disponibles"
          description="No hay datos financieros visibles para el rango seleccionado. Cambia el periodo o espera la sincronizacion del backend."
          testId="admin-next-reports-empty"
        />
      </>
    );
  }

  return (
    <>
      <ReportsHeader rangeParam={rangeParam} />

      <div className="filterbar" data-testid="admin-next-reports-filters">
        {fixture.ranges.map((range) => (
          <a
            className={`fchip${range.key === rangeParam ? " on" : ""}`}
            href={`/admin/reports?report=${selectedReport.id}&range=${range.key}`}
            key={range.key}
          >
            {range.label}
          </a>
        ))}
      </div>

      <section
        className="rep-grid"
        data-active-report={selectedReport.id}
        data-testid="admin-next-reports-root"
      >
        {fixture.reports.map((report) => (
          <ReportCard
            isActive={report.id === selectedReport.id}
            key={report.id}
            report={report}
            range={rangeParam}
          />
        ))}
      </section>

      <div className="iti-grid">
        <section className="card grp" data-testid="admin-next-reports-detail">
          <div className="grp-head">
            <div className="svc-ico">
              <EvoIcon name="trend" size={15} />
            </div>
            <div className="t">
              <b>{selectedReport.label}</b>
              <span>
                {selectedReport.description} <em>{selectedReport.delta}</em>
              </span>
            </div>
            <div className="amt2">
              <div className="v">{selectedReport.value}</div>
              <div className="k">Actual</div>
            </div>
          </div>
          <ChartRows chart={fixture.chart} />
        </section>

        <section className="card" data-testid="admin-next-reports-insights">
          <div className="card-head">
            <h3>Riesgos y gates</h3>
          </div>
          {fixture.insights.map((insight) => (
            <InsightRow insight={insight} key={insight.id} />
          ))}
          {fixture.aiSignals.map((signal) => (
            <InsightRow insight={signal} key={signal.id} />
          ))}
        </section>
      </div>

      <section className="card grp" data-testid="admin-next-reports-table">
        <div className="grp-head">
          <div className="svc-ico">
            <EvoIcon name="route" size={15} />
          </div>
          <div className="t">
            <b>Itinerarios relevantes</b>
            <span>Top de estados que explican el reporte seleccionado</span>
          </div>
        </div>
        {fixture.tableRows.map((row) => (
          <ReportRowItem key={row.id} row={row} />
        ))}
      </section>
    </>
  );
}

function ReportsHeader({ rangeParam }: { rangeParam: string }) {
  return (
    <div className="page-head">
      <div>
        <h1>Reportes</h1>
        <div className="sub">
          Hub financiero · ventas, rentabilidad, CxC y tesoreria · {rangeParam}
        </div>
      </div>
      <div className="actions">
        <span className="btn outline" data-testid="admin-next-reports-range">
          <EvoIcon name="cal" size={15} /> {rangeParam}
        </span>
        <span className="btn primary" data-testid="admin-next-reports-export">
          <EvoIcon name="download" size={15} /> Exportar CSV
        </span>
      </div>
    </div>
  );
}

function ReportCard({
  report,
  range,
  isActive,
}: {
  report: ReportDefinition;
  range: string;
  isActive: boolean;
}) {
  return (
    <a
      className={`card rep-card${isActive ? " on" : ""}`}
      data-active={isActive}
      data-testid={`admin-next-report-card-${report.id}`}
      href={`/admin/reports?report=${report.id}&range=${range}`}
    >
      <div className="top">
        <div className="svc-ico">
          <EvoIcon name={iconForReport(report.id)} size={15} />
        </div>
        <b>{report.label}</b>
        <span className="chev">
          <EvoIcon name="chevR" size={15} />
        </span>
      </div>
      <p>{report.description}</p>
      <div className="foot">
        <div className="amt2">
          <div className="v">{report.value}</div>
          <div className="k">{report.delta}</div>
        </div>
        <span className={chipClass(report.tone)}>{report.tone}</span>
      </div>
    </a>
  );
}

function ChartRows({ chart }: { chart: ReportsFixture["chart"] }) {
  return (
    <div className="grp-row">
      <div className="grow">
        {chart.map((point) => (
          <div className="hbar-row" key={point.label}>
            <div className="lbl">{point.label}</div>
            <div className="track">
              <i style={{ width: `${point.primaryPct}%` }} />
            </div>
            <div className="v">{point.primaryPct}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightRow({ insight }: { insight: ReportInsight }) {
  return (
    <div
      className="trow"
      data-testid={`admin-next-reports-signal-${insight.id}`}
    >
      <div className="svc-ico">
        <EvoIcon name="spark" size={15} />
      </div>
      <div className="grow">
        <b>{insight.label}</b>
        <span>{insight.detail}</span>
      </div>
      <span className={chipClass(insight.tone)}>{insight.value}</span>
    </div>
  );
}

function ReportRowItem({ row }: { row: ReportRow }) {
  return (
    <div className="grp-row" data-testid={`admin-next-reports-row-${row.id}`}>
      <div className="grow">
        <b>{row.label}</b>
        <span>
          {row.owner} · {row.status}
        </span>
      </div>
      <div className="amt">{row.amount}</div>
      <span className={chipClass(row.tone)}>{row.tone}</span>
    </div>
  );
}

function iconForReport(id: ReportId) {
  switch (id) {
    case "payments-treasury":
    case "receivables":
      return "wallet";
    case "response-time":
      return "clock";
    case "operations-suppliers":
      return "box";
    default:
      return "trend";
  }
}

function chipClass(tone: ReportTone): string {
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
