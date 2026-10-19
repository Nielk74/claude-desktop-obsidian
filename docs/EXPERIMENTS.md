# Real Obsidian rendering experiments

Obsidian's [official repositories](https://github.com/orgs/obsidianmd/repositories?type=all) include its [plugin API](https://github.com/obsidianmd/obsidian-api), the [JSON Canvas format](https://github.com/obsidianmd/jsoncanvas) and other tools. They do not supply the complete desktop renderer as an importable library. The API package supplies declarations rather than the application's runtime implementation.

The real-renderer experiment depends on a separately installed Obsidian app. It reads local resources at runtime; this repository does not redistribute them.

## Approaches tried

1. **Cross-process Windows parenting:** a copied app and disposable profile were attached to a native child-window host. Metadata reported attachment, but the user did not see the prototype. This approach was abandoned. The C# host remains as a failed research artifact.
2. **Adopt existing window contents:** Electron rejected adoption because the contents were already attached to a window; the default contents were not exposed as a detachable child view.
3. **Create a fresh WebContentsView:** a fresh renderer with Obsidian's existing services successfully rendered notes and Canvas in a disposable process.
4. **Scope the services:** app/window/session/IPC facades allowed that renderer to coexist with a host application. Regressions cover theme-listener removal, reply-channel mismatches, SPA navigation and startup/shutdown races.
5. **Load the view inside Claude:** the tested adapter was installed through the version-specific Desktop patch. The user confirmed the real Obsidian interface was visible inside Claude. The README screenshot comes from the embedded view with generated fictional data.

## Test tools

- `prototype-obsidian-runtime.mjs` and `runtime-view-host.cjs`: disposable early experiments.
- `prototype-scoped-runtime.mjs` and `scoped-runtime-spike.cjs`: a standalone Electron shell, copied vault and private profile.
- `runtime-adapter-check.cjs`: exercises the exact adapter intended for Claude, checking Canvas, hide/show, host settings, process arguments and an existing theme listener.
- `tests/runtime-prototype.test.mjs`: deterministic IPC/preload and lifecycle regressions.

These scripts produce ignored local artifacts. Node and mod-kit tests complement native visual checks; they do not replace them.
