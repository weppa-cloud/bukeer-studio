"use client";

// Shell Evolución — port exacto del prototipo (design/evolucion-handoff · bukeer-screens.js shell()).
// Sidebar 232px: logo, nav con counts, side-foot con avatar. Topbar: searchbox ⌘K,
// toggle de tema, IA, notificaciones, avatar. Mismos flujos que Flutter (rutas /admin/*).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { EvoIcon, type EvoIconName } from "./icons";

export type EvoNavKey =
  | "dash"
  | "itis"
  | "conv"
  | "contacts"
  | "products"
  | "kits"
  | "pay"
  | "agenda"
  | "reports"
  | "config";

type EvoNavItem = {
  key: EvoNavKey;
  icon: EvoIconName;
  label: string;
  labelEn?: string;
  href: string;
  count?: string;
  keywords?: string;
  keywordsEn?: string;
  shortcut?: string;
};

const NAV_ITEMS: EvoNavItem[] = [
  {
    key: "dash",
    icon: "dash",
    label: "Dashboard",
    labelEn: "Dashboard",
    href: "/admin/dashboard",
    keywords: "inicio metricas ventas resumen",
    keywordsEn: "home metrics sales summary",
    shortcut: "D",
  },
  {
    key: "itis",
    icon: "route",
    label: "Itinerarios",
    labelEn: "Itineraries",
    href: "/admin/itineraries",
    count: "23",
    keywords:
      "viajes propuestas reservas servicios pasajeros pagos proveedores",
    keywordsEn:
      "trips proposals bookings services passengers payments suppliers",
    shortcut: "I",
  },
  {
    key: "conv",
    icon: "chat",
    label: "Conversaciones",
    labelEn: "Conversations",
    href: "/admin/conversations",
    count: "12",
    keywords: "crm chat chatwoot mensajes solicitudes leads",
    keywordsEn: "crm chat chatwoot messages requests leads",
    shortcut: "C",
  },
  {
    key: "contacts",
    icon: "users",
    label: "Contactos",
    labelEn: "Contacts",
    href: "/admin/contacts",
    keywords: "clientes proveedores personas agencias",
    keywordsEn: "customers suppliers people agencies",
    shortcut: "N",
  },
  {
    key: "products",
    icon: "box",
    label: "Productos",
    labelEn: "Products",
    href: "/admin/products",
    keywords: "catalogo hoteles actividades vuelos traslados tarifas",
    keywordsEn: "catalog hotels activities flights transfers rates",
    shortcut: "P",
  },
  {
    key: "kits",
    icon: "tag",
    label: "Package Kits",
    labelEn: "Package Kits",
    href: "/admin/package-kits",
    keywords: "paquetes versiones aplicar itinerario",
    keywordsEn: "packages versions apply itinerary",
    shortcut: "K",
  },
  {
    key: "pay",
    icon: "card",
    label: "Pagos",
    labelEn: "Payments",
    href: "/admin/payments",
    keywords: "tesoreria cobros cuotas clientes proveedores stripe",
    keywordsEn: "treasury collections installments customers suppliers stripe",
    shortcut: "G",
  },
  {
    key: "agenda",
    icon: "cal",
    label: "Agenda",
    labelEn: "Agenda",
    href: "/admin/agenda",
    keywords: "calendario servicios fechas hoy programados",
    keywordsEn: "calendar services dates today scheduled",
    shortcut: "A",
  },
  {
    key: "reports",
    icon: "trend",
    label: "Reportes",
    labelEn: "Reports",
    href: "/admin/reports",
    keywords: "ventas rentabilidad cxc cxp metricas csv",
    keywordsEn: "sales profitability receivables payables metrics csv",
    shortcut: "R",
  },
];

const COMMAND_ITEMS: EvoNavItem[] = [
  ...NAV_ITEMS,
  {
    key: "config",
    icon: "sliders",
    label: "Configuración",
    labelEn: "Settings",
    href: "/admin/settings",
    keywords: "cuenta usuarios rbac permisos perfil seguridad",
    keywordsEn: "account users rbac permissions profile security",
    shortcut: "S",
  },
];

