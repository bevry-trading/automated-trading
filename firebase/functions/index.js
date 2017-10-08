/* eslint camelcase:0 */
'use strict'

// Firebase
const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp(functions.config().firebase)
const store = admin.firestore()

// Configuration
const datetime = new Date().toISOString()
const { NError, sendError, getService, createUser } = require('./util')

// Client
const bitfinex = require('./bitfinex')
const drivewealth = require('./drivewealth')

// ====================================
// Helpers

function order (data) {
	const state = {}
	return getService(store, data.userid, data.serviceid)
		.then((service) => {
			state.service = service
			if (service.data.service === 'drivewealth') {
				return drivewealth.validateSession(service).then((service) => drivewealth.createOrder(service, data.action, data.symbol))
			}
			else if (service.data.service === 'bitfinex') {
				return bitfinex.createOrder(service, data.action, data.from, data.to)
			}
			else {
				return Promise.reject(new NError('invalid service'))
			}
		})
		.then((order) => state.service.document.collection('orders').add({ input: data, output: order }))
		.then((ref) => `ok - parse order placed - ${ref.id}`)
		.catch((err) => Promise.reject(new NError('parse order failed', err)))
}
function parse (query, body = {}) {
	const data = Object.assign({}, query)
	try {
		body = (
			typeof body.Body === 'string' && JSON.parse(body.Body.replace(/^TradingView alert: /, ''))
		) || {}
	}
	catch (err) {
		return Promise.reject(new NError('failed to parse nested body', err))
	}

	Object.assign(data, body)

	if (!data.userid || !data.serviceid) return Promise.reject(new NError('invalid credentials'))

	if (data.call === 'order') return order(data)

	return Promise.reject(new NError('invalid call'))
}


// ====================================
// Routes

exports.version = functions.https.onRequest(function (request, response) {
	response.send(datetime)
})

exports.createUser = functions.https.onRequest(function (request, response) {
	const { email } = Object.assign({}, request.query, request.body)
	return createUser(store, email)
		.then((userid) => response.send({ userid }))
		.catch(sendError(response))
})

exports.parse = functions.https.onRequest(function (request, response) {
	return parse(request.query, request.body)
		.then((result) => response.send(result))
		.catch(sendError('response', 'not ok'))
})


// ------------------------------------
// Routes: Bitfinex

exports.bitfinex_createService = functions.https.onRequest(function (request, response) {
	const { userid, key, secret } = Object.assign({}, request.query, request.body)
	return bitfinex.createService(store, userid, key, secret)
		.then((serviceid) => response.send({ serviceid }))
		.catch(sendError(response))
})

exports.bitfinex_fetchBalances = functions.https.onRequest(function (request, response) {
	const { userid, serviceid } = Object.assign({}, request.query, request.body)
	return getService(store, userid, serviceid)
		.then(bitfinex.fetchBalances)
		.then((balances) => response.send({ balances }))
		.catch(sendError(response))
})

exports.bitfinex_fetchBalance = functions.https.onRequest(function (request, response) {
	const { userid, serviceid, symbol } = Object.assign({}, request.query, request.body)
	return getService(store, userid, serviceid)
		.then((user) => bitfinex.fetchBalance(user, symbol))
		.then((balance) => response.send({ balance }))
		.catch(sendError(response))
})

exports.bitfinex_createOrder = functions.https.onRequest(function (request, response) {
	const { userid, serviceid, action, from, to } = Object.assign({}, request.query, request.body)
	return getService(store, userid, serviceid)
		.then((service) => bitfinex.createOrder(service, action, from, to))
		.then((order) => response.send({ order }))
		.catch(sendError(response))
})


// ------------------------------------
// Routes: DriveWealth

exports.drivewealth_createService = functions.https.onRequest(function (request, response) {
	const { userid, username, password } = Object.assign({}, request.query, request.body)
	return drivewealth.createService(store, userid, username, password)
		.then((serviceid) => response.send({ serviceid }))
		.catch(sendError(response))
})

exports.drivewealth_createSession = functions.https.onRequest(function (request, response) {
	const { userid, serviceid } = Object.assign({}, request.query, request.body)
	return getService(store, userid, serviceid)
		.then(drivewealth.createSession)
		.then(() => response.send('ok - saved session'))
		.catch(sendError(response))
})

exports.drivewealth_getAccountSummary = functions.https.onRequest(function (request, response) {
	const { userid, serviceid } = Object.assign({}, request.query, request.body)
	return getService(store, userid, serviceid)
		.then(drivewealth.validateSession)
		.then(drivewealth.fetchAccountSummary)
		.then((accountSummary) => response.send({ accountSummary }))
		.catch(sendError(response))
})

exports.drivewealth_getAccount = functions.https.onRequest(function (request, response) {
	const { userid, serviceid } = Object.assign({}, request.query, request.body)
	return getService(store, userid, serviceid)
		.then(drivewealth.validateSession)
		.then(drivewealth.fetchAccount)
		.then((account) => response.send({ account }))
		.catch(sendError(response))
})

exports.drivewealth_getInstrument = functions.https.onRequest(function (request, response) {
	const { userid, serviceid, symbol } = Object.assign({}, request.query, request.body)
	return getService(store, userid, serviceid)
		.then(drivewealth.validateSession)
		.then((service) => drivewealth.fetchInstrument(service, symbol))
		.then((instrument) => response.send({ instrument }))
		.catch(sendError(response))
})

exports.drivewealth_createOrder = functions.https.onRequest(function (request, response) {
	const { userid, serviceid, action, symbol } = Object.assign({}, request.query, request.body)
	return getService(store, userid, serviceid)
		.then(drivewealth.validateSession)
		.then((service) => drivewealth.createOrder(service, action, symbol))
		.then((order) => response.send({ order }))
		.catch(sendError(response))
})

