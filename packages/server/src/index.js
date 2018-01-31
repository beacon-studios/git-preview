const express = require('express');
const request = require('request-promise');

const app = express();

app.use('/:user/:repo/:branch?', async (req, res) => {
  const username = req.query.username;
  const token = req.query.token;

  const {user, repo, branch = 'master'} = req.params;

  const root = 'root' in req.query ? req.query.root : '';

  if('files' in req.query && Array.isArray(req.query.files)) {
    const requests = req.query.files.map(file => {
      return request({
        uri: `https://api.github.com/repos/${user}/${repo}/contents/${root}/${file}`,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'git-preview',
          'Authorization': `token ${token}`,
        },
        json: true,
      });
    });

    try {
      const responses = await Promise.all(requests);
      let doc = `<!DOCTYPE html>
      <html>
      <head>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.10.0/themes/prism-okaidia.min.css" rel="stylesheet" />
        <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.10.0/prism.min.js" ></script>
      </head>
      <body>`;

      for(const response of responses) {
        const displayName = response.path.replace(root + '/', '');
        doc += `<strong>${displayName}</strong>`;
        doc += `<pre><code class="language-javascript">${Buffer.from(response.content, 'base64')}</code></pre>`;
      }

      doc += '</body></html>';
      res.end(doc);

    } catch(err) {
      console.log(err);
      res.status(400).end();
    }

  } else {
    res.status(400).json({ error: 'please provide a list of files' });
  }
});

app.listen(process.env.PORT || 3000);