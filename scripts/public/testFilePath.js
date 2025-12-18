const path = require('path');
const fs = require('fs-extra');

// Path to the .env file
const envPath = path.resolve(__dirname, '../../', '.env');
console.log(envPath);    