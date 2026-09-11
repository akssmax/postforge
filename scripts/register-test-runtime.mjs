// Unit tests exercise server modules with the normal React runtime. Next's
// server-only marker is enforced by the production bundler, not this runner.
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: new URL("../node_modules/server-only/empty.js", import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
