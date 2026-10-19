# Claude Desktop × Obsidian

The actual installed Obsidian application inside Claude Desktop, opened directly from a navigation tab.

This experimental integration renders Obsidian in an Electron view inside Claude. The real-renderer demo has been exercised in Claude Desktop on Windows. The earlier custom Desktop viewer has been removed.

![Actual Obsidian renderer with the generated demo vault](docs/images/obsidian-runtime-demo.png)

*This screenshot is a crop of the embedded Obsidian view, showing a fictional demo vault and its Canvas. It does not show the surrounding Claude window.*

![Minimal embedded controls with the demo Canvas](docs/images/obsidian-minimal-demo.png)

*The minimal-control layout, captured in the disposable Electron test shell using the same renderer and stylesheet.*

## Current capabilities

- **Obsidian navigation tab** alongside Code/Cowork opens the actual renderer. Clicking it again, switching modes or navigating to a chat hides the view.
- The view fits below Claude's title bar and follows the sidebar edge, including interface zoom, sidebar changes and window resizing.
- Obsidian's own sidebar, tabs, note rendering, images and Canvas navigation, using a copied **Claude Runtime Demo** vault.
- **Settings → General → Obsidian** switches between Minimal and All controls, with the choice saved across restarts.
- Minimal controls retain file navigation, note tabs and Canvas zoom/fit while hiding secondary toolbars.
- An additional plugin for the official Claude Code mods API and an earlier MCP App implementation.

The Desktop patch and runtime adapter are experimental and version-specific: **Claude Desktop 2.42304.2** and **Obsidian 1.14.4**, tested on Windows 11. This is an independent project, not an official Anthropic or Obsidian integration. The repository contains integration code and a fixture generator; it does not contain either application's binaries or renderer code.

## Local development

Use Windows with Node.js 22 or newer; the current verification environment uses Node.js 24. Install Claude Desktop and, for the real-renderer experiment, Obsidian separately.

```powershell
npm ci
node scripts/create-demo-vault.mjs
npm run build
npm run build:mod
npm test
npm run verify:vault
```

The generator creates **Atelier Demo Vault** with 58 fictional notes, three Canvas boards, three Bases views, attachments, bookmarks and templates. It refuses to overwrite an existing vault. Generated vaults, local configuration, application copies, build outputs and backups are ignored by Git.

To preview navigation and settings in a browser:

```powershell
npm run build:desktop -- --build-only
npm run preview:desktop
```

Open `http://127.0.0.1:4318/`. This fixture does not run the real Obsidian renderer.

## Desktop UI patch

The patch targets the Windows Squirrel installation at `%LOCALAPPDATA%\AnthropicClaude\app-2.42304.2`. It verifies application versions and hashes and creates exact backups. Run from a normal PowerShell session so application-data paths resolve to your installed applications.

```powershell
npm run build:desktop
npm run install:desktop -- --status
```

Save your work and **fully quit Claude Desktop from its tray menu**, then apply the staged patch and reopen Claude:

```powershell
npm run install:desktop
```

Open **Obsidian** in the main navigation to use the actual renderer with a copied **Claude Runtime Demo** vault. Its supporting scripts must remain in this checkout. If the native mode navigation is unavailable, the same button appears at the top right.

Open Claude's own **Settings → General → Obsidian** section to switch **Obsidian controls → Minimal / All**. The section is rendered by the installed General settings component. The choice is saved and applied to open demo views through the enabled **atelier** snippet; reopening Claude uses the same mode. The small button at the top left of embedded Obsidian collapses its file list.

The style can also be applied or removed live with `node scripts/apply-minimal-ui.mjs --vault "path to Claude Runtime Demo"` and the optional `--restore` flag. Only the marked minimal-controls block is removed for All; the vault's existing stylesheet and its original backup are preserved. Keep the demo's **atelier** CSS snippet enabled for the switch to take effect.

For updates to an existing patch, stage with `npm run build:desktop -- --update`. When an unapplied stage already exists, supply `--base-manifest` pointing to the manifest of the version actually installed. The installer refuses unknown file changes and a running application.

To restore the previous installation, fully quit Claude and run:

```powershell
npm run restore:desktop
```

Backups and manifests remain under `.local/desktop-ui/`. The patch preserves Electron fuses and the existing CSP. Application updates can require a new compatibility patch. The integration does not configure an inference provider or include API credentials; use Claude Desktop's existing supported account/provider setup.

## Official Code-session mod

The separate mod in `mods/obsidian` adds a launcher above the Code composer and a native notes pane using the official mods API. Its kit has been tested with Claude Code 2.1.303; Desktop's bundled engine and a separately installed CLI can have different versions.

```powershell
npm run build:mod
claude plugin validate ./mods/obsidian
claude plugin test ./mods/obsidian
claude plugin marketplace add .
claude plugin install atelier-obsidian@atelier-local --scope user
```

Reload plugins in a compatible Code session. This optional mod has its own catalog and supports explicit note/passage insertion into a prompt and saving a reviewed response as a new note. It is distinct from the real-renderer experiment.

## Earlier MCP App

`npm run build` builds the earlier conversation-hosted MCP view; `npm run install:claude` adds its server configuration with a backup. This variant requires a model tool call to open and is retained separately. `npm run preview` starts its preview on port 4317. Saves there modify the chosen vault, so use a disposable copy when experimenting.

## Verification and limitations

`npm test` covers vault boundaries, catalog and control-preference persistence, concurrent/stale saves, native navigation/settings, rollback, frame trust and runtime isolation/lifecycle. The official mod has a separate `claude plugin test` suite. Windows CI builds generated fixtures and runs the Node suite.

Native Electron checks exercised note/Canvas rendering, resizing, hide/show, host settings, theme-listener preservation and clean shutdown. Browser and mod-kit tests do not establish native pixels; the real-renderer demo has also received a direct visual check inside Claude.

The real renderer currently uses a copied demo vault. Connecting registered vaults to it, production packaging, community plugins, popouts and embedded browser compatibility remain unfinished.

See [architecture](docs/ARCHITECTURE.md) and [runtime experiments](docs/EXPERIMENTS.md) for implementation details.
