const convert = require('xml-js');

const Transformation = require('./Transformation');

class CustomObjectTransformation extends Transformation {
  constructor(name) {
    super((name) ? name : 'CustomObjectTransformation');
  }

  shouldTransform(fileName) {
    return fileName.endsWith('.object');
  }

  transform(fileContent) {
    const objContent = convert.xml2js(fileContent, { compact: true });
    delete objContent.CustomObject.listViews;

    const objString = JSON.stringify(objContent, (name, value) => {
      if (name === '_text') {
        value = value.replace(/"/g, '#quot;').replace(/'/g, '#apos;');
      }

      return value;
    });

    return convert.js2xml(JSON.parse(objString), { compact: true, spaces: 4 })
      .replace(/#quot;/g, '&quot;')
      .replace(/#apos;/g, '&apos;');
  }
}

module.exports = CustomObjectTransformation;
