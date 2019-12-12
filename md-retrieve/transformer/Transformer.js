const fs = require('fs');
const path = require('path');

const Transformation = require('./Transformation');

class Transformer {
  constructor() {
    this.transformations = [];
  }

  use(transformation) {
    if (!(transformation instanceof Transformation)) {
      throw new Error( transformation + ' is not a Transformation instance');
    }

    this.transformations.push(transformation);

    return this;
  }

  transform(inputFile, outputFile) {
    if (!fs.existsSync(path.dirname(outputFile))) {
      fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    }

    let wasTransformed = false;

    const transformedContent = this.transformations
      .filter(tr => tr.shouldTransform(inputFile))
      .reduce((content, tr) => {
        wasTransformed = true;
        console.log(`Applying transformation: ${tr.name} on ${path.basename(inputFile)}`);
        content = tr.transform(content);

        return content;
      }, fs.readFileSync(inputFile, 'utf-8'));

    if (wasTransformed) {
      fs.writeFileSync(outputFile, transformedContent);
    } else {
      fs.copyFileSync(inputFile, outputFile);
    }
  }
}

module.exports = Transformer;
