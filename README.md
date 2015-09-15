# Deployment Tracker

The Deployment Tracker tracks deployments of sample applications to [IBM Bluemix](https://www.bluemix.net/).

[**_View a summary of deployments tracked._**](https://deployment-tracker.mybluemix.net/)

## Build Status

[![Build Status](https://travis-ci.org/IBM-Bluemix/cf-deployment-tracker-service.svg?branch=master)](https://travis-ci.org/IBM-Bluemix/cf-deployment-tracker-service) [![Dependencies](https://david-dm.org/IBM-Bluemix/cf-deployment-tracker-service.svg)](https://david-dm.org/IBM-Bluemix/cf-deployment-tracker-service)

## Cloning

Get the project and change into the project directory:

    $ git clone https://github.com/IBM-Bluemix/cf-deployment-tracker-service.git
    $ cd deployment-tracker

## Configuring Local Development

Local configuration is done through a `.env` file. One environment variable, `VCAP_SERVICES`, is needed in order to configure your local development environment. The value of the `VCAP_SERVICES` is a string representation of a JSON object. Here is an example `.env` file:

    VCAP_SERVICES={"cloudantNoSQLDB": [{"name": "deployment-tracker-db","label": "cloudantNoSQLDB","plan": "Shared","credentials": {"username": "your-username","password": "your-password","host": "your-host","port": 443,"url": "https://your-username:your-password@your-host"}}]}

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

    $ cf create-service cloudantNoSQLDB Shared deployment-tracker-db

## Deploying

To deploy to Bluemix, simply:

    $ cf push

## Data Collected

The Deployment Tracker service collects the following data about individual deployments of sample applications to IBM Bluemix:

* Application Name (`application_name`)
* Space ID (`space_id`)
* Application Version (`application_version`)
* Application URIs (`application_uris`)

This data is collected from the `VCAP_APPLICATION` environment variable in IBM Bluemix. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

## License

Licensed under the [Apache License, Version 2.0](LICENSE.txt).
