const fs = require('fs');
const path = require('path');

// Path to the .env file
const envPath = path.resolve(__dirname, '.env');

// Function to update specific keys in the .env file
function updateEnvKey(key, value) {
    // Read the .env file line by line
    const envLines = fs.readFileSync(envPath, 'utf-8').split('\n');

    // Update the specific key or add it if it doesn't exist
    let keyFound = false;
    const updatedLines = envLines.map(line => {
        if (line.startsWith(`${key}=`)) {
            keyFound = true;
            return `${key}=${value}`; // Update the key with the new value
        }
        return line; // Keep the line unchanged
    });

    // If the key was not found, add it to the end of the file
    if (!keyFound) {
        updatedLines.push(`${key}=${value}`);
    }

    // Write the updated lines back to the .env file
    fs.writeFileSync(envPath, updatedLines.join('\n'));
    console.log(`Updated ${key} in .env to: ${value}`);
}

module.exports = {
    updateEnvKey
};