const minMajor = 22;
const current = process.versions.node;
const currentMajor = Number(current.split(".")[0]);

if (currentMajor < minMajor) {
  console.error(
    `[node] Unsupported Node version ${current}. Requires Node ${minMajor}+ for compatibility.`
  );
  process.exit(1);
}

console.log(`[node] OK ${current}`);
