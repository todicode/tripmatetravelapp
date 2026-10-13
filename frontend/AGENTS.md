# Frontend conventions

Keep the existing React Native MVVM structure. Views render state and forward events to ViewModels. ViewModels own validation, async workflow and draft state. Models and API adapters handle serialization, persistence and native services. Do not call fetch, SecureStore or backend mutation APIs directly from screen markup.

Use the authenticated request adapter for protected endpoints. Preserve session generation guards, expected versions and creation idempotency keys. Never replace an unsaved draft after a failed request or conflict. Reset account-scoped state on logout/account change.

Keep existing visuals and chat realtime transport unless the task explicitly changes them. Prefer small, feature-local helpers over generic base classes. Comments should explain a non-obvious constraint, without decorative symbols or redundant descriptions.

Run `npm run typecheck`, `npm test` and `npm run format:check`. Use `npm run format` for Prettier. Native smoke tests require the installed development build, Metro and a reachable backend; passing Node tests alone does not establish Android behavior. Use synthetic accounts and preserve existing emulator data.
