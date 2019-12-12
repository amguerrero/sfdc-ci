const fs = require('fs');
const path = require('path');
const sfdc = require('jsforce');

const config = require('./config');
const CustomObjectTransformation = require('./transformer/CustomObjectTransformation');
const DeployPackageXmlTransformation = require('./transformer/DeployPackageXmlTransformation');
const { Transformer } = require('./transformer');
const unzip = require('./unzip');

if (config['print-config']) {
  Object.keys(config).filter(key => {
    return key.match(/password/i) === null;
  })
  .forEach(key => {
    console.log(`${key}: ${config[key]}`);
  })
}

const sfdcConnection = new sfdc.Connection({
  loginUrl: config['sfdc-login-url']
});

sfdcConnection.login(config['sfdc-username'], config['sfdc-password'])
.then(async (userInfo) => {

  const mdTypes = config['metadata-types'].map(mdt => {
    return { type: mdt };
  });

  const retrievePackage = {
    _declaration: { _attributes: { version: "1.0", encoding: "utf-8" } },
    Package: {
      version: config['api-version'],
      types: []
    }
  };

  const installedPackages = await sfdcConnection.metadata.list({ type: 'InstalledPackage' }, config['api-version']);

  const nameSpacePrefixes = installedPackages.reduce((prev, current) => {
    prev.add(current.namespacePrefix);

    return prev;
  }, new Set());

  console.log(`Found ${nameSpacePrefixes.size} installed packages`);

  // Get metadata info and build package to retrieve metadata from SF org.
  let i, j, mdTypesChunk, chunkSize = 3;
  for (i = 0, j = mdTypes.length; i < j; i += chunkSize) {
    mdTypesChunk = mdTypes.slice(i, i + chunkSize);
    console.log('Retrieving metadata for:', mdTypesChunk.map(mdt => mdt.type));
    const metadataChunk = await sfdcConnection.metadata.list(mdTypesChunk, config['api-version']);
    if (metadataChunk) {
      const foundMdTypes = metadataChunk
      .filter(mdt => {
        return mdt.type == 'CustomObject' // Bring the managed packages for CustomObjects
          || !nameSpacePrefixes.has(mdt.fullName.substring(0, mdt.fullName.indexOf('__')));
      })
      .reduce((prev, current) => {
        if (prev[current.type]) {
          prev[current.type].push(current.fullName);
        } else {
          prev[current.type] = [ current.fullName ];
        }

        return prev;
      }, {});

      Object.keys(foundMdTypes).sort().forEach(key => {
        console.log(`${key} has ${foundMdTypes[key].length} records`);
        foundMdTypes[key].sort();
        retrievePackage.Package.types.push({members: foundMdTypes[key], name: key});
      });
    }
  }

  console.log('Retrieving from server...');
  sfdcConnection.metadata.pollTimeout = config['poll-timeout'] * 1000;
  sfdcConnection.metadata.pollInterval = config['poll-interval'] * 1000;

  const writeZipStream = fs.createWriteStream(path.join(config['retrieve-dir'], 'unpackaged.zip'));
  writeZipStream.on('ready', () => {
    console.log('"unpackaged.zip" file is ready to start copying...');
  });
  writeZipStream.on('finish', () => {
    console.log('Retrieve has finished successfully.');
    console.log('Extracting unpackaged.zip...');
    unzip(path.join(config['retrieve-dir'], 'unpackaged.zip'), config['retrieve-dir'])
    .then((dirPath) => {
      const extractedPath = path.join(dirPath, 'unpackaged');

      const transformer = new Transformer();
      transformer
        .use(new CustomObjectTransformation('Clean ListViews'))
        .use(new DeployPackageXmlTransformation('Convert package.xml to deploy mode'));;

      getAllFiles(extractedPath).forEach(file => {
        const relativeFilePath = path.relative(extractedPath, file);
        const outputFile = path.resolve(config['salesforce-src'], relativeFilePath);

        transformer.transform(file, outputFile);
      });

      if (config['save-retrieve-package-xml']) {
        console.log('Copying package.xml to retrieve-package.xml');
        fs.copyFileSync(path.join(extractedPath, 'package.xml'), path.join(config['salesforce-src'], 'retrieve-package.xml'));
      }
    })
    .catch(console.error);
  });

  sfdcConnection.metadata
  .retrieve({ unpackaged: retrievePackage.Package })
  .stream().pipe(writeZipStream);
})
.catch(console.error);

const getAllFiles = (inputDir) => {
  let allFiles = [];
  for (const fileOrDir of fs.readdirSync(inputDir)) {
    const fileOrDirPath = path.join(inputDir, fileOrDir);
    if (fs.lstatSync(fileOrDirPath).isFile()) {
      allFiles.push(fileOrDirPath);
    } else {
      allFiles = [...allFiles, ...getAllFiles(fileOrDirPath)];
    }
  }

  return allFiles;
};
