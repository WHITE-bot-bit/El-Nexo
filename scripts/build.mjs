
import {
  cp,
  mkdir,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

const root = process.cwd();
const output = path.join(root, "dist");

// Generate the folder structure used by the Examples Explorer.
async function readExampleDirectory(
  directory,
  relativeDirectory = "examples",
) {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  const result = [];

  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const relativePath = `${relativeDirectory}/${entry.name}`;

    if (entry.isDirectory()) {
      result.push({
        name: entry.name,
        type: "folder",
        children: await readExampleDirectory(
          fullPath,
          relativePath,
        ),
      });
    } else if (/\.(js|jsx|css)$/i.test(entry.name)) {
      result.push({
        name: entry.name,
        type: "file",
        path: relativePath.split(path.sep).join("/"),
      });
    }
  }

  return result;
}

async function build() {
  console.log("Building El Nexo Developer Studio...");

  // Clean previous production output.
  await rm(output, {
    recursive: true,
    force: true,
  });

  await mkdir(output, {
    recursive: true,
  });

  // Preserve the original public URL structure.
  await cp(
    path.join(root, "playground"),
    path.join(output, "playground"),
    { recursive: true },
  );

  // Include framework runtime files.
  await cp(
    path.join(root, "src"),
    path.join(output, "src"),
    { recursive: true },
  );

  // Include all examples.
  await cp(
    path.join(root, "examples"),
    path.join(output, "examples"),
    { recursive: true },
  );

  // Generate a static replacement for GET /api/examples.
  const exampleTree = await readExampleDirectory(
    path.join(root, "examples"),
  );

  await writeFile(
    path.join(output, "examples", "index.json"),
    `${JSON.stringify(exampleTree, null, 2)}\n`,
    "utf8",
  );

  console.log("El Nexo production build completed.");
  console.log(
    "Included: playground, src, examples and examples/index.json",
  );
}

build().catch((error) => {
  console.error("El Nexo build failed:", error);
  process.exitCode = 1;
});
