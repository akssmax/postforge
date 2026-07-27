import type { ArtifactCapabilities, RendererId } from "@/lib/design-config/schemas";
import { resolveRenderer } from "@/lib/design-engine/canvasSpec";

export { resolveRenderer };

export function routeRenderer(
  capabilities: ArtifactCapabilities,
  explicit?: RendererId,
): RendererId {
  return resolveRenderer(capabilities, explicit);
}
