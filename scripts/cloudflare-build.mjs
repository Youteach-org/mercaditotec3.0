import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("[cloudflare] Installing isolated deployment tooling...");
run("npm", [
  "install",
  "--no-save",
  "--package-lock=false",
  "@opennextjs/cloudflare@1.19.4",
  "wrangler@4.132.0",
]);

console.log("[cloudflare] Running existing test suite...");
run("npm", ["test"]);

console.log("[cloudflare] Building Next.js app through OpenNext...");
run("npx", ["opennextjs-cloudflare", "build"]);

console.log("[cloudflare] Build complete. Worker output: .open-next/worker.js");
