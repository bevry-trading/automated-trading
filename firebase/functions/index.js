/* eslint camelcase:0 no-constant-condition:0 */
'use strict'

// Firebase
const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp(functions.config().firebase)
const store = admin.firestore()

// Configuration
const datetime = new Date().toISOString()
const { log, NError, sendError, getService, getServices, createUser } = require('./util')

// Client
const bitfinex = require('./bitfinex')
const itbit = require('./itbit')
const drivewealth = require('./drivewealth')
const cryptomarketcap = require('./cryptomarketcap')


// ====================================
// Helpers

function order (data) {
	const details = { input: data }
	let service
	return Promise.resolve()
		.then(() => {
			log('parse order')
			if (data.atserviceid) {
				return Promise.all([
					getService(store, data.atuserid, data.atserviceid)
				])
			}
			else if (data.atmarket) {
				return getServices(store, data.atuserid, data.atmarket)
			}
			else {
				return Promise.reject(new Error('invalid service'))
			}
		})
		.then((services) => Promise.all(
			services.map((service) => {
				if (service.data.atservice === 'drivewealth') {
					return drivewealth.validateSession(service).then((service) => drivewealth.createOrder(service, data.action, data.symbol))
				}
				else if (service.data.atservice === 'bitfinex') {
					log('bitfinex create order')
					return bitfinex.createOrder(service, data.symbol, data.from, data.to)
				}
				else if (service.data.atservice === 'itbit') {
					return itbit.createOrder(service, data.symbol, data.from, data.to, data.walletid)
				}
				else {
					return Promise.reject(new NError('invalid service'))
				}
			})
		))
		.then((orders) => Promise.all(
			orders.map((order) => {
				if (!orders) return Promise.reject(new NError('order missing', null, { order }))
				details.output = order
				return service.document.collection('orders').add(details)
					.then((ref) => `order created - ${ref.id}`)
			})
		))
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
	if (!state.data.atuserid) return Promise.reject(new NError('parse request failed - invalid credentials', null, state))
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
		.then((atuserid) => response.send({ atuserid }))
		.catch(sendError(response))
})

exports.parse = functions.https.onRequest(function (request, response) {
	return parse(request.query, request.body)
		.then((result) => response.send({ result }))
		.catch(sendError(response, 'not ok'))
})


// ------------------------------------
// Routes: CryptoMarketCap

exports.cryptomarketcap_fetch = functions.https.onRequest(function (request, response) {
	return cryptomarketcap.fetch(store)
		.then((result) => response.send({ result }))
		.catch(sendError(response, 'not ok'))
})


// ------------------------------------
// Routes: Bitfinex

exports.bitfinex_createService = functions.https.onRequest(function (request, response) {
	const { atuserid, key, secret } = Object.assign({}, request.query, request.body)
	return bitfinex.createService(store, atuserid, key, secret)
		.then((atserviceid) => response.send({ atserviceid }))
		.catch(sendError(response))
})

exports.bitfinex_fetchBalances = functions.https.onRequest(function (request, response) {
	const { atuserid, atserviceid } = Object.assign({}, request.query, request.body)
	return getService(store, atuserid, atserviceid)
		.then(bitfinex.fetchBalances)
		.then((balances) => response.send({ balances }))
		.catch(sendError(response))
})

exports.bitfinex_createOrder = functions.https.onRequest(function (request, response) {
	const { atuserid, atserviceid, symbol, from, to } = Object.assign({}, request.query, request.body)
	return getService(store, atuserid, atserviceid)
		.then((service) => bitfinex.createOrder(service, symbol, from, to))
		.then((order) => response.send({ order }))
		.catch(sendError(response))
})



// ------------------------------------
// Routes: itBit

exports.itbit_createService = functions.https.onRequest(function (request, response) {
	const { atuserid, userid, key, secret } = Object.assign({}, request.query, request.body)
	return itbit.createService(store, atuserid, userid, key, secret)
		.then((atserviceid) => response.send({ atserviceid }))
		.catch(sendError(response))
})

