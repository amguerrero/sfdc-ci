const fs = require('fs');
const path = require('path');

const unzip = require('./unzip');

const {
  Transformer,
} = require('./transformer');
const CustomObjectTransformation = require('./transformer/CustomObjectTransformation');
const DeployPackageXmlTransformation = require('./transformer/DeployPackageXmlTransformation');

const tr1 = new Transformer();

tr1
  .use(new CustomObjectTransformation('Clean Object files'))
  .use(new DeployPackageXmlTransformation('Convert package.xml to deploy mode'));

unzip('test.zip', 'test')
.then(unzipDir => {
  console.log(unzipDir);
  console.log('Unzipped...');

  const inputDir = path.join(unzipDir, 'unpackaged');
  getAllFiles(inputDir).forEach(file => {
    const relatives = path.relative(inputDir, file);
    const outputFile = path.resolve('transformed', relatives);

    tr1.transform(file, outputFile);
  });
})
.catch((err) => {
  console.log(err);
});

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

