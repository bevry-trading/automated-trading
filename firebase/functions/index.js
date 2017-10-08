/* eslint camelcase:0 */
'use strict'

// Firebase
const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp(functions.config().firebase)
const store = admin.firestore()

// Configuration
const datetime = new Date().toISOString()
const { sendError } = require('./util')

// Client
const bitfinex = require('./bitfinex')
const drivewealth = require('./drivewealth')


// ====================================
// Routes

exports.version = functions.https.onRequest(function (request, response) {
	response.send(datetime)
})


// ------------------------------------
// Routes: Bitfinex

exports.bitfinex_createUser = functions.https.onRequest(function (request, response) {
	const { key, secret } = request.body
	return bitfinex.createUser(store, key, secret)
		.then((userid) => response.send({ userid }))
		.catch(sendError(response))
})

exports.bitfinex_fetchBalances = functions.https.onRequest(function (request, response) {
	const { userid } = request.query
	return bitfinex.getUser(store, userid)
		.then(bitfinex.fetchBalances)
		.then((balances) => response.send({ balances }))
		.catch(sendError(response))
})

exports.bitfinex_fetchBalance = functions.https.onRequest(function (request, response) {
	const { userid, symbol } = request.query
	return bitfinex.getUser(store, userid)
		.then((user) => bitfinex.fetchBalance(user, symbol))
		.then((balance) => response.send({ balance }))
		.catch(sendError(response))
})

exports.bitfinex_createOrder = functions.https.onRequest(function (request, response) {
	const { userid, from, to, action } = request.query
	return bitfinex.getUser(store, userid)
		.then((user) => bitfinex.createOrder({ user, from, to, action }))
		.then((order) => response.send({ order }))
		.catch(sendError(response))
})


// ------------------------------------
// Routes: DriveWealth

exports.drivewealth_createUser = functions.https.onRequest(function (request, response) {
	const { username, password } = request.body
	return drivewealth.createUser(store, username, password)
		.then((userid) => response.send({ userid }))
		.catch(sendError(response))
})

exports.drivewealth_createSession = functions.https.onRequest(function (request, response) {
	const { userid } = request.query
	return drivewealth.getUser(store, userid)
		.then(drivewealth.createSession)
		.then(() => response.send('ok - saved user session'))
		.catch(sendError(response))
})

exports.drivewealth_getAccountSummary = functions.https.onRequest(function (request, response) {
	const { userid } = request.query
	return drivewealth.getUser(store, userid)
		.then(drivewealth.validateSession)
		.then(drivewealth.fetchAccountSummary)
		.then((accountSummary) => response.send({ accountSummary }))
		.catch(sendError(response))
})

exports.drivewealth_getAccount = functions.https.onRequest(function (request, response) {
	const { userid } = request.query
	return drivewealth.getUser(store, userid)
		.then(drivewealth.validateSession)
		.then(drivewealth.fetchAccount)
		.then((account) => response.send({ account }))
		.catch(sendError(response))
})

exports.drivewealth_getInstrument = functions.https.onRequest(function (request, response) {
	const { userid, symbol } = request.query
	return drivewealth.getUser(store, userid)
		.then(drivewealth.validateSession)
		.then((user) => drivewealth.fetchInstrument(user, symbol))
		.then((instrument) => response.send({ instrument }))
		.catch(sendError(response))
})

exports.drivewealth_createOrder = functions.https.onRequest(function (request, response) {
	const { userid, action } = request.query
	return drivewealth.getUser(store, userid)
		.then(drivewealth.validateSession)
		.then((user) => {
			const state = { action }
			state.user = user
			return Promise.all([
				drivewealth.fetchInstrument(user, request.query.symbol).then((instrument) => {
					state.instrument = instrument
				}),
				drivewealth.fetchAccountSummary(user).then((accountSummary) => {
					state.accountSummary = accountSummary
				})
			])
		})
		.then(drivewealth.createOrder)
		.then((order) => response.send({ order }))
		.catch(sendError(response))
})

