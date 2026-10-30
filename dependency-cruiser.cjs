// Import-graph rules for the monorepo. Run with `pnpm deps:check`.
// Generated code (src/generated, src/sdk) is excluded: it is never edited by hand.
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-server-to-web",
      severity: "error",
      from: { path: "^packages/server/" },
      to: { path: "^packages/web/" },
    },
    {
      name: "no-web-to-server",
      severity: "error",
      from: { path: "^packages/web/" },
      to: { path: "^packages/server/" },
    },
    {
      name: "no-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)(dist|node_modules|src/generated|src/sdk)/" },
    tsConfig: { fileName: "tsconfig.base.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
