# Delta Deployment CLI
This node app is a CLI around `delta-deployment-core` which allows us to create salesforce deployment and destructive changes packages that can be deployed with `sdfx force:mdapi:deploy` or ant integration tool.

## How to use it?
### Before using Delta Deployment
Before using it we need to make sure we change to `delta-deployment-core` directory and run `npm install`, after that we can change back to `delta-deployment` folder and run `npm install`.
This only needs to be done once every time we change `delta-deployment-core` or `delta-deployment` code or every time we delete the `node_modules` sub-folders.

Assuming we're in the root of the repository:
```
$ cd delta-deployment-core
$ npm install
$ cd ../delta-deployment
$ npm install
```

### Execution Arguments
Delta deployment accepts the following arguments:
- `--from <branch-name>` or `-f <branch-name>` will set the branch we pass to the argument as the branch we want to compare from, typically it's the branch we have developed our feature or bugfix. By default is the current branch we're checked out.
- `--to <branch-name-name>` or `-t <branch-name>` will set the branch we pass to the argument as the branch we want to compare the branch `from` to, it's typically the branch holding other's features as `release-candidate-XXXX` or `master`. By default is `master`.
- `--salesforce-src <dir-name>` or `-s <dir-name>` will set the directory where salesforce source code is, i.e. `./src` directory. By default it will get the root of the git repository we're executing the app from.
- `--delta-dir <dir-name>` or `-d <dir-name>` will set the directory where we will create the `delta` package that we will deploy, by default it's `./delta` (it creates the directory if it doesn't exist)
- `--api-version <api-version>` or `-a <api-version>` will set the api version on the package.xml files when create the deployment and destructiveChanges packages. By default it is `47.0`

### Usage
The easiest way to use it is to simple run the node app without any argument from inside a git repository that has the source metadata code of our org in the root of the repository.
Like this:
```
$ node /path/to/sfdc-ci/delta-deployment
```
By running it without arguments the app will use the default values so it will create a deployment and a destructiveChanges packages 
in `./delta` folder with the files that changed or were deleted between the current branch and master, using the root of the git repository as the base for the comparison.

But let's say we want to create a package with api version `45.0` with the difference between a feature branch (i.e. a feature branch called `my-new-feature`) 
and the current release candidate branch (i.e. `release-candidate-2020-01-13`). The metadata is in a `src` folder instead of in the root of the repository and we want the delta directory to be called `feature-delta`:
```
$ node /path/to/sfdc-ci/delta-deployment \
  -d ./feature-delta \
  -s ./src \
  -f my-new-feature \
  -t release-candidate-2020-01-13 \
  -a 45.0
```

### Deployment and Destructive Changes packages
Delta deployment app creates a directory called `deployment` inside the directory we've set as delta dir by using `--delta-dir` or `-d` argument which contains the files that were added or modified in the `--from` (or `-f`) branch compared with the `--to` (or `-t`) branch. 

In the case that files were deleted in the `--from` branch, delta deployment app will create a directory called `destructiveChanges` inside the directory set as delta dir.
