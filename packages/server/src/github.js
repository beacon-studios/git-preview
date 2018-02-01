const realRequest = require('request-promise');
const diff = require('parse-diff');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const CACHE_PATH = path.join(__dirname, '../../../cache');

const createRequest = (token) => async (options) => {
  const headers = 'headers' in options ? options.headers : {};
  const mergedHeaders = {
    ...headers,
    'User-Agent': 'git-preview',
    'Authorization': `token ${token}`,
  };

  const mergedOptions = {
    ...options,
    headers: mergedHeaders,
  };

  if(process.env.CACHE_RESPONSES) {
    const hash = crypto.createHash('sha1').update(options.uri).digest('hex');
    const cacheFile = path.join(CACHE_PATH, hash);
    try {
      return JSON.parse(fs.readFileSync(cacheFile));

    } catch(e) {
      const response = await realRequest(mergedOptions);
      fs.writeFileSync(cacheFile, JSON.stringify(response));
      return response;
    }

  } else {
    return realRequest(mergedOptions);
  }
};

module.exports = (user, repo, token) => {
  const request = createRequest(token);

  return {
    async getContents(path, ref = 'master') {
      const uri = `https://api.github.com/repos/${user}/${repo}/contents/${path}?ref=${ref}`;
      return request({
        uri,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
        json: true,
      });
    },
    async getDiff(from, to) {
      const uri = `https://api.github.com/repos/${user}/${repo}/compare/${from}...${to}`;
      const raw = await request({
        uri,
        headers: {
          'Accept': 'application/vnd.github.VERSION.diff',
        }
      });

      return diff(raw);
    }
  }
};