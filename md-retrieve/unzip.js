const extract = require('extract-zip');
const path = require('path');

module.exports = (zipFile, unzipDir) => {
  return new Promise((resolve, reject) => {
    const absoluteUnzipDir = path.resolve(unzipDir);
    console.log(`Extracting ${zipFile} to ${absoluteUnzipDir}`);

    extract(zipFile, { dir: absoluteUnzipDir }, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve(absoluteUnzipDir);
    });
  });
};
