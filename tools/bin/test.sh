#!/bin/zsh -f

# This is an external script, and not embedded in package.json, so we can add
# comments and because it's bit long for one line.

# Disable ExperimentalWarning because we use a JSON module
# import tsx/esm to get a typescript loader
# import register-file-loader is our clone of esbuild file loader
# The loader order matters - this order ensures the ts loader is available for our loader
# Forward arguments from the invocation - notably --watch
# And pass the test pattern through - the glob is quoted for node to interpret
# We invoke pnpm to invoke node so that it can set up the right paths.
cd "${ZSH_ARGZERO:h:h:A}" && exec pnpm exec node \
  --disable-warning=ExperimentalWarning \
  --import tsx/esm \
  --import './test/register-file-loader.ts' \
  "$@" \
  --test 'src/**/*.test.ts'
