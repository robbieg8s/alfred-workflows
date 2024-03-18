This repository contains workflows for the [Alfred](https://www.alfredapp.com)
launcher for Mac, plus opinionated tooling for developing workflows.

The workflows included are

- Safari History: Search safari history by title substrings

The workflows and all tooling are written in typescript. The workflows execute
using the macOS `osascript` javascript interpreter, the tooling executes using
`node`. The associated toolchain is
- [Esbuild](https://esbuild.github.io) for transpilation and bundling of the
  workflows and tooling
- [Asdf](https://asdf-vm.com) for version management of tools
- [Pnpm](https://pnpm.io) for node package management
- [Tsx](https://github.com/privatenumber/tsx) for transpilation for testing
- [Node](https://nodejs.org/) [Test
  runner](https://nodejs.org/docs/latest/api/test.html) and
  [Assert](https://nodejs.org/docs/latest/api/assert.html) for tests
- [Prettier](https://prettier.io) and [ESLint](https://eslint.org) for code
  style

Both workflows and tooling strive for minimal external dependencies, using built
in executables for support rather than libraries. The tooling is intended to be
runnable in a suitably configured docker container also, but this is future
work.

The tooling workflow has five components:
- bundle-workflow to transpile for osascript
- export-workflow to build distributable workflows
- import-workflow to copy changes from Alfred UI to git workspace
- link-workflow to connect a git workspace to an installed workflow
- update-workflow to copy built workflow from git workspace to live
  install

No mechanism is currently provided for bootstrap from a workflow created in
Alfred to the git workspace.
