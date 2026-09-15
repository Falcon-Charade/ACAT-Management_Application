const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5173;

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FRONTEND_ROOT = path.join(PROJECT_ROOT, 'Frontend');
const INDEX_PATH = path.join(FRONTEND_ROOT, 'Index.html');

function processIncludes(html) {
  return html.replace(
    /<\?!=\s*include\(['"](.+?)['"]\);\s*\?>/g,
    (_, filename) => {
      const filePath = path.join(
        FRONTEND_ROOT,
        `${filename}.html`
      );

      if (!fs.existsSync(filePath)) {
        console.warn(
          `[ACAT DEV] Include not found: ${filename}`
        );

        return '';
      }

      const content = fs.readFileSync(
        filePath,
        'utf8'
      );

      return processIncludes(content);
    }
  );
}

app.get(
  '/dev/google-script-run.js',
  (_req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        'google-script-run.js'
      )
    );
  }
);

app.get('/', (_req, res) => {
  let html = fs.readFileSync(
    INDEX_PATH,
    'utf8'
  );

  // Emulate Apps Script <?!= include(...) ?>.
  html = processIncludes(html);

  // Add the local google.script.run mock.
  html = html.replace(
    '</head>',
    `  <script src="/dev/google-script-run.js"></script>
</head>`
  );

  res.type('html').send(html);
});

app.listen(PORT, () => {
  console.log(
    `ACAT local mock running at http://localhost:${PORT}`
  );

  console.log(
    `Serving: ${INDEX_PATH}`
  );
});