const PATH_TO_KEY: Array<[string, EvoNavKey]> = [
  ["/admin/dashboard", "dash"],
  ["/admin/itineraries", "itis"],
  ["/admin/conversations", "conv"],
  ["/admin/contacts", "contacts"],
  ["/admin/products", "products"],
  ["/admin/package-kits", "kits"],
  ["/admin/payments", "pay"],
  ["/admin/agenda", "agenda"],
  ["/admin/reports", "reports"],
  ["/admin/settings", "config"],
];

const THEME_STORAGE_KEY = "bukeer-admin-evolucion-theme";
const NOTIFICATION_EVENT = "bukeer:evo-notification";
const LANGUAGE_STORAGE_KEY = "bukeer-admin-evolucion-language";
const CURRENCY_STORAGE_KEY = "bukeer-admin-evolucion-currency";
const MARKET_PREFERENCES_EVENT = "bukeer:evo-market-preferences";

export type EvoLanguage = "es" | "en";
export type EvoCurrency = "COP" | "USD";

export type EvoMarketPreferences = {
  currency: EvoCurrency;
  language: EvoLanguage;
};

type ShellCopy = {
  accountLabel: string;
  assistantTitle: string;
  closeNotifications: string;
  closeSearch: string;
  commandEmpty: string;
  commandFootOpen: string;
  commandFootNavigate: string;
  commandPlaceholder: string;
  commandSection: string;
  currencyLabel: string;
  languageLabel: string;
  markRead: string;
  marketPreviewLabel: string;
  newNotifications: (count: number) => string;
  notificationAria: (count: number) => string;
  notificationsTitle: string;
  searchAria: string;
  searchPlaceholder: string;
  searchTitle: string;
  themeTitle: string;
};

const SHELL_COPY: Record<EvoLanguage, ShellCopy> = {
  es: {
    accountLabel: "Cuenta",
    assistantTitle: "Asistente IA",
    closeNotifications: "Cerrar notificaciones",
    closeSearch: "Cerrar búsqueda",
    commandEmpty: "Sin resultados",
    commandFootOpen: "Enter para abrir",
    commandFootNavigate: "↑↓ para navegar",
    commandPlaceholder: "Buscar módulo o flujo...",
    commandSection: "Navegación",
    currencyLabel: "Moneda",
    languageLabel: "Idioma",
    markRead: "Marcar leídas",
    marketPreviewLabel: "Vista",
    newNotifications: (count) => `${count} nuevas`,
    notificationAria: (count) => `Notificaciones (${count} sin leer)`,
    notificationsTitle: "Notificaciones",
    searchAria: "Buscar itinerarios, contactos, reservas... ⌘K",
    searchPlaceholder: "Buscar itinerarios, contactos, reservas...",
    searchTitle: "Buscar itinerarios, contactos, reservas...",
    themeTitle: "Cambiar tema",
  },
  en: {
    accountLabel: "Account",
    assistantTitle: "AI assistant",
    closeNotifications: "Close notifications",
    closeSearch: "Close search",
    commandEmpty: "No results",
    commandFootOpen: "Enter to open",
    commandFootNavigate: "↑↓ to navigate",
    commandPlaceholder: "Search module or flow...",
    commandSection: "Navigation",
    currencyLabel: "Currency",
    languageLabel: "Language",
    markRead: "Mark read",
    marketPreviewLabel: "View",
    newNotifications: (count) => `${count} new`,
    notificationAria: (count) => `Notifications (${count} unread)`,
    notificationsTitle: "Notifications",
    searchAria: "Search itineraries, contacts, bookings... ⌘K",
    searchPlaceholder: "Search itineraries, contacts, bookings...",
    searchTitle: "Search itineraries, contacts, bookings...",
    themeTitle: "Toggle theme",
  },
};

export type EvoNotification = {
  id: string;
  title: string;
  description: string;
  meta: string;
  unread: boolean;
};

