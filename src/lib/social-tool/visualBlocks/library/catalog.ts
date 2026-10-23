import { ILLUSTRATION_LIBRARY } from "./illustrations/manifest";
import { THREED_LIBRARY } from "./threeD/manifest";
import { PARAMETRIC_VISUAL_LIBRARY, type VisualLibraryPattern } from "./parametricCatalog";
import { registerVisualTagFrequencies } from "./scoring";

// Asset manifests (~2,300 entries) live here; client code should import ./parametricCatalog.
export {
  isAssetPattern,
  isIllustrationPattern,
  isParametricPattern,
  isThreeDPattern,
  PARAMETRIC_VISUAL_LIBRARY,
  type AssetLibraryEntry,
  type ParametricVisualPattern,
  type VisualLibraryPattern,
} from "./parametricCatalog";

export const VISUAL_LIBRARY: VisualLibraryPattern[] = [
  ...PARAMETRIC_VISUAL_LIBRARY,
  ...ILLUSTRATION_LIBRARY,
  ...THREED_LIBRARY,
];

export const VISUAL_LIBRARY_BY_ID = new Map(VISUAL_LIBRARY.map((entry) => [entry.id, entry]));

registerVisualTagFrequencies(VISUAL_LIBRARY);
