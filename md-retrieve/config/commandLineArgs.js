const commandLineArgs = require('command-line-args');

module.exports = (defaultValues) => {
  const commandLineArgsDefinitions = [
    { name: 'api-version', type: String, alias: 'a', defaultValue: defaultValues.apiVersion },
    { name: 'metadata-types', type: String, alias: 't', multiple: true, defaultValue: defaultValues.defaultMetadataTypes },
    { name: 'poll-interval', type: Number, defaultValue: 5 },
    { name: 'poll-timeout', type: Number, defaultValue: 60 * 60 },
    { name: 'print-config', type: Boolean, defaultValue: false },
    { name: 'retrieve-dir', type: String, alias: 'r', defaultValue: defaultValues.retrieveDir },
    { name: 'salesforce-src', type: String, alias: 's', defaultValue: defaultValues.salesforceSrc },
    { name: 'save-retrieve-package-xml', type: Boolean, defaultValue: true },
    { name: 'sfdc-login-url', type: String, alias: 'l', defaultValue: defaultValues.sfdcLoginUrl },
    { name: 'sfdc-password', type: String, alias: 'p', defaultValue: defaultValues.sfdcPassword },
    { name: 'sfdc-username', type: String, alias: 'u', defaultValue: defaultValues.sfdcUsername },
  ];

  return commandLineArgs(commandLineArgsDefinitions);
};
