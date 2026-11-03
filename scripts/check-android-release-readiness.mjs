// Checks explicit publication approval before producing an installable release.
// This script does not contact external services or require signing credentials.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const controllerFile = join(root, "lib/privacy/controller.json");
const noticeFile = join(root, "app/aviso-de-privacidad/page.tsx");
const rightsPage = join(root, "app/configuracion/privacidad/page.tsx");
const privacyApi = join(root, "app/api/privacy/requests/route.ts");

if (![controllerFile, noticeFile, rightsPage, privacyApi].every(existsSync)) {
  console.error("Release blocked: public privacy notice or rights-handling route is missing.");
  process.exit(1);
}

const controller = JSON.parse(readFileSync(controllerFile, "utf8"));
const valid = typeof controller.legalName === "string" &&
  controller.legalName.trim().length >= 5 &&
  typeof controller.address === "string" &&
  controller.address.trim().length >= 12 &&
  typeof controller.contactEmail === "string" &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(controller.contactEmail.trim()) &&
  controller.reviewedForPublication === true;

if (!valid) {
  console.error(
    "Release blocked: complete lib/privacy/controller.json with verified legal " +
    "name, address, contact email and reviewedForPublication=true after legal approval."
  );
  process.exit(1);
}
console.log("Privacy notice identity and approval gate passed. Live security checks still required.");