exports.itbit_fetchTicker = functions.https.onRequest(function (request, response) {
	const { atuserid, atserviceid, symbol } = Object.assign({}, request.query, request.body)
	return getService(store, atuserid, atserviceid)
		.then((service) => itbit.fetchTicker(service, symbol))
		.then((ticker) => response.send({ ticker }))
		.catch(sendError(response))
})

exports.itbit_fetchWallets = functions.https.onRequest(function (request, response) {
	const { atuserid, atserviceid } = Object.assign({}, request.query, request.body)
	return getService(store, atuserid, atserviceid)
		.then((service) => itbit.fetchWallets(service))
		.then((wallets) => response.send({ wallets }))
		.catch(sendError(response))
})

exports.itbit_fetchWallet = functions.https.onRequest(function (request, response) {
	const { atuserid, atserviceid, symbol } = Object.assign({}, request.query, request.body)
	return getService(store, atuserid, atserviceid)
		.then((service) => itbit.fetchWallet(service, symbol))
		.then((wallet) => response.send({ wallet }))
		.catch(sendError(response))
})

exports.itbit_createOrder = functions.https.onRequest(function (request, response) {
	const { atuserid, atserviceid, symbol, action, walletid } = Object.assign({}, request.query, request.body)
	return getService(store, atuserid, atserviceid)
		.then((service) => itbit.createOrder(service, symbol, action, walletid))
		.then((order) => response.send({ order }))
		.catch(sendError(response))
})


// ------------------------------------
// Routes: DriveWealth

exports.drivewealth_createService = functions.https.onRequest(function (request, response) {
	const { atuserid, username, password } = Object.assign({}, request.query, request.body)
	return drivewealth.createService(store, atuserid, username, password)
		.then((atserviceid) => response.send({ atserviceid }))
		.catch(sendError(response))
})

exports.drivewealth_createSession = functions.https.onRequest(function (request, response) {
	const { atuserid, atserviceid } = Object.assign({}, request.query, request.body)
	return getService(store, atuserid, atserviceid)
		.then(drivewealth.createSession)
		.then(() => response.send('ok - saved session'))
		.catch(sendError(response))
})

exports.drivewealth_getAccountSummary = functions.https.onRequest(function (request, response) {
	const { atuserid, atserviceid } = Object.assign({}, request.query, request.body)
	return getService(store, atuserid, atserviceid)
		.then(drivewealth.validateSession)
		.then(drivewealth.fetchAccountSummary)
		.then((accountSummary) => response.send({ accountSummary }))
		.catch(sendError(response))
})

exports.drivewealth_getAccount = functions.https.onRequest(function (request, response) {
	const { atuserid, atserviceid } = Object.assign({}, request.query, request.body)
	return getService(store, atuserid, atserviceid)
		.then(drivewealth.validateSession)
		.then(drivewealth.fetchAccount)
		.then((account) => response.send({ account }))
		.catch(sendError(response))
})

exports.drivewealth_getInstrument = functions.https.onRequest(function (request, response) {
	const { atuserid, atserviceid, symbol } = Object.assign({}, request.query, request.body)
	return getService(store, atuserid, atserviceid)
		.then(drivewealth.validateSession)
		.then((service) => drivewealth.fetchInstrument(service, symbol))
		.then((instrument) => response.send({ instrument }))
		.catch(sendError(response))
})

exports.drivewealth_createOrder = functions.https.onRequest(function (request, response) {
	const { atuserid, atserviceid, symbol, action } = Object.assign({}, request.query, request.body)
	return getService(store, atuserid, atserviceid)
		.then(drivewealth.validateSession)
		.then((service) => drivewealth.createOrder(service, symbol, action))
		.then((order) => response.send({ order }))
		.catch(sendError(response))
})
