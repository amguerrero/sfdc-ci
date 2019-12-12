# Metadata Retrieve Script
This is a script that allows us to retrieve and modify specific metadata from an org by building a package.xml with the metadata we want to retrieve from a given Salesforce Org.

## How to use it

### Code Sync from our production Org to a given branch (manually)
**Step 1**: First we should make sure we are in `salesforce-prod` directory and in the latest version of the `master` branch and move to the branch where we will bring the code sync changes so we can merge then back to `master`, ie `sfdc-code-sync-YYYY-MM-DD`:
```
cd salesforce-prod/
git checkout master
git pull
git checkout -b sfdc-code-sync-YYYY-MM-DD
```

**Step 2**: Now that we're in a new brach created from the latest version of `master` should make sure all the dependencies of the script:
```
cd utils/md-retrieve/
npm install
cd ../../ #back to salesforce-prod directory
```

**Step 3**: (OPTIONAL) Set the salesforce credentials, there are 2 options for setting the credentials:
The first one is via environment variables, i.e. when we run the script in jenkins:
- Set `SFDC_USERNAME` variable with the username for that org, i.e.: crm-automation@elastic.co
- Set `SFDC_PASSWORD` variable with the password + authentication token for the user
- Set `SFDC_LOGIN_URL` variable to `https://login.salesforce.com` (by default it is `https://test.salesforce.com`)

The second option is pass this 3 pieces of configuration via arguments to the script, `-u` to provide the user, `-p` to provide the password and `-l` to provide the login url:
```
node utils/md-retrieve -u crm-automation@elastic.co -p 'MyPassword1234123412341234' -l https://login.salesforce.com
```

**Step 4**: And now we can run the script, it will take a few minutes to finish, depending on how many metadata types we're retrieving and how many transformations we're applying:
```
node utils/md-retrieve
```
Running it without arguments we will:
- Retrieve the following metadata:
  - ApexClass
  - ApexComponent
  - ApexPage
  - ApexTrigger
  - ApprovalProcess
  - AssignmentRules
  - AuraDefinitionBundle
  - CustomLabels
  - CustomMetadata
  - CustomObject
  - CustomPermission
  - EntitlementProcess
  - Flow
  - GlobalValueSet
  - LightningComponentBundle
  - MilestoneType
  - PermissionSet
  - Profile
  - StandardValueSet
  - StaticResource
  - Workflow
- Remove the listViews tags from all the SObjects.
- Remove `EntitlementProcess` and `AssignmentRules` from the package.xml to make it deployable.
- Copy all the retrieve metadata to `salesforce-prod/src`.

**Step 5**: Push the local branch to remote using ```git push --set-upstream origin sfdc-code-sync-YYYY-MM-DD ``` 

Now we can create a pull request between `sfdc-code-sync-YYYY-MM-DD` and `master` on github and once the PR is approved, merge to master.

### Retrieve just a set of metadata types and not the default ones
For this we need to change the **Step 4** to let the script know what are the metadata types we want to retrieve, , i.e. we want to retrieve just `CustomObject` and `Profile`.
We have 2 options:
#### Via environment variables
Setting the environment variable `DEFAULT_METADATA_TYPES` with a comma-separated list of the metadata types we want to retrieve:
```
DEFAULT_METADATA_TYPES=CustomObject,Profile node utils/md-retrieve
```
or (if you're in an UNIX like operating system)
```
export DEFAULT_METADATA_TYPES=CustomObject,Profile
node utils/md-retrieve
```
#### Via arguments passed to the script
```
node utils/md-retrieve -t CustomObject Profile
```
or
```
node utils/md-retrieve -t CustomObject -t Profile
```

### Retrieve and transform metadata but copy it to a different directory
By default the script will copy the retrieved and transformed metadata to `./src` directory (it will create the directory if it doesn't exist).
If are executing the script in other directory than `salesforce-prod` or we just want the result to be copied into another directory we can specify it via both; an environment variable and an argument.
- **Via an environment variable**: We can set the `SALESFORCE_SRC` to the directory we want
- **Via an argument to the script**: We can use the `-s` argument to set the directory

### Create our own transformations
We need to create a new class following the example of `salesforce-prod/utils/md-retrieve/transformer/CustomObjectTransformation.js` or `salesforce-prod/utils/md-retrieve/transformer/DeployPackageXmlTransformation.js`.
These classes extend `salesforce-prod/utils/md-retrieve/transformer/Transformation.js` class and override the `shouldTransform(...)` and `transform(...)` methods.

Then we need to let the transformer know it needs to use it, like in `salesforce-prod/utils/md-retrieve/index.js` (look for `transformer.use(...)`)
