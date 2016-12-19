# Deployment Tracker

The Deployment Tracker tracks deployments of sample applications to [IBM Bluemix](https://www.bluemix.net/).

[**_View a summary of deployments tracked._**](https://deployment-tracker.mybluemix.net/)

## Build Status

[![Build Status](https://travis-ci.org/IBM-Bluemix/cf-deployment-tracker-service.svg?branch=master)](https://travis-ci.org/IBM-Bluemix/cf-deployment-tracker-service) [![Dependencies](https://david-dm.org/IBM-Bluemix/cf-deployment-tracker-service.svg)](https://david-dm.org/IBM-Bluemix/cf-deployment-tracker-service)

## Cloning

Get the project and change into the project directory:

    $ git clone https://github.com/IBM-Bluemix/cf-deployment-tracker-service.git
    $ cd cf-deployment-tracker-service

## Configuring Local Development

Local configuration is done through a `.env` file. One environment variable, `VCAP_SERVICES`, is needed in order to configure your local development environment. The value of the `VCAP_SERVICES` is a string representation of a JSON object. Here is an example `.env` file:

    VCAP_SERVICES={"cloudantNoSQLDB": [{"name": "deployment-tracker-db","label": "cloudantNoSQLDB","plan": "Lite","credentials": {"username": "your-username","password": "your-password","host": "your-host","port": 443,"url": "https://your-username:your-password@your-host"}}]}

**Note:**  Services created within Bluemix are automatically added to the `VCAP_SERVICES` environment variable. Therefore, no configuration is needed for Bluemix.

## Installing

Install the project's dependencies:

    $ npm install

## Running

Run the project through [Foreman](https://github.com/ddollar/foreman):

    $ foreman start

## Configuring IBM Bluemix

Complete these steps first if you have not already:

1. [Install the Cloud Foundry command line interface.](https://www.ng.bluemix.net/docs/#starters/install_cli.html)
2. Follow the instructions at the above link to connect to Bluemix.
3. Follow the instructions at the above link to log in to Bluemix.

Create a Cloudant service within Bluemix if one has not already been created:

    $ cf create-service cloudantNoSQLDB Lite deployment-tracker-db

> Use the [Standard plan](https://www.ibm.com/blogs/bluemix/2016/09/new-cloudant-lite-standard-plans-are-live-in-bluemix-public/) for production deployments.

Create a Redis service within Bluemix if one has not already been created:

    $ cf create-service rediscloud 30mb deployment-tracker-redis-redis-cloud

## Deploying

To deploy to Bluemix, simply:

    $ cf push

## Clients

There are a number of language-specific clients for the deployment tracker, including:

- [Node.js](https://github.com/IBM-Bluemix/cf-deployment-tracker-client-node)
- [Python](https://github.com/IBM-Bluemix/cf-deployment-tracker-client-python)
- [Java](https://github.com/IBM-Bluemix/cf-deployment-tracker-client-java)
- [Go](https://github.com/IBM-Bluemix/cf_deployment_tracker_client_go)
- [Swift](https://github.com/IBM-Bluemix/cf-deployment-tracker-client-swift)
- [Electron](https://www.npmjs.com/package/electron-deployment-tracker-client)

## Privacy Notice

This web application includes code to track deployments to [IBM Bluemix](https://www.bluemix.net/) and other Cloud Foundry platforms. The following information is sent to a [Deployment Tracker](https://github.com/cloudant-labs/deployment-tracker) service on each deployment:

* Application Name (`application_name`)
* Space ID (`space_id`)
* Application Version (`application_version`)
* Application URIs (`application_uris`)
* Labels of bound services
* Number of instances for each bound service

This data is collected from the `VCAP_APPLICATION` and `VCAP_SERVICES` environment variables in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix to measure the usefulness of our examples, so that we can continuously improve the content we offer to you. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

### Disabling Deployment Tracking

Disabling the deployment tracker varies based on sample application implementation. Please denote specific disabling instructions within each sample's README.

### Including This Privacy Notice

Please include this privacy notice in the README of any web application that includes deployment tracking code. Following is the privacy notice in markdown format. Note that the "Disabling Deployment Tracking" section may need to be modified based on how deployment tracking is integrated in to the web application.

```
## Privacy Notice

This web application includes code to track deployments to [IBM Bluemix](https://www.bluemix.net/) and other Cloud Foundry platforms. The following information is sent to a [Deployment Tracker](https://github.com/cloudant-labs/deployment-tracker) service on each deployment:

* Application Name (`application_name`)
* Space ID (`space_id`)
* Application Version (`application_version`)
* Application URIs (`application_uris`)
* Labels of bound services
* Number of instances for each bound service

This data is collected from the `VCAP_APPLICATION` and `VCAP_SERVICES` environment variables in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix to measure the usefulness of our examples, so that we can continuously improve the content we offer to you. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

### Disabling Deployment Tracking

Deployment tracking can be disabled by <disabling-instructions-here>.
```

## License

Licensed under the [Apache License, Version 2.0](LICENSE.txt).
