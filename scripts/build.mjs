
import { cp, mkdir, rm, writeFile } from "node:fs/promises";

const root = process.cwd();
const output = `${root}/dist`;

async function build() {
  console.log("Building El Nexo Developer Studio...");

  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });

  // Preserve the original playground folder structure.
  await cp(`${root}/playground`, `${output}/playground`, {
    recursive: true,
  });

  // Include the framework runtime and examples.
  await cp(`${root}/src`, `${output}/src`, {
    recursive: true,
  });

  await cp(`${root}/examples`, `${output}/examples`, {
    recursive: true,
  });

  console.log("El Nexo production files copied to dist/");
  console.log("Included: playground, src, examples");
}

build().catch((error) => {
  console.error("El Nexo build failed:", error);
  process.exitCode = 1;
});
