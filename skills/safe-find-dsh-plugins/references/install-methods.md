# Installation methods

Use the section that matches the repository's current declarations. When more
than one method exists, use this priority:

`bundle` > `cordis` > external manager (`marisa` / `mygo`).

Current DSH no longer supports the legacy `repository` format. If the repository
also provides a bundle, use the bundle. If it provides only legacy repository
metadata, stop and explain that it must be migrated.

`<profile>` below is the target profile (`web` for the Web surface).
`<dsh-source>` is the source checkout used to run DeepSeek Harness. Current DSH
commands run from that checkout with `pnpm dsh`; do not assume a global `dsh`
launcher exists.

## Bundle: profile bundle

A package whose `package.json` declares `dsh.bundle.patch` mounts its patch layer
when added to the profile:

```sh
cd <dsh-source>
pnpm dsh plugin --profile <profile> add <package-or-git-spec>
```

For a GitHub repository, use the current owner returned by topic search and pin a
reviewed commit when possible:

```sh
pnpm dsh plugin --profile <profile> add 'github:<owner>/<repo>#<commit>'
```

Preserve `&path:/<subdirectory>` when the README requires it. The command hands
the install to the profile's package manager and adds packages declaring
`dsh.bundle.patch` to `dsh.profile.bundles`.

Manual equivalent when the CLI is unavailable:

1. Add the package to `dependencies` in
   `$DSH_HOME/profiles/<profile>/package.json`. Use `github:<owner>/<repo>` for a
   GitHub source or `link:<path>` for local development.
2. Append the package name to `dsh.profile.bundles` in the same file. Array order
   is patch-layer order; shipped bundles remain first.
3. Run `pnpm install` in the profile directory.

## Repository: removed legacy format

Current DSH removed `@deepseek-ai/dsh-repository-plugin`, `.dsh-plugin`, the
repository cache, and their configuration rows. A plugin that exposes only the
legacy `repository` format cannot be installed. Report its URL and say that it
must migrate to a profile bundle. Do not write legacy configuration or claim it
is active.

## Cordis: bare Cordis plugin

A plain Cordis plugin has no patch layer. First add its package to the profile:

```sh
cd <dsh-source>
pnpm dsh plugin --profile <profile> add <package-or-git-spec>
```

The CLI may report that it installed an ordinary dependency. Then add an insert
entry to the top-level array in
`$DSH_HOME/profiles/<profile>/cordis.patch.yml`:

```yaml
- insert:
    - name: '<package-name>'
      config: {}
```

Populate `config` according to the plugin README. Prefer the repository's exact
mounting example when one is provided.

## Skill: skill directory

When a repository distributes a directory containing `SKILL.md`, clone it and
copy the complete skill directory into one discovery root:

- Project only: `<project-root>/.agents/skills/<skill-name>/`
- DSH user home: `$DSH_HOME/skills/<skill-name>/`
- Shared agent home: `${DSH_AGENTS_HOME:-~/.agents}/skills/<skill-name>/`

The skill watcher detects the directory without a restart.

## Marisa or MyGO: external managers

These formats are managed by their own community tools. This skill does not
install them directly. Use Marisa's `dshx install` and plugin settings panel, or
follow the MyGO repository's current README. If the required manager is absent,
show its repository and explain that it is a prerequisite.
