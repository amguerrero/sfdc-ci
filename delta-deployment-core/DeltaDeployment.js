const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const config = require('./config');
const GitClient = require('./GitClient');

const DEFAULT_TO_BRANCH = 'master';
const DEFAULT_DELTA_DIR = `.${path.sep}delta`;

class DeltaDeployment {

  constructor(gitRootDir) {
    this.gitClient = new GitClient(gitRootDir);
  }

  withApiVersion(apiVersion) {
    this.apiVersion = apiVersion;

    return this;
  }

  async createDelta(sfMetadataDir, from, to = DEFAULT_TO_BRANCH, deltaDir = DEFAULT_DELTA_DIR) {
    await this.gitClient.git.fetch();

    const branches = await this.gitClient.git.branch();
    if (from === undefined) {
      from = branches.current;
    }
    if (sfMetadataDir === undefined) {
      sfMetadataDir = this.gitClient.gitRootDir;
    }

    await Promise.all([ this.gitClient.assertBranchExists(from), this.gitClient.assertBranchExists(to) ]);

    const diffForSrc = await this.gitClient.diffForDir(from, to, sfMetadataDir);
    const affectedFiles = diffForSrc
      .reduce((accum, currentValue) => {
        if (!accum[currentValue.change]) {
          accum[currentValue.change] = [];
        }
        if (currentValue.files[0].endsWith('-meta.xml')
          || !accum[currentValue.change].includes(currentValue.files[0].replace('-meta.xml', ''))) {
            accum[currentValue.change].push(currentValue.files[0].replace('-meta.xml', ''));
            accum[currentValue.change].push(currentValue.files[0]);
        } else if (!currentValue.files[0].endsWith('-meta.xml')
            || !accum[currentValue.change].includes(currentValue.files[0])) {
          accum[currentValue.change].push(currentValue.files[0]);
        }
        if (this._requiresMetaXml(currentValue.files[0])) {
          accum[currentValue.change].push(currentValue.files[0] + '-meta.xml');
        }

        return accum;
      }, {});
    
    const modifiedAddedFiles = [];
    if (affectedFiles['M']) {
      modifiedAddedFiles.push(...affectedFiles['M']);
    }
    if (affectedFiles['A']) {
      modifiedAddedFiles.push(...affectedFiles['A']);
    }

    const deletedFiles = [];
    if (affectedFiles['D']) {
      deletedFiles.push(...affectedFiles['D']);
    }

    const promises = [this._createDeploymentPackage(modifiedAddedFiles, from, path.join(deltaDir, 'deployment'))];

    if (deletedFiles) {
      promises.push(
          this._createDestructiveChangesPackage(deletedFiles, path.join(deltaDir, 'destructiveChanges'))
      );
    }
    const [ createDeploymentPackageResult, destructiveChangesResult ] = await Promise.all(promises);

    const result = {
      message: `Created Delta Deployment from ${from} to ${to}`,
      from, to,
      deploymentPackage: {
        dir: createDeploymentPackageResult.deploymentPackageDir
      }
    };

    if (destructiveChangesResult) {
      result.destructiveChanges = {
        dir: destructiveChangesResult.destructiveChangesDir
      };
    }
    return result
  }

