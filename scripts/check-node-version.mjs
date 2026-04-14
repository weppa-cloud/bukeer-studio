const requiredMajor = 22;
const current = process.versions.node;
const currentMajor = Number(current.split(".")[0]);

if (currentMajor !== requiredMajor) {
  console.error(
    `[node] Unsupported Node version ${current}. Use Node ${requiredMajor}.x for local/CI parity.`
  );
  process.exit(1);
}

console.log(`[node] OK ${current}`);
