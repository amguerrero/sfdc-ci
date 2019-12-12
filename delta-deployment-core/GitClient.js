const fs = require('fs');
const path = require('path');

class GitClient {
  constructor(gitRootDir) {
    this.gitRootDir = this._validateAndGetGitRootDir(gitRootDir || path.resolve('.'));
    this.git = require('simple-git/promise')(this.gitRootDir);
    this.git.branch()
      .then(branches => {
        this.branches = branches;
      });
  }

  async assertBranchExists(branch, fetchBeforeCheck = false) {
    if (fetchBeforeCheck) {
      await this.git.fetch();
    }
    // Validate branches: Check if the branches exist
    if (!this.branches.all.includes(branch) 
        && !this.branches.all.includes(`remotes/${branch}`)) {
      if (fetchBeforeCheck) {
        throw Error(`Couldn't find branch ${branch}`);
      }

      await this.assertBranchExists(branch, true);
    }
  }

  async diffForDir(fromCommit, toCommit, fileOrDirPath) {
    const diffResult = await this.git.diff(['--name-status', `${toCommit}..${fromCommit}`, fileOrDirPath]);

    return diffResult
      .split('\n')
      .filter((diffLine) => diffLine !== '')
      .map((diffLine) => {
        const [ change, ...files ] = diffLine.split('\t', 2);
        return { change, files };
    });
  }

  async retrieveFileListFromDir(dir, commit) {
    try {
      const fileList = await this.git.catFile(['-p', `${commit}:${dir}`]);
      return fileList.split(/\r?\n/)
        .filter(line => '' !== line)
        .map(line => `${dir}${path.sep}${line.split(/\t/)[1]}`);
    } catch (err) {
      return { gitDir: dir, error: err };
    }
  }

  async retireveFile(file, commit, destFile) {
    try {
      const fileContent = await this.git.catFile(['-p', `${commit}:${file}`]);
      fs.writeFileSync(destFile, fileContent, { mode: 0o660 });
    } catch (err) {
      return { gitFile: file, error: err };
    }

    return { gitFile: file, copiedTo: destFile };
  }

  _validateAndGetGitRootDir(dirPath) {
    const splitPath = dirPath.split(path.sep);
    if (fs.existsSync(`${dirPath}${path.sep}.git`)) {
      return dirPath;
    }
    if (splitPath.length == 1) {
      throw new Error('Delta deployment should run in a git repository.')
    }
    splitPath.splice(-1, 1);
    return this._validateAndGetGitRootDir(splitPath.join(path.sep))
  }
}

module.exports = GitClient;
