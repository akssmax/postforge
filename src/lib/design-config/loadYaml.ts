import fs from "fs";
import path from "path";
import yaml from "js-yaml";

/** Parse a YAML string into an unknown object. */
export function parseYaml(raw: string): unknown {
  return yaml.load(raw);
}

/** Load and parse a YAML file from disk (Node/scripts only). */
export function loadYamlFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf8");
  return parseYaml(raw);
}

/** Load all YAML files in a directory (Node/scripts only). */
export function loadYamlDir(dirPath: string): unknown[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map((f) => loadYamlFile(path.join(dirPath, f)));
}
