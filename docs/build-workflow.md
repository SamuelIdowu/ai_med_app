# Android Build Workflow — Laso Mobile

Step-by-step manual for producing installable Android APKs on real devices
(sideload distribution). SDK 58, EAS cloud builds, no local Android toolchain
required.

---

## 1. Prerequisites (one-time)

| Requirement                       | Check                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------- |
| Node.js ≥ 22.13.0                 | `node --version`                                                                 |
| Expo account (owner `thanasis_6`) | `npx eas-cli@latest whoami`                                                      |
| EAS project link                  | `extra.eas.projectId` exists in `mobile/app.json` (`32377372-...`), already done |
| Google account                    | Sign up at https://expo.dev — free tier covers periodic preview builds           |

Install the EAS CLI globally (once):

```powershell
npm install -g eas-cli
eas login
eas whoami
```

If you are not logged in on this machine, `eas login` prompts for your Expo
username/password.

---

## 2. Environment setup (one-time, repeat after dependency changes)

Run from the `mobile/` folder:

```powershell
cd mobile
npm ci
npx expo-doctor
```

Expected: `20/20 checks passed. No issues detected!`

Known Windows issues (already solved in this repo — reference if they recur):

- **npm cannot remove deeply nested `node_modules` paths**
  ("Could not find a part of the path ... Relocations\aarch64").
  Enable long paths once as Administrator:
  `New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name LongPathsEnabled -Value 1 -PropertyType DWord -Force`
  then reboot, and re-run the delete/install.
- **`npm ci` fails on ESLint peer conflicts** — means `package.json` and
  `package-lock.json` are out of sync. Do not hand-edit both; restore both from
  git (`git checkout HEAD -- package.json package-lock.json`), then `npm ci`.
- Only change Expo package versions via `npx expo install <pkg>` — never raw
  `npm install expo@x`.

---

## 3. Pre-flight gate (run before EVERY build)

All commands from `mobile/`. Stop and fix any failure before building.

```powershell
npm run lint          # expected: no output, exit 0 (max-warnings=0)
npx tsc --noEmit      # expected: silent, exit 0
npm run test          # expected: Test Suites: 19 passed, Tests: 99 passed
npx expo-doctor       # expected: 20/20 checks passed
node node_modules\expo\bin\cli config --json --full > $null 2>&1; if ($?) { "config OK" } else { "config FAILED" }
```

The config check also enforces the production URL guard in `app.config.js`:
on `production*` build profiles, `EXPO_PUBLIC_BACKEND_URL` must be a deployed
HTTPS URL (no localhost/LAN IPs). The `preview` profile skips this guard.

---

## 4. Build the APK

EAS builds run in Expo's cloud — the Windows machine does not need Android
Studio, JDK, or an emulator. Build time is typically 10–20 minutes.

### Test build (internal distribution, `preview` profile)

```powershell
cd mobile
npm run build:apk
```

What this profile bakes in (from `eas.json` → `build.preview.env`):

- `EXPO_PUBLIC_BACKEND_URL = https://92-5-43-189.nip.io/api/v1`
- `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- buildType `apk`, internal distribution, debug-free release JS

### Production APK (sideload/private distribution)

```powershell
npm run build:apk:prod
```

Same environment values, `production-apk` profile with `autoIncrement: true`
and the production URL guard enforced by `app.config.js`.

### During the build

1. First-ever build prompts: **generate a new Android Keystore? → Yes**
   (EAS manages and reuses it for all later builds — do NOT answer "no",
   do not delete the keystore).
2. The CLI prints a build URL. Follow it, or check status with:

```powershell
eas build:list --platform android --limit 5 --non-interactive
```

### Getting the APK

When the build finishes, the CLI prints the APK download link. To re-retrieve:

```powershell
eas build:view <BUILD_ID>   # shows status + artifact URL
```

Or download the latest successful APK directly:

```powershell
$build = (eas build:list --platform android --status finished --limit 1 --json --non-interactive | ConvertFrom-Json)[0]
Invoke-WebRequest -Uri $build.artifacts.buildUrl -OutFile "laso-$($build.id.Substring(0,8)).apk"
```

---

## 5. Sideload to a device

1. Copy the `.apk` to the device (USB, Drive, download link).
2. On the device, open the APK. When prompted, allow
   **Settings → Install unknown apps** for the app you installed from.
3. If a _previous internal-distribution Laso build_ is installed:
   - Same app ID (`com.laso.app`) and higher `versionCode` → installs over it.
   - Signature mismatch error → uninstall the old build first (only EAS-signed
     builds with the same keystore will update cleanly).

---

## 6. Post-install smoke test checklist

Test each area once after every production APK:

- [ ] Auth: signup → login → session survives app kill+relaunch (SecureStore)
- [ ] Camera: capture → preview → AI analysis upload succeeds
- [ ] Photo library: upload an existing photo (Medical Profile)
- [ ] Location: provider list/map centers on nearby facilities
- [ ] Push: notification token registered (check backend log) and a test
      notification displays
- [ ] Offline: airplane mode → triage falls back to local engine → encounters
      queue → reconnects and syncs
- [ ] Health: vitals read flow (Health Connect + device-dependent)
- [ ] Report: generate + share a PDF export

---

## 7. Versioning

`eas.json` sets `"appVersionSource": "remote"`; both `production` profiles set
`"autoIncrement": true`.

- `versionCode` rises automatically on every production-profile build
  (`eas build:version:get` shows the current remote values).
- `app.json`'s `version` (1.0.0) / `versionCode` (1) are the fallback values.
- To reset/set versions manually:
  `eas build:version:set -p android --non-interactive` (prompts on interactive).

---

## 8. Troubleshooting quick table

| Symptom                                                           | Cause                                             | Fix                                                                                                                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cannot find module .../expo-modules-core/...` from `expo config` | stale/incomplete node_modules                     | See §2; delete `node_modules`, `npm ci`                                                                                                                                    |
| `npm ci` peer-dep ERESOLVE                                        | package.json/lock drift                           | Restore both from git, `npm ci`                                                                                                                                            |
| Build fails at "whoami"                                           | EAS session expired                               | `eas login`                                                                                                                                                                |
| Build fails with a Gradle error                                   | see build URL logs                                | follow the returned log link; re-check `expo-doctor`                                                                                                                       |
| APK won't install over existing app                               | keystore mismatch                                 | uninstall old app, reinstall new APK                                                                                                                                       |
| Push tokens never registered in backend                           | device emulator/simulator without FCM             | use a physical device; `projectId` exists in app.json                                                                                                                      |
| Local URL guard throws on production profile                      | `EXPO_PUBLIC_BACKEND_URL` points to localhost/LAN | EAS profile env block already has the deployed URL — verify it's reachable (any HTTP status means the server is up): `Invoke-WebRequest https://92-5-43-189.nip.io/api/v1` |

---

## Future: App Bundle + Play Store, iOS

Out of scope for this manual. When needed:

- App Bundle: `npm run build:appbundle` (production profile, same gates as §3).
- Play Store submission: add `serviceAccountKeyPath` under
  `submit.production.android` — see the `eas-app-stores` reference workflow.
- iOS (IPA): blocked on Apple Developer Program + `eas credentials` + an APNs
  key for remote push; then `eas build -p ios --profile production`.

  Continue opencode -s ses_e66cd48bdffeO2V8UDQ8R6H66I
