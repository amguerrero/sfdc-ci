const commandLineArgs = require('command-line-args');

const config = require('../config');

let commandLineArgsDefinitions = config.commandLineArgsDefinitions;
if (!commandLineArgsDefinitions) {
    commandLineArgsDefinitions = [
        { name: 'from', type: String, alias: 'f' },
        { name: 'to', type: String, alias: 't' },
        { name: 'salesforce-src', type: String, alias: 's' },
        { name: 'delta-dir', type: String, alias: 'd' },
        { name: 'api-version', type: String, alias: 'a' },
    ];
}

module.exports = commandLineArgs(commandLineArgsDefinitions);
