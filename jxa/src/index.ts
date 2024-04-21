// The .js files here are empty place holders to satisfy the bundler esbuild.
// They each have corresponding hand written .d.ts files which the typescript
// compiler tsc will find and use. These describe (a subset of) the interface
// exposed by the JXA / scripting additions infrastructure for typechecking.
// This approach is a simplified and adapted for my needs form of that taken by
// https://www.npmjs.com/package/@jxa/global-type
// https://github.com/JXA-userland/JXA/tree/master/packages/@jxa/global-type
export * from "./api.js";

// These are just regular exports of helpers
export * from "./alfred.ts";
export * from "./appkit.ts";
export * from "./execute-process.ts";
export * from "./sundry.ts";
