# Templates — CSVs vacíos para Google Ads Editor import

13 archivos con **headers oficiales** verificados contra `support.google.com/google-ads/editor/answer/57747`.

## Crear iteración nueva

```bash
ITER="2026-XX-<descripcion>"
TENANT="colombiatours"
mkdir -p ops/google-ads/$TENANT/$ITER
cp ops/google-ads/templates/*.csv ops/google-ads/$TENANT/$ITER/
echo "draft" > ops/google-ads/$TENANT/$ITER/_STATUS.md
```

## Reglas

1. **NO modificar headers** sin justificación documentada (los que Google Ads Editor reconoce).
2. **SÍ modificar la fila `[EJEMPLO_BORRAR]`** para que sea representativa de iteraciones recientes.
3. Si Google agrega/cambia columnas: actualizar templates aquí + nota en commit + actualizar iteraciones activas.
4. Cuando crees iteración: **borrar las filas `[EJEMPLO_BORRAR]`** antes de import.

## Validación pre-import

- [ ] Encoding UTF-8 (con o sin BOM ambos OK)
- [ ] Separador coma `,`
- [ ] Headers en inglés (case y espacios no importan)
- [ ] `Type` column tiene `Broad`/`Phrase`/`Exact`/`Negative` literales
- [ ] `Bid Strategy Type` literal: `Manual CPC`, `Maximize conversions`, `Maximize clicks`, `Target CPA`, `Target ROAS`
- [ ] Geo IDs numéricos (no nombres): MX=`2484`, ES=`2724`, US=`2840`
- [ ] Multi-value separator: `;`
- [ ] Dates `MM/DD/YYYY`
- [ ] Filas `[EJEMPLO_BORRAR]` removidas
- [ ] Account-level negatives: `Campaign = <Account-level>` literal

## Referencias oficiales

- [Prepare a CSV file](https://support.google.com/google-ads/editor/answer/56368)
- [CSV file columns](https://support.google.com/google-ads/editor/answer/57747)
- [Make multiple changes](https://support.google.com/google-ads/editor/answer/47660)
- [Bid strategy types](https://developers.google.com/google-ads/api/docs/campaigns/bidding/strategy-types)
- [Geo target IDs](https://developers.google.com/google-ads/api/data/geotargets)
