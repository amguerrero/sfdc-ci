class Transformation {
  constructor(name) {
    this.name = name;
  }

  shouldTransform(fileName) {
    return fileName != null;
  }

  transform(fileContent) {
    return fileContent;
  }
}

module.exports = Transformation;
