# Host Cargoplanner (elaborate, free)

You will do three things, in this order:

1. Create a **Postgres database** on Neon (do **not** enable Neon Auth).
2. From your laptop, create the tables and the admin login.
3. Put the app on **Vercel** and point it at that database.

The website URL will be public. The app still requires a password. Treat that password like a house key.

---

## Part 0 — What you need

- A GitHub account
- A Neon account (you can sign up with GitHub)
- A Vercel account (sign up with the **same** GitHub account)
- This project folder: `C:\Users\Lenovo\cargoplanner`
- Node.js already installed (you used it to build the app)

You do **not** need Docker for hosting.

### Four secrets you will create

| Name | What it is |
| --- | --- |
| `DATABASE_URL` | Neon’s Postgres connection string |
| `AUTH_SECRET` | Random string that signs login cookies (32+ characters) |
| `ADMIN_EMAIL` | The email you will type on the login screen |
| `ADMIN_PASSWORD` | A strong password, **not** `admin123` |

Use the **same** four values on your laptop (`.env`) and on Vercel.

---

## Part 1 — Neon database (skip Neon Auth)

### 1.1 Create the account

1. Open [https://console.neon.tech](https://console.neon.tech).
2. Sign up / log in with GitHub.
3. If Neon asks to create an organization, accept the defaults.

### 1.2 Create a project

1. Click **New Project** (or **Create project**).
2. Fill in:
   - **Project name:** `cargoplanner`
   - **Database name:** leave `neondb` (or `cargoplanner` if you can type it)
   - **Region:** something close to you. From Australia, prefer **Asia Pacific** (Singapore / Sydney if listed). Closer = faster.
3. Create the project.

### 1.3 Do not enable Neon Auth

If you see **Auth**, **Neon Auth**, **Better Auth**, or **Managed Auth**:

- Leave it **off**
- Do not click Enable / Get started on Auth

This app already has its own login. Neon is only storing tables.

### 1.4 Copy the connection strings

On the project dashboard:

1. Click **Connect** (sometimes labeled **Connection details**).
2. Set:
   - Branch: `production` or `main` (the default)
   - Database: the one you created
   - Role: the default role (often `neondb_owner`)
3. You should see a connection string like:

   `postgresql://USER:PASSWORD@HOST/dbname?sslmode=require`

4. If there is a toggle **Connection pooling**:
   - Turn pooling **ON** and copy that string. The host usually contains `-pooler`.
   - That is the one for Vercel (`DATABASE_URL`).
   - Turn pooling **OFF** and copy that string too. That is the one for `prisma db push` on your laptop if the pooled one errors.

Keep both in a password manager or a notepad you will not commit to git.

The password is **inside** the URL (between `:` and `@`). Do not post it in chat or a screenshot.

---

## Part 2 — Create tables from your laptop

This step talks to Neon **from your PC**. Do it once before (or immediately after) the first Vercel deploy. If you skip it, the live site will crash on login because the `User` table does not exist.

### 2.1 Open PowerShell in the project

```powershell
cd C:\Users\Lenovo\cargoplanner
npm install
```

### 2.2 Create `.env`

In the project root, copy the example file:

```powershell
Copy-Item .env.example .env
```

Open `.env` in Cursor. Replace the contents with:

```
DATABASE_URL="PASTE_NEON_POOLED_OR_DIRECT_URL_HERE"
AUTH_SECRET="PASTE_RANDOM_SECRET_HERE"
ADMIN_EMAIL="you@yourcompany.com"
ADMIN_PASSWORD="choose-a-long-unique-password"
```

Rules:

- Keep the quotes.
- No spaces around `=`.
- `ADMIN_EMAIL` is what you type at `/login`.
- `AUTH_SECRET` must be at least 16 characters; use 32+.

Generate `AUTH_SECRET` in PowerShell:

```powershell
[Convert]::ToBase64String((1..40 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Paste the result as `AUTH_SECRET`.

If Prisma later complains about pooling during `db push`, set `DATABASE_URL` to the **unpooled** Neon URL for this laptop step only. Vercel should still use the **pooled** URL.

### 2.3 Create tables and seed data

```powershell
npx prisma db push
npx prisma db seed
```

Success looks like:

- `db push` — “Your database is now in sync”
- `db seed` — “Seeded admin, equipment, and sample SKUs”

If it fails:

- `P1001` / can’t reach database: wrong URL, or laptop firewall; check you copied the full string including `sslmode=require`.
- `P1013` / invalid URL: a quote or line-break got into `.env`.
- Authentication failed: you copied a truncated password (they often contain special characters; keep the whole URL).

After seed, your Neon database has:

- Admin user (`ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- Standard containers (20ft, 40ft, 40HC, …)
- A few sample SKUs

### 2.4 Optional: confirm from your laptop

You can run the app against Neon without Vercel:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), log in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`. If that works, the database is correct.

Stop the dev server with Ctrl+C when you are done.

---

## Part 3 — Put the code on GitHub (private)

Vercel deploys from GitHub. Use a **private** repo so the world cannot clone your internal tool (the source is not secret, but there is no reason to make it public).

### 3.1 Confirm `.env` will not be committed

`.gitignore` already ignores `.env`. Confirm:

```powershell
git status
```

You should **not** see `.env` in the list. You **should** see source files. If `.env` appears, stop and do not add it.

### 3.2 Commit (if you have not already)

```powershell
git add .
git status
git commit -m "Internal cargo load planner"
```

Only run commit if you intend to. If git says “nothing to commit”, skip ahead.

### 3.3 Create the GitHub repo

1. Open [https://github.com/new](https://github.com/new).
2. Repository name: `cargoplanner`.
3. Visibility: **Private**.
4. Do **not** add a README, `.gitignore`, or license (the project already has them).
5. Create repository.

GitHub will show commands. If you have no remote yet:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/cargoplanner.git
git branch -M main
git push -u origin main
```

