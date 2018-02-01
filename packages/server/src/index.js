const express = require('express');
const path = require('path');
const GitHub = require('./github.js');
const shortid = require('shortid');
require('dotenv').config();

const app = express();
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'pug');

app.use('/assets', express.static(path.join(__dirname, '../public')));

app.use('/compare/:user/:repo/:from/:to', async (req, res) => {
  const {user, repo, from, to} = req.params;
  const root = 'root' in req.query ? (req.query.root + '/') : '';

  const github = GitHub(user, repo, process.env.GITHUB_TOKEN);

  if(!('files' in req.query && Array.isArray(req.query.files))) {
    res.status(400).json({ error: 'please provide a list of files' });
    return;
  }

  const paths = req.query.files.map(file => `${root}${file}`);

  try {
    const requests = [
      github.getDiff(from, to),
      ...paths.map(path => github.getContents(path, from)),
    ];

    const [diff, ...files] = await Promise.all(requests);

    const indexedDiffs = {};
    for(const diffFile of diff) {
      indexedDiffs[diffFile.to] = diffFile;
    }

    const indexedFiles = {};
    for(file of files) {
      const contents = Buffer.from(file.content, 'base64').toString();
      const lines = contents.split('\n');

      if(file.path in indexedDiffs) {
        const chunks = indexedDiffs[file.path].chunks;
        const blocks = chunks.map(chunk => ({
          from: chunk.oldStart - 1,
          to: (chunk.oldStart + chunk.oldLines - 1),
          content: chunk.changes.map(change => change.content),
        }));

        let start = 0;
        const regions = blocks.map(block => {
          before = lines.slice(start, block.from);
          start = block.to;
          return [...before, ...block.content];
        });

        regions.push(lines.slice(start));

        indexedFiles[file.path] = {
          id: shortid.generate(),
          path: file.path.slice(root.length),
          contents: [].concat(...regions).join('\n'),
          changed: true,
        };

      } else {
        indexedFiles[file.path] = {
          id: shortid.generate(),
          path: file.path.slice(root.length),
          contents,
          changed: false,
        };
      }
    }

    const flatFiles = Object.keys(indexedFiles).map(key => indexedFiles[key]);
    const active = flatFiles[0].id;

    res.render('compare', {
      root,
      active,
      files: flatFiles,
    });

  } catch(err) {
    console.log(err);
    res.status(400).end();
  }
});

app.use('/view/:user/:repo/:branch?', async (req, res) => {
  const {user, repo, branch = 'master'} = req.params;
  const root = 'root' in req.query ? (req.query.root + '/') : '';

  const github = GitHub(user, repo, process.env.GITHUB_TOKEN);

  if(!('files' in req.query && Array.isArray(req.query.files))) {
    res.status(400).json({ error: 'please provide a list of files' });
    return;
  }

  const paths = req.query.files.map(file => `${root}${file}`);
  const requests = paths.map(path => github.getContents(path, branch));

  try {
    const files = await Promise.all(requests);
    res.render('view', {settings: {root, files}});

  } catch(err) {
    console.log(err);
    res.status(400).end();
  }
});

app.listen(process.env.PORT || 3000);