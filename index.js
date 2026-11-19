const http = require('http');
const fs = require('fs');
const path = require('path');

//cache ko kaha store krna hai ek json file mai 
CACHE_DIR = path.join(__dirname, 'cache.json')

//load cache 
function loadCache() {
    try {
        return JSON.parse(fs.readFileSync(CACHE_DIR, 'utf-8'))
    }
    catch {
        return {}
    }
}

// ffunction to save cache in the file 
function saveCache(cache) {
    try {
        fs.writeFileSync(CACHE_DIR, JSON.stringify(cache))
    }
    catch {
        console.log('something happened while saving the cache')
    }
}

// function to parse the arguements 

function parseArgs(argv) {
    const args = {}
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        if (a === '--port') args.port = Number(argv[++i]);
        else if (a === '--origin') args.origin = argv[++i];
        else if (a === '--clear-cache') args.clearCache = true;
    }
    return args;
}
const args = parseArgs(process.argv.slice(2))

//clear cache and exit the file 

if (args.clearCache){
    saveCache({})
    console.log('cache is cleared')
    process.exit(0);
}

if (!args.port || !args.origin){
    console.error('Usage: caching-proxy --port <number> --origin <url>');
  console.error('       caching-proxy --clear-cache');
  process.exit(1);
}

const origin = args.origin.replace(/\/+$/, '')
const cache = loadCache()

const server = http.createServer(async (req, res) => {
  const key = `${req.method}:${req.url}`;

  
  const cacheable = req.method === 'GET';

  // ---- CACHE HIT ----
  if (cacheable && cache[key]) {
    const { status, headers, body } = cache[key];
    console.log(`HIT   ${key}`);
    res.writeHead(status, { ...headers, 'x-cache': 'HIT' });
    // Body ko base64 mein save kiya tha (images bhi support ho)
    return res.end(Buffer.from(body, 'base64'));
  }

  // ---- CACHE MISS
  try {
    
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const reqBody = Buffer.concat(chunks);

    
    const fwdHeaders = { ...req.headers };
    delete fwdHeaders.host;

    
    const upstream = await fetch(origin + req.url, {
      method: req.method,
      headers: fwdHeaders,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : reqBody,
    });
    const body = Buffer.from(await upstream.arrayBuffer());

    
    const headers = {};
    upstream.headers.forEach((value, name) => {
      if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(name)) {
        headers[name] = value;
      }
    });
    if (cacheable && upstream.ok) {
      cache[key] = { status: upstream.status, headers, body: body.toString('base64') };
      saveCache(cache);
    }

    console.log(`MISS  ${key} -> ${upstream.status}`);
    res.writeHead(upstream.status, { ...headers, 'x-cache': 'MISS' });
    res.end(body);
  } catch (err) {
    console.error(`ERROR ${key}: ${err.message}`);
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end('Bad Gateway: could not reach origin');
  }
});

server.listen(args.port, () => {
  console.log(`Caching proxy running on http://localhost:${args.port} -> ${origin}`);
});

