# One release version for the whole repository

Only the root package `call-calendar` is versioned. A release is a `vX.Y.Z` tag, a GitHub Release, and a root `CHANGELOG.md` entry. `@calendar/spec`, `@calendar/server`, and `@calendar/web` stay `private` at `0.0.0` and are neither published nor versioned independently. The project has one deployable artifact (the Docker image), no npm consumers, and no internal package version ranges, so per-package releases would add synchronization noise without a user.

**Considered options:** per-package releases with the `node-workspace` plugin (accurate package versions, but nothing is published and every release would bump private manifests); a `simple` releaser backed by `version.txt` (avoids touching `package.json`, but hides the version from the package manifest and the tools that read it).

**Consequences:** the root `package.json` version is the release identity. The first release is `0.1.0` via `initial-version`; without it release-please starts at `1.0.0`. The TypeSpec/OpenAPI contract version is a separate artifact and keeps its own value. If a package becomes publishable, switch to a per-package manifest with a workspace plugin at that point.
