# Deploy to Production

Ejecuta el flujo completo de deploy: analiza el proyecto, aplica fixes, commits por categorias, sync con origin, merge a main y regreso a dev.

## Instrucciones

Ejecuta los siguientes pasos en orden:

### 1. Analizar el proyecto completo

Antes de cualquier commit, verifica que el proyecto compila y no tiene errores.

#### 1a. Analisis estatico
Usa la herramienta MCP `mcp__dart__analyze_files` para analizar todo el proyecto.

Si hay issues reportados:
1. Usa `mcp__dart__dart_fix` para aplicar fixes automaticos
2. Vuelve a ejecutar `mcp__dart__analyze_files` para verificar que se resolvieron
3. Si quedan issues que no se resuelven con dart fix, corrígelos manualmente
4. Repite hasta que haya **cero issues** (max 2 intentos manuales, luego escala al usuario)

#### 1b. Formateo de codigo
Usa `mcp__dart__dart_format` para formatear todos los archivos modificados.

**Gate**: Solo continuar al paso 2 si analyze reporta cero issues.

> **Nota**: Los tests se ejecutan automáticamente en el flujo de CI/CD de GitHub, no es necesario correrlos aquí.

### 2. Verificar estado actual
```bash
git status --short
git log --oneline -3
```

### 3. Organizar commits por categoria

Analiza los archivos modificados y agrupa por categoria:
- `docs(*)`: Archivos en `docs/`
- `test(*)`: Archivos en `test/`, `integration_test/`
- `feat(backend)`: Archivos en `supabase/`
- `feat(services)`: Archivos en `lib/services/`, `lib/backend/`
- `feat(ui/*)`: Archivos en `lib/bukeer/` agrupados por modulo
- `feat(navigation)`: Archivos de navegacion/routing
- `fix(*)`: Correcciones de bugs
- `refactor(*)`: Refactorizaciones
- `chore(quality)`: Cambios generados por dart fix/format en este deploy

Para cada categoria con cambios:
1. `git add <archivos-de-la-categoria>`
2. `git commit --no-verify -m "<tipo>(<scope>): <descripcion>"`

Incluir siempre el co-author:
```
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### 4. Sincronizar dev con origin
```bash
# Traer cambios remotos de otros desarrolladores
git pull origin dev --rebase

# Push nuestros commits a origin dev
git push origin dev
```

Si el rebase genera conflictos, resolverlos y continuar con `git rebase --continue`.

### 5. Merge a main
```bash
# Actualizar main con los cambios remotos primero
git checkout main
git pull origin main

# Merge dev en main
git merge dev

# Push a produccion
git push origin main
```

Si `git push origin main` falla por commits remotos nuevos:
1. `git pull origin main --rebase`
2. Resolver conflictos si los hay
3. `git push origin main`

### 6. Sincronizar dev con main (IMPORTANTE)

Este paso asegura que dev tenga todos los commits que estaban en main
(de otros desarrolladores o PRs mergeados directamente a main).

```bash
git checkout dev

# Traer posibles cambios nuevos de otros devs en dev
git pull origin dev

# Traer a dev lo que main tenia y dev no
git merge main --no-edit

# Sincronizar dev remoto
git push origin dev
```

Si no hay diferencias entre dev y main, el merge dira "Already up to date" y no hay nada que hacer.

### 7. Confirmar resultado
```bash
git status
git log --oneline -5

# Verificar que dev y main estan sincronizados
git log dev..main --oneline    # Deberia estar vacio
git log main..dev --oneline    # Deberia estar vacio (o solo tener WIP local)
```

## Notas

- Usa `--no-verify` en commits para evitar bloqueos del pre-commit hook
- Si hay conflictos en el merge, resuelve y continua
- El push a main activa el deploy automatico en Cloudflare Pages
- El paso de analisis garantiza que solo se deploya codigo sin errores
- El paso 6 es critico para evitar divergencia entre dev y main cuando hay multiples desarrolladores
