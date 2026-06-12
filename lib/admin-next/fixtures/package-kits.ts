export type PackageKitStatus = "active" | "draft" | "archived";
export type PackageKitTone = "primary" | "success" | "warning" | "live";

export type PackageKitSummary = {
  id: string;
  name: string;
  slug: string;
  status: PackageKitStatus;
  category: string;
  destination: string;
  durationLabel: string;
  priceLabel: string;
  versionLabel: string;
  usageLabel: string;
  sourceLabel: string;
  updatedLabel: string;
  tone: PackageKitTone;
};

export type PackageKitSignal = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: PackageKitTone;
};

export type PackageKitsFixture = {
  kits: PackageKitSummary[];
  selected: PackageKitSummary & {
    description: string;
    inclusions: string[];
    highlights: string[];
    pricing: Array<{
      id: string;
      label: string;
      value: string;
      detail: string;
    }>;
    version: {
      id: string;
      label: string;
      number: string;
      passengers: string;
      margin: string;
      locked: string;
    };
  };
  signals: PackageKitSignal[];
};

export const packageKitsFixture: PackageKitsFixture = {
  kits: [
    {
      id: "kit-001",
      name: "San Andres familiar",
      slug: "san-andres-familiar",
      status: "active",
      category: "standard",
      destination: "San Andres",
      durationLabel: "5 dias / 4 noches",
      priceLabel: "$4.600.000 pp",
      versionLabel: "Base v3",
      usageLabel: "7 usos",
      sourceLabel: "Desde IT-2647",
      updatedLabel: "Actualizado hoy",
      tone: "success",
    },
    {
      id: "kit-002",
      name: "Cartagena premium",
      slug: "cartagena-premium",
      status: "draft",
      category: "premium",
      destination: "Cartagena",
      durationLabel: "4 dias / 3 noches",
      priceLabel: "$6.200.000 pp",
      versionLabel: "Draft v1",
      usageLabel: "0 usos",
      sourceLabel: "Manual",
      updatedLabel: "Hace 2 dias",
      tone: "warning",
    },
  ],
  selected: {
    id: "kit-001",
    name: "San Andres familiar",
    slug: "san-andres-familiar",
    status: "active",
    category: "standard",
    destination: "San Andres",
    durationLabel: "5 dias / 4 noches",
    priceLabel: "$4.600.000 pp",
    versionLabel: "Base v3",
    usageLabel: "7 usos",
    sourceLabel: "Desde IT-2647",
    updatedLabel: "Actualizado hoy",
    tone: "success",
    description:
      "Paquete reutilizable con hotel, traslados y experiencia familiar.",
    highlights: ["Hotel familiar", "Traslados incluidos", "Pago por cuotas"],
    inclusions: ["Alojamiento", "Traslados aeropuerto", "Asesoria Bukeer"],
    pricing: [
      {
        id: "pp",
        label: "Precio por persona",
        value: "$4.600.000",
        detail: "Moneda base COP",
      },
      {
        id: "total",
        label: "Total version",
        value: "$18.400.000",
        detail: "4 pasajeros",
      },
    ],
    version: {
      id: "version-001",
      label: "Base v3",
      number: "v3",
      passengers: "4 pax",
      margin: "18%",
      locked: "FX bloqueado",
    },
  },
  signals: [
    {
      id: "active",
      label: "Activos",
      value: "1",
      detail: "Listos para aplicar a itinerario",
      tone: "success",
    },
    {
      id: "draft",
      label: "Borradores",
      value: "1",
      detail: "Requieren revision antes de aplicar",
      tone: "warning",
    },
    {
      id: "versions",
      label: "Versiones",
      value: "2",
      detail: "Snapshots de precio/version",
      tone: "primary",
    },
  ],
};