  async _createDeploymentPackage(modifiedAddedFiles, from, deploymentPackageDir) {
    const filesToRetrieve = new Set();
    const modifiedAuraComponents = new Set();
    const emailTemplateMembers = [];
    modifiedAddedFiles.forEach(file => {
      const splitPath = file.split(path.sep);
      let auraIdx = splitPath.indexOf('aura');
      auraIdx = (auraIdx > -1) ? auraIdx : splitPath.indexOf('lwc');
      if (auraIdx > -1) {
        // Adding all the possible files of lightning markup
        splitPath.pop();
        const pathBase = splitPath.join(path.sep);
        modifiedAuraComponents.add(pathBase);
      } else {
        filesToRetrieve.add(file);

        if (splitPath.indexOf('email') > -1
            && !splitPath[splitPath.length - 1].endsWith('-meta.xml')) {
          let emailTemplateMember = splitPath.slice(splitPath.indexOf('email') + 1).join('/');
          emailTemplateMember = emailTemplateMember.substring(0, emailTemplateMember.lastIndexOf('.email'));
          emailTemplateMembers.push(emailTemplateMember);
        }
      }
    });

    const auraFiles = await Promise.all([...modifiedAuraComponents].map(auraComponent => {
      return this.gitClient.retrieveFileListFromDir(auraComponent, from);
    }));

    const retrieveFilePromises = await [...filesToRetrieve, ...auraFiles.flat(2)].map((modifiedFile) => {
      const splitPath = modifiedFile.split(path.sep);

      let relativePathOnDelta = splitPath.slice(-2);
      if (this._shouldCopySubdirectories(splitPath)) {
        relativePathOnDelta = splitPath.slice(-3);
      }
      const absolutePathOnDelta = path.resolve(deploymentPackageDir, ...relativePathOnDelta);
      this._createDirRecursive(path.dirname(absolutePathOnDelta));

      return this.gitClient.retireveFile(modifiedFile, from, absolutePathOnDelta);
    });

    // Copy static package.xml
    fs.copyFileSync(path.resolve(__dirname, 'static', 'package.xml'), path.resolve(deploymentPackageDir, 'package.xml'));
    const packageStaticPath = path.resolve(__dirname, 'static', 'package.xml');
    const packageDeltaPath = path.resolve(deploymentPackageDir, 'package.xml');

    const packageObject = await this._parseXml(packageStaticPath);
    packageObject.Package.version = [ this.apiVersion ];
    if (emailTemplateMembers.length > 0) {
      packageObject.Package.types.push({members: emailTemplateMembers, name: ['EmailTemplate']});
    }
    fs.writeFileSync(packageDeltaPath, new xml2js.Builder().buildObject(packageObject));

    await Promise.all(retrieveFilePromises);

    return {
      successful: true,
      message: 'Deployment package created successfully',
      deploymentPackageDir
    };
  }

  async _createDestructiveChangesPackage(deletedFiles, destructiveChangesDir) {
    this._createDirRecursive(path.resolve(destructiveChangesDir));

    const emptyPackageXml = path.resolve(__dirname, 'static', 'destructiveChanges', 'package.xml');
    const packageXmlObject = await this._parseXml(emptyPackageXml);
    packageXmlObject.Package.version = [ this.apiVersion ];
    fs.writeFileSync(
        path.resolve(destructiveChangesDir, 'package.xml'),
        new xml2js.Builder().buildObject(packageXmlObject)
    );

    const cleanDeletedFiles = deletedFiles.reduce((result, currentFile) => {
      if (!currentFile.endsWith('-meta.xml')) {
        const fileName = path.basename(currentFile, path.extname(currentFile));
        const currentFileParts = path.dirname(currentFile).split(path.sep);
        const metadataFolder = this._getMetadataType(currentFileParts[currentFileParts.length - 1]);

        if (metadataFolder) {
          if (!result[metadataFolder]) {
            result[metadataFolder] = {
              name: [metadataFolder],
              members: new Set()
            };
          }

          result[metadataFolder].members.add(fileName);
        }
      }

      return result;
    }, {});

    const destructiveChangesXml = path.resolve(destructiveChangesDir, 'destructiveChanges.xml');
    const destructiveChangesObject = await this._parseXml(emptyPackageXml);
    destructiveChangesObject.Package.version = [ this.apiVersion ];
    destructiveChangesObject.Package.types = [];
    Object.values(cleanDeletedFiles).forEach(v => {
      destructiveChangesObject.Package.types.push({
        members: Array.from(v.members),
        name: v.name
      });
    });
    fs.writeFileSync(destructiveChangesXml, new xml2js.Builder().buildObject(destructiveChangesObject));

    return {
      success: true,
      destructiveChangesDir
    };
  }

  _getMetadataType(folderName) {
    return (config.metdataTypes && config.metdataTypes[folderName]) ?
      config.metdataTypes[folderName] :
      undefined;
  }

  _parseXml(pathToXmlFile) {
    return new Promise((resolve, reject) => {
      const xmlFileContent = fs.readFileSync(pathToXmlFile, 'utf8');
      xml2js.parseString(xmlFileContent, (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    })
  }

  _shouldCopySubdirectories(splitPath) {
    return splitPath.indexOf('aura') > -1 
      || splitPath.indexOf('lwc') > -1
      || splitPath.indexOf('email') > -1;
  }

  _requiresMetaXml(fileName) {
    const extension = path.extname(fileName).substring(1);

    return ['app', 'cmp', 'cls', 'component', 'evt',
            'email', 'intf', 'page', 'resource', 'trigger']
      .includes(extension);
  }

  _createDirRecursive(dir) {
    if(!fs.existsSync(dir)) {
      this._createDirRecursive(path.resolve(dir, '..'));
      fs.mkdirSync(dir);
    }
  }
}

module.exports = DeltaDeployment;
