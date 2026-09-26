const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);
const frontend = path.join(root, 'Frontend');
const server = path.join(root, 'Server');
const dist = path.join(root, 'dist');

fs.rmSync(dist, {
  recursive: true,
  force: true
});

fs.mkdirSync(dist, {
  recursive: true
});

function copyFrontendFiles() {
  for (const file of fs.readdirSync(frontend)) {
    const sourcePath = path.join(frontend, file);

    if (!fs.statSync(sourcePath).isFile()) {
      continue;
    }

    fs.copyFileSync(
      sourcePath,
      path.join(dist, file)
    );

    console.log(`Frontend: ${file}`);
  }
}

function copyServerFiles() {
  for (const file of fs.readdirSync(server)) {
    const sourcePath = path.join(server, file);

    if (!fs.statSync(sourcePath).isFile()) {
      continue;
    }

    const ext = path.extname(file);
    const baseName = path.basename(file, ext);

    let outputName = file;

    // Apps Script filenames must be unique regardless
    // of file extension.
    const frontendCollision = fs.readdirSync(dist)
      .some(existing =>
        path.basename(
          existing,
          path.extname(existing)
        ) === baseName
      );

    if (frontendCollision) {
      outputName = `${baseName}Server${ext}`;
    }

    fs.copyFileSync(
      sourcePath,
      path.join(dist, outputName)
    );

    console.log(
      `Server: ${file} -> ${outputName}`
    );
  }
}

copyFrontendFiles();
copyServerFiles();

const manifest = path.join(root, 'appsscript.json');

if (!fs.existsSync(manifest)) {
  throw new Error('Missing appsscript.json');
}

fs.copyFileSync(
  manifest,
  path.join(dist, 'appsscript.json')
);

console.log('Copied appsscript.json');

console.log('Apps Script build complete.');