#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const candidateFiles = [
  ".open-next/server-functions/default/handler.mjs",
  ".open-next/server-functions/default/node_modules/next/dist/server/next-server.js",
  ".open-next/server-functions/default/node_modules/next/dist/esm/server/next-server.js",
  ".open-next/server-functions/default/node_modules/next/dist/compiled/next-server/server.runtime.prod.js",
  "node_modules/next/dist/server/next-server.js",
  "node_modules/next/dist/esm/server/next-server.js",
  "node_modules/next/dist/compiled/next-server/server.runtime.prod.js",
];

const badRequirePatterns = [
  /getMiddlewareManifest\(\)\s*\{\s*return this\.minimalMode\s*\?\s*null\s*:\s*require\(this\.middlewareManifestPath\);?\s*\}/g,
  /getMiddlewareManifest\(\)\s*\{\s*return this\.minimalMode\s*\?\s*null\s*:\s*__require\(this\.middlewareManifestPath\);?\s*\}/g,
  /return this\.minimalMode\s*\?\s*null\s*:\s*require\(this\.middlewareManifestPath\);?/g,
  /return this\.minimalMode\s*\?\s*null\s*:\s*__require\(this\.middlewareManifestPath\);?/g,
];

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) return { filePath, status: "missing" };

  const original = fs.readFileSync(filePath, "utf8");
  let next = original;

  for (const pattern of badRequirePatterns) {
    next = next.replace(pattern, (match) => {
      if (match.startsWith("getMiddlewareManifest")) {
        return "getMiddlewareManifest(){return null}";
      }
      return "return null";
    });
  }

  if (next !== original) {
    fs.writeFileSync(filePath, next);
    return { filePath, status: "patched" };
  }

  return { filePath, status: "unchanged" };
}

const results = candidateFiles.map((relativePath) =>
  patchFile(path.join(root, relativePath)),
);

const checkedFiles = results.filter((result) => result.status !== "missing");
const remainingBadRequires = checkedFiles.filter((result) => {
  const contents = fs.readFileSync(result.filePath, "utf8");
  return (
    contents.includes("require(this.middlewareManifestPath)") ||
    contents.includes("__require(this.middlewareManifestPath)")
  );
});

for (const result of results) {
  console.log(`${result.status}: ${path.relative(root, result.filePath)}`);
}

if (checkedFiles.length === 0) {
  console.error("No OpenNext or Next runtime files were found to patch.");
  process.exit(1);
}

if (remainingBadRequires.length > 0) {
  console.error("OpenNext middleware manifest dynamic require still present:");
  for (const result of remainingBadRequires) {
    console.error(`- ${path.relative(root, result.filePath)}`);
  }
  process.exit(1);
}
