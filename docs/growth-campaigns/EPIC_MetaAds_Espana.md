## Objetivo

Lanzar una campaña de Meta Ads orientada al mercado español (Madrid y Barcelona) para atraer viajeros de alto valor hacia los paquetes de Colombia Tours. El eje de confianza es "La ventana que abre Colombia al mundo".

**Plazo estimado:** 8 días para go-live
**Mercados:** Madrid y Barcelona (España)
**Perfil:** Alto valor / High-Ticket
**Presupuesto inicial:** 50 USD/día (sube desde 10 USD/día)
**Campaña inicial:** ES | Colombia Tours | High-Ticket | WhatsApp + Sales Proxy | Madrid-Barcelona
**Objetivo de negocio:** ROAS por `booking_confirmed` / reserva confirmada

**Landings en uso:**
- [Bogotá Esencial 4D](https://colombiatours.travel/paquetes/bogota-esencial-cultura-y-sal-4-dias)
- [Colombia Imperdible 9D](https://colombiatours.travel/paquetes/colombia-imperdible-9-dias-bogota-medellin-y-cartagena)
- [Escapada Colombia 7D](https://colombiatours.travel/paquetes/escapada-colombia-7-dias-medellin-y-cartagena)
- [Medellín y Guatapé 5D](https://colombiatours.travel/paquetes/medellin-y-guatape-5-dias-ciudad-de-la-eterna-primavera)

---

## Documentación

Los archivos de investigación y el plan de acción completo están en `docs/growth-campaigns/`:
- `plan-de-accion-meta-ads-espana.md` — Plan de 8 días
- `estrategia-meta-ads-espana-research.md` — Estrategia de investigación
- `deep-research-report-espana.md` — Deep research report

---

## Tareas Clave

### Día 1-2 — Datos e Infraestructura
- [ ] Auditar Píxel de Meta + CAPI en todo el ecosistema web
- [ ] Verificar Event Match Quality Score mayor a 7/10
- [ ] Validar eventos actuales: ViewContent, Contact (`whatsapp_cta_click`), Lead (`waflow_submit`)
- [ ] Usar `booking_confirmed` como métrica interna de ROAS hasta certificar Meta Purchase
- [ ] Sincronizar First-Party Data (CRM) con Meta Custom Audiences
- [ ] Crear Value-Based Lookalikes 1%, 2%, 3% (Madrid + Barcelona)
- [ ] Configurar exclusiones de clientes recientes (últimos 30 días)

### Día 3 — Optimización de Landings
- [ ] Añadir módulo FAQ de Seguridad (corredores seguros, transporte privado 24/7)
- [ ] Incluir contexto de conectividad (vuelos desde Madrid/Barcelona) en hero
- [ ] Alinear copy con eje "La ventana que abre Colombia al mundo"
- [ ] Validar Max-Price Bidding para WhatsApp Business (agente IA ya configurado)

### Día 4-5 — Producción Creativa
- [ ] Seleccionar/Editar 3 videos UGC verticales TOFU con ganchos "3 Razones" y "Secreto de Sudamérica"
- [ ] Redactar 2 copys y 2 titulares para la matriz 3:2:2
- [ ] Diseñar carruseles MOFU con itinerario día a día por paquete
- [ ] Editar videos de testimoniales MOFU de viajeros españoles, foco en seguridad
- [ ] Crear imágenes estáticas BOFU con overlays de urgencia "Plazas Limitadas"
- [ ] Redactar CTAs directos hacia Click-to-WhatsApp

### Día 6 — Montaje en Meta Ads Manager
- [ ] Crear campaña unificada Madrid + Barcelona con aprendizaje concentrado
- [ ] Asignar 30 USD/día a Prospecting / TOFU-MOFU (Broad + Advantage+, estructura 3:2:2)
- [ ] Asignar 15 USD/día a Retargeting / MOFU-BOFU (visitantes, video 50%+, engagers, clics WhatsApp)
- [ ] Mantener 5 USD/día como reserva táctica para ganadores, urgencia o refuerzo BOFU
- [ ] Diferenciar ángulos por `utm_content`, no por campañas separadas de ciudad

### Día 7 — QA y Pruebas
- [ ] Pruebas de Click-to-WhatsApp en mobile y desktop
- [ ] Validar eventos con Meta Pixel Helper y panel CAPI Test Events
- [ ] Revisar copy en español ibérico sin modismos latinos
- [ ] Validar tiempos de carga de landings (menos de 3s en mobile)

### Día 8 — Go-Live y Monitoreo
- [ ] Activar campañas en horario de mañana de España
- [ ] Monitorear CPM y Outbound CTR en TOFU durante primeras 24h
- [ ] Alinear equipo comercial para gestión de flujo WhatsApp
- [ ] Agendar revisión de iteración ganadora del sistema 3:2:2 para el Día 11

---

## KPIs de Éxito Semana 1

| Métrica | Objetivo |
|---------|----------|
| CPM TOFU | Menos de 18 EUR |
| Outbound CTR | Mayor a 1.8% |
| Costo por Lead WhatsApp | Menos de 12 EUR |
| Tasa de Apertura de Conversación | Mayor a 40% |
| ROAS | Reserva confirmada atribuida a `booking_confirmed` |

---

## Referencias

- Estrategia completa: `docs/growth-campaigns/estrategia-meta-ads-espana-research.md`
- Plan de acción: `docs/growth-campaigns/plan-de-accion-meta-ads-espana.md`
- Deep research: `docs/growth-campaigns/deep-research-report-espana.md`
