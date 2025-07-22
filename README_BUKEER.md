# Bukeer Web Public Module

Este módulo gestiona los sitios web públicos de los clientes de Bukeer (ej: colombiatours.travel).

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con las credenciales reales

# Desarrollo
npm run dev

# Build producción
npm run build
```

## 📁 Estructura

```
web-public/
├── app/                    # Rutas y páginas (App Router)
├── components/            
│   ├── ui/                # Componentes UI base
│   ├── bukeer/            # Componentes específicos Bukeer
│   └── layouts/           # Layouts compartidos
├── lib/
│   ├── supabase/          # Cliente y queries Supabase
│   ├── bukeer/            # Lógica de negocio Bukeer
│   └── analytics/         # Tracking y analytics
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript types
└── utils/                 # Utilidades
```

## 🔗 Integración con Bukeer

Este módulo se conecta con:
- **Supabase**: Misma base de datos que la app principal
- **Chatwoot**: Para gestión de conversaciones
- **Bukeer API**: Para datos de productos, itinerarios, etc.

## 🌐 Multi-tenant

El sistema soporta múltiples sitios web de clientes:
- Detección por dominio
- Configuración por cuenta
- Temas personalizables

## 📊 Analytics

Tracking unificado implementado:
- Google Analytics 4
- Google Tag Manager
- Meta Pixel
- Eventos custom para Bukeer

## 🚢 Deployment

Se despliega automáticamente a Vercel cuando se hace push a `main`.

---

Para más información, ver `/docs/06-projects/COLOMBIA_TOURS_WEB_IMPLEMENTATION_PLAN.md`