export type AdminNextDataStateKind = "empty" | "error" | "permission";

export interface AdminNextDataStateCopy {
  kind: AdminNextDataStateKind;
  title: string;
  description: string;
}

export function buildAdminNextReadErrorState({
  area,
  error,
}: {
  area: string;
  error: unknown;
}): AdminNextDataStateCopy {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const isPermissionError =
    /permission|denied|forbidden|unauthori[sz]ed|rls/i.test(message);

  if (isPermissionError) {
    return {
      kind: "permission",
      title: `Permiso denegado en ${area}`,
      description:
        "Tu rol no tiene acceso de lectura suficiente para este flujo. Cambia de rol o solicita permisos antes de continuar.",
    };
  }

  return {
    kind: "error",
    title: `No se pudo cargar ${area}`,
    description:
      "El backend no respondio con datos validos. Reintenta la carga; la pantalla mantiene el shell operativo sin quedar en blanco.",
  };
}
