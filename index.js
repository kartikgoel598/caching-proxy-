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

const server = http.createServer(async(req,res)=> {
    
})