const fs = require('fs');
const path = require('path');

const findRepositoryRootDirectory = (dirPath) => {
    const splitPath = dirPath.split(path.sep);
    if (fs.existsSync(`${dirPath}${path.sep}.git`)) {
        return dirPath;
    }
    if (splitPath.length == 1) {
        throw new Error('Delta deployment should run in a git repository.')
    }
    splitPath.splice(-1, 1);
    return findRepositoryRootDirectory(splitPath.join(path.sep))
};

const  config = {
    DEFAULT_TO_COMMIT: process.env.DEFAULT_TO_COMMIT || 'master',
    REPOSITORY_ROOT_DIRECTORY: process.env.REPOSITORY_ROOT_DIRECTORY || findRepositoryRootDirectory(path.resolve('.')),
    SFDC_API_VERSION: process.env.SFDC_API_VERSION || '47.0',
};

module.exports = config;