export type EvoNotificationEventDetail = Partial<
  Omit<EvoNotification, "id" | "unread">
> & {
  id?: string;
};

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function labelForRole(role: string, language: EvoLanguage): string {
  const labels: Record<string, Record<EvoLanguage, string>> = {
    accounting: { en: "Accounting", es: "Contabilidad" },
    admin: { en: "Admin", es: "Admin" },
    agent: { en: "Agent", es: "Agente" },
    owner: { en: "Owner", es: "Owner" },
    super_admin: { en: "Super admin", es: "Super admin" },
  };

  return labels[role]?.[language] ?? role;
}

export function normalizeMarketPreferences(
  input: Partial<EvoMarketPreferences> = {},
): EvoMarketPreferences {
  return {
    currency: input.currency === "USD" ? "USD" : "COP",
    language: input.language === "en" ? "en" : "es",
  };
}

export function formatMarketPreview({
  currency,
  language,
}: EvoMarketPreferences): string {
  const locale = language === "en" ? "en-US" : "es-CO";
  const amount = currency === "USD" ? 3100 : 12400000;

  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function readStoredMarketPreferences(): EvoMarketPreferences {
  if (typeof window === "undefined") return { currency: "COP", language: "es" };
  const storedCurrency = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

  return normalizeMarketPreferences({
    currency: storedCurrency === "USD" ? "USD" : "COP",
    language: storedLanguage === "en" ? "en" : "es",
  });
}

function labelForNavItem(item: EvoNavItem, language: EvoLanguage): string {
  return language === "en" ? (item.labelEn ?? item.label) : item.label;
}

export function buildInitialNotifications(
  role = "agent",
  language: EvoLanguage = "es",
): EvoNotification[] {
  const roleLabel = labelForRole(role, language);
  const roleScope =
    role === "accounting"
      ? language === "en"
        ? "Payments and reports enabled for financial review."
        : "Pagos y reportes habilitados para revision financiera."
      : role === "agent"
        ? language === "en"
          ? "Itineraries, contacts and agenda enabled for daily operations."
          : "Itinerarios, contactos y agenda habilitados para operacion diaria."
        : language === "en"
          ? "Full operation enabled according to backend permissions."
          : "Operacion completa habilitada segun permisos del backend.";

  return [
    {
      id: "ops-followup",
      title:
        language === "en" ? "Operational follow-up" : "Seguimiento operativo",
      description:
        language === "en"
          ? "Active itineraries require a next action."
          : "Hay itinerarios activos que requieren siguiente accion.",
      meta: language === "en" ? "Now" : "Ahora",
      unread: true,
    },
    {
      id: "agenda-sync",
      title: language === "en" ? "Agenda synchronized" : "Agenda sincronizada",
      description:
        language === "en"
          ? "Today's services are ready without reloading."
          : "Servicios de hoy listos para consulta sin recargar.",
      meta: "Realtime",
      unread: true,
    },
    {
      id: "rbac-scope",
      title: `RBAC · ${roleLabel}`,
      description: roleScope,
      meta: "Permisos",
      unread: false,
    },
  ];
}

function notificationFromEvent(
  detail: EvoNotificationEventDetail,
): EvoNotification | null {
  const title = detail.title?.trim();
  const description = detail.description?.trim();
  if (!title || !description) return null;

  return {
    id: detail.id?.trim() || `live-${Date.now()}`,
    title,
    description,
    meta: detail.meta?.trim() || "Ahora",
    unread: true,
  };
}

export function EvoShell({
  userName,
  accountLabel,
  role = "agent",
  activeKey,
  children,
}: {
  userName: string;
  accountLabel: string;
  role?: string;
  activeKey?: EvoNavKey;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [cmdSelectedIndex, setCmdSelectedIndex] = useState(0);
  const [marketPreferences, setMarketPreferences] =
    useState<EvoMarketPreferences>({ currency: "COP", language: "es" });
  const [marketPreferencesReady, setMarketPreferencesReady] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<EvoNotification[]>(() =>
    buildInitialNotifications(role, "es"),
  );
  const cmdInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDark(window.localStorage.getItem(THEME_STORAGE_KEY) === "dark");
  }, []);

  useEffect(() => {
    const stored = readStoredMarketPreferences();
    setMarketPreferences(stored);
    setNotifications(buildInitialNotifications(role, stored.language));
    setMarketPreferencesReady(true);
  }, [role]);

  useEffect(() => {
    if (!marketPreferencesReady) return;
    window.localStorage.setItem(
      LANGUAGE_STORAGE_KEY,
      marketPreferences.language,
    );
    window.localStorage.setItem(
      CURRENCY_STORAGE_KEY,
      marketPreferences.currency,
    );
    window.dispatchEvent(
      new CustomEvent<EvoMarketPreferences>(MARKET_PREFERENCES_EVENT, {
        detail: marketPreferences,
      }),
    );
  }, [marketPreferences, marketPreferencesReady]);

  useEffect(() => {
    function handleGlobalKeydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCmdOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setCmdOpen(false);
      }
    }

    window.addEventListener("keydown", handleGlobalKeydown);
    return () => window.removeEventListener("keydown", handleGlobalKeydown);
  }, []);

  useEffect(() => {
    if (!cmdOpen) return;
    setCmdQuery("");
    setCmdSelectedIndex(0);
    window.setTimeout(() => cmdInputRef.current?.focus(), 0);
  }, [cmdOpen]);

  useEffect(() => {
    function handleRealtimeNotification(event: Event) {
      const notification = notificationFromEvent(
        (event as CustomEvent<EvoNotificationEventDetail>).detail ?? {},
      );
      if (!notification) return;

      setNotifications((prev) => {
        const deduped = prev.filter((item) => item.id !== notification.id);
        return [notification, ...deduped].slice(0, 8);
      });
    }

    window.addEventListener(NOTIFICATION_EVENT, handleRealtimeNotification);
    return () =>
      window.removeEventListener(
        NOTIFICATION_EVENT,
        handleRealtimeNotification,
      );
  }, []);

  const toggleTheme = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      window.localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
      return next;
    });
  }, []);

  const updateMarketPreference = useCallback(
    <TKey extends keyof EvoMarketPreferences>(
      key: TKey,
      value: EvoMarketPreferences[TKey],
    ) => {
      setMarketPreferences((prev) => {
        const next = normalizeMarketPreferences({ ...prev, [key]: value });
        if (key === "language" && next.language !== prev.language) {
          setNotifications(buildInitialNotifications(role, next.language));
        }
        return next;
      });
    },
    [role],
  );

  const commandItems = useMemo(() => {
    const query = cmdQuery.trim().toLowerCase();
    const withLabels = COMMAND_ITEMS.map((item) => ({
      ...item,
      label: labelForNavItem(item, marketPreferences.language),
    }));

    if (!query) return withLabels;

    return withLabels.filter((item) => {
      const haystack =
        `${item.label} ${item.href} ${item.key} ${item.keywords ?? ""} ${item.keywordsEn ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [cmdQuery, marketPreferences.language]);

  useEffect(() => {
    setCmdSelectedIndex(0);
  }, [cmdQuery]);

  const navigateCommand = useCallback(
    (item: EvoNavItem) => {
      setCmdOpen(false);
      setCmdQuery("");
      router.push(item.href);
    },
    [router],
  );

  const handleCommandKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCmdSelectedIndex((prev) =>
          commandItems.length === 0 ? 0 : (prev + 1) % commandItems.length,
        );
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCmdSelectedIndex((prev) =>
          commandItems.length === 0
            ? 0
            : (prev - 1 + commandItems.length) % commandItems.length,
        );
      }
      if (event.key === "Enter" && commandItems[cmdSelectedIndex]) {
        event.preventDefault();
        navigateCommand(commandItems[cmdSelectedIndex]);
      }
    },
    [cmdSelectedIndex, commandItems, navigateCommand],
  );

  const active =
    activeKey ??
    PATH_TO_KEY.find(([prefix]) => pathname?.startsWith(prefix))?.[1] ??
    "dash";
  const initials = initialsOf(userName);
  const unreadNotifications = notifications.filter(
    (item) => item.unread,
  ).length;
  const copy = SHELL_COPY[marketPreferences.language];
  const marketPreview = formatMarketPreview(marketPreferences);

  return (
    <div
      className={`bk t-evo ${dark ? "dark" : "light"}`}
      data-testid="admin-next-evo-shell"
    >
      <div className="side">
        <Link
          href="/admin/dashboard"
          className="side-logo"
          data-testid="admin-next-evo-logo"
        >
          <div className="mark">b</div>
          <div className="word">bukeer</div>
        </Link>
        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`nav-item${item.key === active ? " active" : ""}`}
              data-testid={`admin-next-nav-${item.key}`}
            >
              <EvoIcon name={item.icon} size={17} />
              <span>{labelForNavItem(item, marketPreferences.language)}</span>
              {item.count ? <span className="count">{item.count}</span> : null}
            </Link>
          ))}
          <div className="nav-label">{copy.accountLabel}</div>
          <Link
            href="/admin/settings"
            className={`nav-item${active === "config" ? " active" : ""}`}
            data-testid="admin-next-nav-config"
          >
            <EvoIcon name="sliders" size={17} />
            <span>
              {marketPreferences.language === "en"
                ? "Settings"
                : "Configuración"}
            </span>
          </Link>
        </nav>
        <Link
          href="/admin/account"
          className="side-foot"
          data-testid="admin-next-evo-profile"
        >
          <div className="av s32">{initials}</div>
          <div className="who">
            <b>{userName}</b>
            <span>{accountLabel}</span>
          </div>
        </Link>
      </div>
      <div className="main">
        <div className="topbar">
          <button
            className="searchbox"
            type="button"
            onClick={() => setCmdOpen(true)}
            data-testid="admin-next-evo-cmdk"
          >
            <EvoIcon name="search" size={15} />
            <span>{copy.searchPlaceholder}</span>
            <span className="kbd">⌘K</span>
          </button>
          <div className="spacer" />
          <div
            className="market-switch"
            aria-label={`${copy.languageLabel} / ${copy.currencyLabel}`}
            data-testid="admin-next-market-switch"
          >
            <div className="seg" data-testid="admin-next-language-switch">
              {(["es", "en"] as EvoLanguage[]).map((language) => (
                <button
                  key={language}
                  type="button"
                  className={
                    language === marketPreferences.language ? "active" : ""
                  }
                  aria-pressed={language === marketPreferences.language}
                  onClick={() => updateMarketPreference("language", language)}
                  data-testid={`admin-next-language-${language}`}
                >
                  {language.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="seg" data-testid="admin-next-currency-switch">
              {(["COP", "USD"] as EvoCurrency[]).map((currency) => (
                <button
                  key={currency}
                  type="button"
                  className={
                    currency === marketPreferences.currency ? "active" : ""
                  }
                  aria-pressed={currency === marketPreferences.currency}
                  onClick={() => updateMarketPreference("currency", currency)}
                  data-testid={`admin-next-currency-${currency}`}
                >
                  {currency}
                </button>
              ))}
            </div>
            <span
              className="market-preview"
              data-testid="admin-next-market-preview"
            >
              {copy.marketPreviewLabel} {marketPreview}
            </span>
          </div>
          <button
            className="iconbtn"
            type="button"
            title={copy.themeTitle}
            onClick={toggleTheme}
            data-testid="admin-next-evo-theme-toggle"
          >
            <span className="ico-moon">
              <EvoIcon name="moon" size={17} />
            </span>
            <span className="ico-sun">
              <EvoIcon name="sun" size={17} />
            </span>
          </button>
          <button
            className="iconbtn"
            type="button"
            aria-label={copy.assistantTitle}
            title={copy.assistantTitle}
            data-testid="admin-next-evo-ai"
          >
            <EvoIcon name="spark" size={17} />
          </button>
          <button
            className="iconbtn"
            type="button"
            aria-label={copy.notificationAria(unreadNotifications)}
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen((prev) => !prev)}
            data-testid="admin-next-notifications"
          >
            <EvoIcon name="bell" size={17} />
            {unreadNotifications > 0 ? (
              <span
                className="ping"
                data-testid="admin-next-notifications-ping"
              />
            ) : null}
          </button>
          <Link
            href="/admin/account"
            className="av s32"
            data-testid="admin-next-evo-avatar"
          >
            {initials}
          </Link>
        </div>
        <div className="content">{children}</div>
      </div>
      {notificationsOpen ? (
        <>
          <button
            type="button"
            aria-label={copy.closeNotifications}
            className="notif-veil"
            data-testid="admin-next-notifications-veil"
            onClick={() => setNotificationsOpen(false)}
          />
          <aside
            aria-label={copy.notificationsTitle}
            aria-live="polite"
            className="notif-panel"
            data-testid="admin-next-notifications-panel"
          >
            <div className="notif-head">
              <EvoIcon name="bell" size={16} />
              <h3>{copy.notificationsTitle}</h3>
              <span
                className="notif-count"
                data-testid="admin-next-notifications-count"
              >
                {copy.newNotifications(unreadNotifications)}
              </span>
            </div>
            <div data-testid="admin-next-notifications-list">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`notif-item${item.unread ? " unread" : ""}`}
                  data-testid={`admin-next-notification-${item.id}`}
                >
                  {item.unread ? <span className="dotu" /> : null}
                  <div className="grow">
                    <b>{item.title}</b>
                    <span>{item.description}</span>
                    <em>{item.meta}</em>
                  </div>
                </div>
              ))}
            </div>
            <div className="notif-foot">
              <button
                type="button"
                className="notif-action"
                onClick={() =>
                  setNotifications((prev) =>
                    prev.map((item) => ({ ...item, unread: false })),
                  )
                }
                data-testid="admin-next-notifications-mark-read"
              >
                {copy.markRead}
              </button>
            </div>
          </aside>
        </>
      ) : null}
      {cmdOpen ? (
        <>
          <button
            type="button"
            aria-label={copy.closeSearch}
            className="cmdk-veil"
            data-testid="admin-next-cmdk-veil"
            onClick={() => setCmdOpen(false)}
          />
          <div
            className="cmdk"
            role="dialog"
            aria-modal="true"
            aria-label={copy.searchAria}
            data-testid="admin-next-cmdk-dialog"
          >
            <label className="cmdk-input" htmlFor="admin-next-cmdk-input">
              <EvoIcon name="search" size={16} />
              <input
                id="admin-next-cmdk-input"
                ref={cmdInputRef}
                value={cmdQuery}
                onChange={(event) => setCmdQuery(event.target.value)}
                onKeyDown={handleCommandKeyDown}
                data-testid="admin-next-cmdk-input"
                placeholder={copy.commandPlaceholder}
              />
              <span className="kbd">Esc</span>
            </label>
            <div className="cmdk-sec">{copy.commandSection}</div>
            <div className="cmdk-list" data-testid="admin-next-cmdk-results">
              {commandItems.length > 0 ? (
                commandItems.map((item, index) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`cmdk-item${index === cmdSelectedIndex ? " sel" : ""}`}
                    onMouseEnter={() => setCmdSelectedIndex(index)}
                    onClick={() => navigateCommand(item)}
                    data-testid={`admin-next-cmdk-item-${item.key}`}
                  >
                    <EvoIcon name={item.icon} size={16} />
                    <span>{item.label}</span>
                    <span className="kbd">{item.shortcut}</span>
                  </button>
                ))
              ) : (
                <div className="cmdk-empty" data-testid="admin-next-cmdk-empty">
                  {copy.commandEmpty}
                </div>
              )}
            </div>
            <div className="cmdk-foot">
              <span>{copy.commandFootOpen}</span>
              <span>{copy.commandFootNavigate}</span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
