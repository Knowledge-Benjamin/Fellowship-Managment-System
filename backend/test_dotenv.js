const dotenv = require('dotenv');
const path = require('path');

console.log('Current directory:', __dirname);
console.log('Expected .env path:', path.join(__dirname, '.env'));

// Try loading with explicit path
const result = dotenv.config({ path: path.join(__dirname, '.env'), debug: true });

console.log('\nDotenv result:', result);
console.log('\nEnvironment variables loaded:');
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'LOADED' : 'NOT LOADED');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'LOADED' : 'NOT LOADED');
