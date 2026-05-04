# Geo Criterion IDs — Google Ads

Referencia rápida de Location IDs oficiales. Usar **IDs numéricos** en CSV import (NO nombres).

Fuente: [Google Ads API — Geographical Targeting](https://developers.google.com/google-ads/api/data/geotargets)

## Países

| País | ID |
|---|---:|
| 🇲🇽 México | `2484` |
| 🇪🇸 España | `2724` |
| 🇺🇸 USA | `2840` |
| 🇨🇴 Colombia | `2170` (excluir en campañas extranjeras) |
| 🇦🇷 Argentina | `2032` |
| 🇵🇷 Puerto Rico | `2630` |

## Ciudades — México

| Ciudad | ID |
|---|---:|
| Mexico City (CDMX) | `1010052` |
| Guadalajara | `1010268` |
| Monterrey | `1010271` |
| Puebla | `1010274` |
| Querétaro | `1010281` |

## Ciudades — España

| Ciudad | ID |
|---|---:|
| Madrid | `1005402` |
| Barcelona | `1005401` |
| Valencia | `1005419` |
| Sevilla | `1005418` |
| Bilbao | `1005403` |

## Ciudades — USA (mes 2+)

| Ciudad | ID |
|---|---:|
| Miami, FL | `1014221` |
| Los Angeles, CA | `1013962` |
| New York, NY | `1023191` |
| Houston, TX | `1014219` |

## Multi-targeting CSV format

```
Locations
2484;2724       ← MX + ES
2484;-2170      ← MX excluyendo Colombia local
```

## Verificar IDs actualizados

```bash
curl -s https://goo.gle/3K7ZVIK > /tmp/geotargets.csv
grep -i "Mexico City" /tmp/geotargets.csv
```
