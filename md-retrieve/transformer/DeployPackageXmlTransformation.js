const convert = require('xml-js');

const Transformation = require('./Transformation');

class DeployPackageXmlTransformation extends Transformation {
  constructor(name) {
    super((name) ? name : 'CustomObjectTransformation');
    this.mdNotToDeploy = [ 'AssignmentRules', 'EntitlementProcess' ];
  }

  shouldTransform(fileName) {
    return fileName.endsWith('package.xml');
  }

  transform(fileContent) {
    const objContent = convert.xml2js(fileContent, { compact: true });
    let types = objContent.Package.types;
    if (!Array.isArray(types)) {
      types = [ types ];
    }

    objContent.Package.types = types.filter(type => this._shouldDeploy(type.name['_text']));

    return convert.js2xml(objContent, { compact: true, spaces: 4 });
  }

  _shouldDeploy(type) {
    return !this.mdNotToDeploy.includes(type);
  }
}

module.exports = DeployPackageXmlTransformation;
