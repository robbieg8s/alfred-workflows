// There is no api.ts, so typescript will find out api.d.ts, and esbuild will pull in api.js
// This approach is a simplified for my needs form of that taken by
// https://www.npmjs.com/package/@jxa/global-type
// https://github.com/JXA-userland/JXA/tree/master/packages/@jxa/global-type
export * from "./api";

// These are just regular exports of helpers
export * from "./alfred.ts";
export * from "./appkit.ts";
export * from "./execute-process.ts";
export * from "./sundry.ts";
