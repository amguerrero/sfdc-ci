const tempy = require('tempy');

const getCliArgs = require('./commandLineArgs');

const configDefaults = {
  apiVersion: process.env.API_VERSION || '45.0',
  sfdcLoginUrl: process.env.SFDC_LOGIN_URL || 'https://test.salesforce.com',
  sfdcPassword: process.env.SFDC_PASSWORD,
  sfdcUsername: process.env.SFDC_USERNAME,
};

configDefaults.defaultMetadataTypes = [
  "ApexClass",
  "ApexComponent",
  "ApexPage",
  "ApexTrigger",
  "ApprovalProcess",
  "AssignmentRules",
  "AuraDefinitionBundle",
  "CustomLabels",
  "CustomMetadata",
  "CustomObject",
  "CustomPermission",
  "EntitlementProcess",
  "Flow",
  "GlobalValueSet",
  "LightningComponentBundle",
  "MilestoneType",
  "PermissionSet",
  "Profile",
  "StandardValueSet",
  "StaticResource",
  "Workflow"
];
if (process.env.DEFAULT_METADATA_TYPES) {
  configDefaults.defaultMetadataTypes = process.env.DEFAULT_METADATA_TYPES.split(/\s*,\s*/);
}

const tempDir = tempy.directory();
configDefaults.retrieveDir = process.env.RETRIEVE_DIR || tempDir;
configDefaults.salesforceSrc = process.env.SALESFORCE_SRC || 'src';
configDefaults.retrieveDir = process.env.RETRIEVE_DIR || tempDir;

module.exports = getCliArgs(configDefaults);
