const PORT = 8888;

const static = require('node-static');
const http = require('http');

const file = new(static.Server)('./dist');

http.createServer(function (req, res) {
	file.serve(req, res);
}).listen(PORT);

console.log('Visit http://localhost:' + PORT);