Log in to GitHub if the push asks. A Personal Access Token may be required instead of your GitHub password.

---

## Part 4 — Deploy on Vercel

### 4.1 Sign in

1. Open [https://vercel.com](https://vercel.com).
2. **Continue with GitHub**.
3. Authorize Vercel to see the `cargoplanner` repo (Account → Integrations / Install if it does not list the repo).

### 4.2 Import the project

1. Dashboard → **Add New…** → **Project**.
2. Find `cargoplanner` → **Import**.
3. Framework Preset should be **Next.js**. Leave it.
4. Root Directory: `.` (leave default).
5. Build command: leave default (`npm run build` from `package.json`, which already runs `prisma generate`).
6. Output: leave default.

Do **not** click Deploy yet. Set environment variables first.

### 4.3 Environment variables

In the import screen, open **Environment Variables**. Add **four** rows. For each, enable **Production**, **Preview**, and **Development**.

| Key | Value |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** URL (`-pooler` in the host if you have it) |
| `AUTH_SECRET` | Same string as in your laptop `.env` |
| `ADMIN_EMAIL` | Same as `.env` |
| `ADMIN_PASSWORD` | Same as `.env` |

Paste carefully. A missing quote is fine here (Vercel values are not wrapped in quotes unless the quote is part of the secret). **Do not** wrap the URL in extra quotes on Vercel if you already omitted them.

You do **not** need:

- `NEON_AUTH_BASE_URL`
- `VITE_NEON_AUTH_URL`
- Neon Auth keys

### 4.4 Deploy

Click **Deploy**. The first build takes a minute or two.

- Green **Ready** = the site compiled.
- Red **Error** = open the build log. The usual miss is a typo in `DATABASE_URL` (build itself does not need the DB, but a bad env is still worth fixing before you log in).

### 4.5 Open the site

Vercel shows a URL like:

`https://cargoplanner-xxxxx.vercel.app`

1. Open it. You should land on **Sign in** (or be redirected there).
2. Email: `ADMIN_EMAIL`
3. Password: `ADMIN_PASSWORD`
4. You should see **Load plans**.

If login says “Wrong email or password”:

- The seed from Part 2 did not run, or used different `ADMIN_EMAIL` / `ADMIN_PASSWORD` than Vercel.
- Fix: run `npx prisma db seed` again on the laptop with the **same** `.env` values you put on Vercel.

If the page errors / 500:

- `DATABASE_URL` on Vercel does not match Neon, or tables were never pushed (`npx prisma db push`).
- `AUTH_SECRET` shorter than 16 characters.

### 4.6 Add a colleague

On the live site: **Settings** → name, email, password → **Add user**. They visit the same Vercel URL.

---

## Part 5 — After it is live

1. Create **New load plan** → Load sample cargo → Setup (keep 40HC) → **Create load plan**. You should see a 3D container.
2. Add your real trucks/containers under **Equipment**.
3. Add repeating products under **Cargo library**.
4. Print from the **Load plan** tab: browser menu → **Print** → **Save as PDF**.

### Custom domain (optional)

Vercel project → **Settings** → **Domains** → add `planner.yourcompany.com` and follow the DNS instructions. HTTPS is automatic.

### Every future update

```powershell
git add .
git commit -m "Describe the change"
git push
```

Vercel redeploys by itself.

If you change `prisma/schema.prisma`, also run this on the laptop (with `.env` still pointing at Neon):

```powershell
npx prisma db push
```

Then push the code.

### Backup

Neon console → project → look for **Backups** / PITR if your plan includes it.

Or dump from the laptop (use the **unpooled** URL):

```powershell
# If you have Postgres client tools installed:
pg_dump "YOUR_UNPOOLED_URL" -f cargoplanner-backup.sql
```

---

## What can go wrong (and what to do)

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| First load takes 5–10 seconds | Neon or Vercel woke from sleep | Wait; next clicks are faster |
| Login fails after a day of no use | Same sleep, or wrong password | Retry once; confirm Vercel env vars |
| Calculate fails on a huge Excel sheet | 10s Hobby timeout / 1200 piece cap | Split the list |
| 3D is blank | Browser WebGL blocked | Try Chrome/Edge; allow hardware acceleration |
| Preview deploy on a Git branch has no data | Preview uses the same DB only if you set Preview env vars | You already set all three environments in Part 4.3 |
| You enabled Neon Auth by accident | Extra product, unused by this app | Ignore it; do not point the app at those URLs |

---

## Do not do these

- Do not enable Neon Auth for this project.
- Do not paste `.env` into GitHub.
- Do not use Vercel **without** Neon (or another Postgres). Plans would vanish.
- Do not leave `admin123` on the live site.
- Do not put `AUTH_SECRET` in the frontend or in a public gist.
