const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../server_src/command.js');
const fileContent = fs.readFileSync(filePath, 'utf8');

const lines = fileContent.split('\n');
let insideDevBlock = false;
let updatedLines = [];

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Start of dev block (around line 482)
    if (line.includes('// DEVELOPER MODE COMMANDS')) {
        insideDevBlock = true;
    }

    // End of dev block (before 'if (Config.getValue(`debug`, false))')
    if (line.includes('if (Config.getValue(`debug`, false))')) {
        insideDevBlock = false;
    }

    if (insideDevBlock && line.includes('ADMINPLUS')) {
        line = line.replace('ADMINPLUS', 'EVERYONE');
        console.log(`Unlocked command at line ${i + 1}`);
    }

    updatedLines.push(line);
}

fs.writeFileSync(filePath, updatedLines.join('\n'));
console.log('Successfully unlocked developer commands!');
