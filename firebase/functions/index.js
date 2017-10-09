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
	const details = { input: data }
	let service
	return getService(store, data.userid, data.serviceid)
		.then((_service) => {
			service = _service
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
		.then((order) => {
			if (!order) return Promise.reject(new NError('order missing', null, { order }))
			details.output = order
			service.document.collection('orders').add(details)
		})
		.then((ref) => {
			details.order = ref.id
			return `parse order success - ${ref.id}`
		})
		.catch((err) => Promise.reject(new NError('parse order failed', err, details)))
}

function parse (query, body) {
	const state = {
		query: null,
		body: null,
		data: null,
		nestedBody: null
	}
	try {
		state.query = Object.assign({}, query || {})
		state.body = Object.assign({}, body || {})
		state.data = Object.assign({}, state.query, state.body)
		if (typeof state.data.Body === 'string') {
			state.nestedBody = JSON.parse(state.data.Body.replace(/^TradingView alert: /, ''))
			state.data = Object.assign({}, query, state.nestedBody)
		}
	}
	catch (err) {
		return Promise.reject(new NError('parse request failed - invalid nested body', err))
	}
	if (!state.data.userid || !state.data.serviceid) return Promise.reject(new NError('parse request failed - invalid credentials', null, state))
	if (state.data.call === 'order') return order(state.data).catch((err) => Promise.reject(new NError('parse request failed', err, state)))
	return Promise.reject(new NError('invalid call', null, state))
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
		.then((result) => response.send('ok - ' + result))
		.catch(sendError(response, 'not ok'))
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

