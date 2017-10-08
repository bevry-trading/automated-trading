'use strict'

// Firebase
const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp(functions.config().firebase)
const store = admin.firestore()

// Configuration
const datetime = new Date().toISOString()
const { sendError } = require('./util')
const config = { store, endpoint: 'https://api.drivewealth.net/v1' }

// DriveWealth Client
const DriveWealth = require('./drivewealth')
const getUser = DriveWealth.getUser.bind(config)
const createUser = DriveWealth.createUser.bind(config)
const createSession = DriveWealth.createSession.bind(config)
const fetchAccountSummary = DriveWealth.fetchAccountSummary.bind(config)
const fetchAccount = DriveWealth.fetchAccount.bind(config)
const fetchInstrument = DriveWealth.fetchInstrument.bind(config)
const validateSession = DriveWealth.validateSession.bind(config)
const createOrder = DriveWealth.createOrder.bind(config)

// Version
exports.version = functions.https.onRequest(function (request, response) {
	response.send(datetime)
})

exports.createUser = functions.https.onRequest(function (request, response) {
	const { username, password } = request.body
	return createUser(username, password)
		.then((userID) => response.send(userID))
		.catch(sendError(response))
})

exports.createSession = functions.https.onRequest(function (request, response) {
	return getUser(request.query.userid)
		.then(createSession)
		.then(() => response.send('ok - saved user session'))
		.catch(sendError(response))
})

exports.getAccountSummary = functions.https.onRequest(function (request, response) {
	return getUser(request.query.userid)
		.then(validateSession)
		.then(fetchAccountSummary)
		.then((accountSummary) => response.send(accountSummary))
		.catch(sendError(response))
})

exports.getAccount = functions.https.onRequest(function (request, response) {
	return getUser(request.query.userid)
		.then(validateSession)
		.then(fetchAccount)
		.then((account) => response.send(account))
		.catch(sendError(response))
})

exports.getInstrument = functions.https.onRequest(function (request, response) {
	return getUser(request.query.userid)
		.then(validateSession)
		.then((user) => fetchInstrument(user, request.query.symbol))
		.then((instrument) => response.send(instrument))
		.catch(sendError(response))
})

exports.createOrder = functions.https.onRequest(function (request, response) {
	return getUser(request.query.userid)
		.then(validateSession)
		.then((user) => {
			const state = {
				action: request.query.action
			}
			state.user = user
			return Promise.all([
				fetchInstrument(user, request.query.symbol).then((instrument) => {
					state.instrument = instrument
				}),
				fetchAccountSummary(user).then((accountSummary) => {
					state.accountSummary = accountSummary
				})
			])
		})
		.then(createOrder)
		.then((result) => response.send(result))
		.catch(sendError(response))
})
