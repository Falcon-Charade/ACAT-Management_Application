const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5173;

const PROJECT_ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(PROJECT_ROOT, 'Index.html');

app.get('/dev/google-script-run.js', (_req, res) => {
  res.sendFile(path.join(__dirname, 'google-script-run.js'));
});

app.get('/', (_req, res) => {
  let html = fs.readFileSync(INDEX_PATH, 'utf8');

  html = html.replace(
    '</head>',
    '  <script src="/dev/google-script-run.js"></script>\n</head>'
  );

  res.type('html').send(html);
});

app.listen(PORT, () => {
  console.log(`ACAT local mock running at http://localhost:${PORT}`);
  console.log(`Serving: ${INDEX_PATH}`);
});
