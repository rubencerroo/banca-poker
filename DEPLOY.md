# Deploy a Cloudflare Pages + D1

Pasos para poner la app en producción gratis. La parte de `wrangler` la necesitas instalada localmente: `npm i -g wrangler` (o usa `npx wrangler …`).

## 1. Sube el repo a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin git@github.com:tuusuario/banca-poker.git
git push -u origin main
```

## 2. Crea la base de datos D1

```bash
wrangler login
wrangler d1 create poker-banca
```

Copia el `database_id` que te devuelve y pégalo en [`wrangler.toml`](wrangler.toml) reemplazando `REPLACE_WITH_YOUR_D1_ID`.

Aplica el esquema:

```bash
wrangler d1 execute poker-banca --remote --file=./schema.sql
```

> Para probar local: `wrangler d1 execute poker-banca --local --file=./schema.sql`

## 3. Conecta Pages al repo

En el panel de Cloudflare:

1. **Workers & Pages → Create → Pages → Connect to Git** → elige tu repo.
2. **Build configuration**:
   - Framework preset: *None* (o Vite)
   - Build command: `npm run build`
   - Build output directory: `dist`
3. **Environment variables (production)**: añade
   - `AUTH_PASSWORD` = la contraseña del grupo
   - `AUTH_SECRET` = una cadena larga aleatoria (32+ chars). Genera una con `openssl rand -hex 32`.
   - Marca ambas como **Encrypt** (secrets).
4. **Settings → Functions → D1 database bindings**:
   - Variable name: `DB`
   - D1 database: `poker-banca`
5. Deploy.

## 4. (Opcional) Dev local con backend

Para probar las Functions en local con la D1 local:

```bash
npm run build
wrangler pages dev dist --d1=DB=poker-banca --binding AUTH_PASSWORD=secreta --binding AUTH_SECRET=$(openssl rand -hex 32)
```

Abre `http://localhost:8788`. Las Functions corren a través del runtime de Workers.

> `npm run dev` (Vite directo) solo sirve el frontend; las llamadas a `/api/*` fallarán. Para el flujo completo usa `wrangler pages dev`.

## 5. Cambiar la contraseña

Cuando quieras renovarla:

```bash
wrangler pages secret put AUTH_PASSWORD --project-name banca-poker
```

O desde el panel de Pages → Settings → Environment variables.

Las sesiones activas siguen valiendo 30 días aunque cambies la password (se firman con `AUTH_SECRET`). Si quieres invalidar todas las sesiones existentes, rota también `AUTH_SECRET`.

## 6. Ver la base de datos

```bash
wrangler d1 execute poker-banca --remote --command "SELECT * FROM audit_log ORDER BY at DESC LIMIT 50;"
wrangler d1 execute poker-banca --remote --command "SELECT id, name, deleted_at FROM contacts;"
```

O conéctate desde el panel: **Workers & Pages → D1 → poker-banca → Console**.

## Coste

Free tier sobra por mil. Para una decena de amigos jugando timbas semanales:

- Pages: ilimitado en requests
- Pages Functions: 100k requests/día
- D1: 5M lecturas, 100k escrituras/día, 5 GB storage

Total previsto: **0 €/mes**.
