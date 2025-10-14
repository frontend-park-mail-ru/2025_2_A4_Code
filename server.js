const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DIST_PATH = path.join(__dirname, 'dist');

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.js': 'text/javascript; charset=UTF-8',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.hbs': 'text/plain',
    '': 'text/html; charset=UTF-8'
};

const STATIC_PATHS = [
    '/img/',
    '/css/',
    '/js/',
    '/components/'
];

function isStaticFile(pathname) {
    return STATIC_PATHS.some(prefix => pathname.startsWith(prefix));
}

function isApiRequest(pathname) {
    return pathname.startsWith('/api/');
}

function serveStatic(pathname, res) {
    const relative = pathname.replace(/^\/+/, '');
    let filePath = path.join(PUBLIC_DIR, relative);

    if (pathname === '/') {
        filePath = path.join(__dirname, 'index.html');
    }

    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File not found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000' 
            });
            res.end(content, 'utf-8');
        }
    });
}

function serveIndexHtml(res) {
    fs.readFile(path.join(__dirname, 'index.html'), (error, content) => {
        if (error) {
            res.writeHead(500);
            res.end('Server error: ' + error.code);
        } else {
            res.writeHead(200, { 
                'Content-Type': 'text/html; charset=UTF-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(content, 'utf-8');
        }
    });
}

function handleApiRequest(pathname, req, res) { 
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: req.url,
        method: req.method,
        headers: {
            ...req.headers,
            host: 'localhost:5000'
        }
    };
    
    const proxy = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });
    
    req.pipe(proxy, { end: true });
    
    proxy.on('error', (error) => {
        console.error('Proxy error:', error);
        res.writeHead(500);
        res.end('Error connecting to backend server');
    });
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;
    
    try {
        if (isApiRequest(pathname)) {
            handleApiRequest(pathname, req, res);
            return;
        }
        
        if (isStaticFile(pathname)) {
            serveStatic(pathname, res);
            return;
        }
        
        serveIndexHtml(res);
        
    } catch (error) {
        console.error('Request error:', error);
        res.writeHead(500);
        res.end('Internal server error');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}/`);
    console.log(`Proxying API requests to http://localhost:5000/`);
});

server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
        console.log('Server has been shut down');
        process.exit(0);
    });
});