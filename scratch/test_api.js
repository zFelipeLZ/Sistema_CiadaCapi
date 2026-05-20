const http = require('http');

console.log('Testing /api/backup/list...');
http.get('http://localhost:3000/api/backup/list', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('HEADERS:', res.headers);
    try {
      console.log('RESPONSE:', JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log('RAW DATA:', data);
    }
    process.exit(0);
  });
}).on('error', (err) => {
  console.error('Fetch error:', err.message);
  process.exit(1);
});
