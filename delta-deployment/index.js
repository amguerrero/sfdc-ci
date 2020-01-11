const DeltaDeployment = require('delta-deployment-core');
const config = require('./config');
const cliArgs = require('./commandLineArgs');
const path = require('path');

let fromCommit = cliArgs.from;
let toCommit = cliArgs.to || config.DEFAULT_TO_COMMIT;
let deltaDir = cliArgs['delta-dir'] || path.resolve(config.REPOSITORY_ROOT_DIRECTORY, './delta');
let apiVersion = cliArgs['api-version'] || config.SFDC_API_VERSION;

if (!path.isAbsolute(deltaDir)) {
  deltaDir = path.resolve(deltaDir);
}
let sfSrc = cliArgs['salesforce-src'] || config.REPOSITORY_ROOT_DIRECTORY;
if (!path.isAbsolute(sfSrc)) {
  sfSrc = path.resolve(sfSrc);
}

new DeltaDeployment(config.REPOSITORY_ROOT_DIRECTORY)
  .withApiVersion(apiVersion)
  .createDelta(sfSrc, fromCommit, 
    toCommit, deltaDir)
  .then(console.log)
  .catch(console.error);
