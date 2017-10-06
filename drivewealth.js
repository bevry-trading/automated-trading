'use strict';
const request = require('superagent')
const nocache = require('superagent-no-cache')
const config = {
	endpoint: 'https://api.drivewealth.net/v1',
	accountType: 2,
	username: process.env.DRIVEWEALTH_USERNAME,
	password: process.env.DRIVEWEALTH_PASSWORD
}

function createSession (context, req) {
	return request.post(config.endpoint + '/userSessions').use(nocache).send({
		username: config.username,
		password: config.password,
		appTypeID: 2000,
		appVersion: 0.1,
		langaugeID: 'enUS',
		osType: 'node',
		osVersion: process.version,
		scrRes: 'null',
		ipAddress: req.headers['x-forwarded-for']
	})
}

function getInstrument (context, req) {
	return request.post(config.endpoint + '/instruments').query({
		symbols: req.params.symbol
	})
}

function createOrder (context, req) {
	return request.post(config.endpoint + '/orders/').use(nocache).send({
		instrumentID:
		accountID: session.accounts[0].accountID,
		accountNo: session.accounts[0].accountNo,
		userID: session.userID,
		accountType: config.accountType,
		ordType: "1",
		side: "B",
		orderQty:
	})
	context.res = {
		// status: 200, /* Defaults to 200 */
		body: 'Go Serverless v1.x! Your function executed successfully!',
	};

	context.done();
};
