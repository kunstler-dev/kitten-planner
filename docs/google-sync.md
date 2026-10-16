# Setting up Google Drive sync

Kitten Planner syncs the desktop app and the phone app through the user's own Google Drive
(the hidden, app-only `appDataFolder`). This needs one Google Cloud project with two OAuth clients.
It takes about ten minutes and costs nothing.

## 1. Google Cloud project

1. Open <https://console.cloud.google.com/> and create a project, e.g. **Kitten Planner**.
2. **APIs & Services → Library** → enable **Google Drive API**.
3. **Google Auth Platform → Branding**: app name _Kitten Planner_, a support e-mail, save.
4. **Audience**: user type **External**, then **Publish app** (status _In production_).
   The app only uses non-sensitive scopes, so no Google verification is required — and in production
   the desktop sign-in does not expire after 7 days as it does in _Testing_ mode.
5. **Data Access → Add or remove scopes**: add `.../auth/drive.appdata` (plus `openid` and `email`,
   used only to show which account is connected).

## 2. OAuth clients

**Clients → Create client**, twice:

| Type                | Settings                                                                                                                                        | You need                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Web application** | Authorized JavaScript origins: `https://kunstler-dev.github.io` <br> Authorized redirect URIs: `https://kunstler-dev.github.io/kitten-planner/` | Client ID                 |
| **Desktop app**     | —                                                                                                                                               | Client ID + Client secret |

The desktop "secret" is not confidential by Google's design for installed apps (it ships inside the
`.exe`); it is still kept out of the repository and injected at build time.

## 3. GitHub

1. Repository **Settings → Secrets and variables → Actions → New repository secret**:
   - `GOOGLE_WEB_CLIENT_ID`
   - `GOOGLE_DESKTOP_CLIENT_ID`
   - `GOOGLE_DESKTOP_CLIENT_SECRET`
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Re-run the **Phone app (GitHub Pages)** workflow and publish a new release (Build workflow →
   _Run workflow_ with `release` checked after bumping the version), so both apps contain the keys.

For local development put the same values into `src/google-config.json` (do not commit them), or run
`GOOGLE_WEB_CLIENT_ID=… GOOGLE_DESKTOP_CLIENT_ID=… GOOGLE_DESKTOP_CLIENT_SECRET=… node scripts/google-config.js`.

## 4. Connect the devices

- **Computer:** Settings → Sync → _Connect Google Drive_ → sign in in the browser that opens.
- **iPhone:** open <https://kunstler-dev.github.io/kitten-planner/> in Safari → _Share → Add to Home
  Screen_ → open the app → Settings → Sync → _Connect Google Drive_ with the **same** Google account.

The cloud icon in the top bar shows the state; tapping it syncs immediately.
