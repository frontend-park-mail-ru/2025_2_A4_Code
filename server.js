const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.hbs': 'text/plain',
};

const server = http.createServer((req, res) => {
    // Получаем путь к файлу из URL
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    // Если путь начинается с /img/, /css/, /js/, /components/ — ищем в public
    if (
        req.url.startsWith('/img/') ||
        req.url.startsWith('/css/') ||
        req.url.startsWith('/js/') ||
        req.url.startsWith('/components/')
    ) {
        filePath = './public' + req.url;
    }

    // Определяем MIME тип файла
    const extname = path.extname(filePath);
    let contentType = MIME_TYPES[extname] || 'application/octet-stream';

    // Читаем файл
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // SPA: если не найден файл и это не API и не статика, отдаём index.html
                if (!filePath.startsWith('./api') && !path.extname(filePath)) {
                    fs.readFile('./index.html', (err, indexContent) => {
                        if (err) {
                            res.writeHead(500);
                            res.end('Server error: ' + err.code);
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(indexContent, 'utf-8');
                        }
                    });
                } else {
                    res.writeHead(404);
                    res.end('File not found');
                }
            } else {
                // Серверная ошибка
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            // Успешно
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/`);
});