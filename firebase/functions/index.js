'use strict'

// Firebase
const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp(functions.config().firebase)
const store = admin.firestore()

class NError extends Error {
	constructor (message, parent, details) {
		super(message)
		this.details = details
		this.parent = parent
	}
	get stack () {
		if (this.parent) {
			return super.stack + '\nCaused By: ' + this.parent.stack
		}
		return super.stack
	}
}

// Configuration
const superagent = require('superagent')
const config = {
	endpoint: 'https://api.drivewealth.net/v1'
}
const datetime = new Date().toISOString()

// Helper
function sendError (response, message) {
	return function (err) {
		if (err) {
			console.error(err)
			if (!message) message = err.message
		}
		if (!message) message = 'an unknown error occured'
		response.status(err.statusCode || 500).send(message)
	}
}

function getUser (userID) {
	// Check User ID
	if (!userID) return Promise.reject(new NError('get user failed because missing userid'))

	// Fetch User
	const document = store.doc(`users/${userID}`)
	return document.get()
		.then((snapshot) => {
			const data = snapshot.data()
			const user = { document, data }
			return user
		})
		.catch((err) => Promise.reject(new NError('get user failed because the read failed', err)))
}

function createUser (username, password) {
	if (!username || !password) return Promise.reject(new NError('create user failed because missing username/password'))
	return store.collection('users')
		.add({
			username,
			password
		})
		.catch((err) => Promise.reject(new NError('create user failed because the save failed', err)))
		.then((ref) => ref.id)
}

function createSession (user) {
	const { username, password } = user.data
	if (!username || !password) return Promise.reject(new NError('create session failed because invalid user data'))
	return superagent
		.post(`${config.endpoint}/userSessions`)
		.type('json').accept('json')
		.send({
			username, password,
			accountType: 2,
			appTypeID: 2000,
			appVersion: 0.1,
			languageID: 'en_US',
			osType: 'node',
			osVersion: process.version,
			scrRes: '1920x1080',
			ipAddress: '1.1.1.1' // request.headers['x-forwarded-for']
		})
		.catch((err) => Promise.reject(new NError('create session failed because the request failed', err)))
		.then((result) => {
			const session = result.body
			return user.document.set({ session }, { merge: true })
				.then(session)
				.catch((err) => Promise.reject(new NError('create session failed because the save failed', err)))
		})
}

function fetchAccountSummary (user) {
	const session = user.data.session
	const account = session.accounts[0]
	const sessionKey = user.data.session.sessionKey
	return superagent
		.get(`${config.endpoint}/users/${session.userID}/accountSummary/${account.accountID}`)
		.accept('json')
		.set('x-mysolomeo-session-key', sessionKey)
		.catch((err) => Promise.reject(new NError('fetch account summary failed because the request failed', err)))
		.then((result) => result.body)
}

function fetchAccount (user) {
	const session = user.data.session
	const account = session.accounts[0]
	const sessionKey = user.data.session.sessionKey
	return superagent
		.get(`${config.endpoint}/users/${session.userID}/accounts/${account.accountID}`)
		.accept('json')
		.set('x-mysolomeo-session-key', sessionKey)
		.catch((err) => Promise.reject(new NError('fetch account failed because the request failed', err)))
		.then((result) => result.body)
}

function fetchInstrument (user, symbol) {
	const sessionKey = user.data.session.sessionKey
	return superagent
		.get(`${config.endpoint}/instruments`)
		.query({ symbols: symbol })
		.accept('json')
		.set('x-mysolomeo-session-key', sessionKey)
		.catch((err) => Promise.reject(new NError('fetch instrument failed because the request failed', err)))
		.then((result) => result.body[0])
}

/*
function saveAccountSummary (user) {
	return fetchAccountSummary(user)
		.then((accountSummary) => user.document.set({ accountSummary }, { merge: true }).then(() => accountSummary))
		.catch((err) => Promise.reject(new NError('save accoumt summary failed', err)))
}

function saveAccount (user) {
	return fetchAccountSummary(user)
		.then((account) => user.document.set({ account }, { merge: true }).then(() => account))
		.catch((err) => Promise.reject(new NError('save account failed', err)))
}

function saveInstrument (user) {
	return fetchAccountSummary(user)
		.then((instrument) => user.document.collection('instruments').doc(request.query.symbol).set(instrument).then(() => instrument))
		.catch((err) => Promise.reject(new NError('save account failed', err)))
}
*/

/*
function getInstrument (userID, symbol) {
	// Check Symbol
	if (!symbol) return Promise.reject(new NError('missing symbol'))

	// Fetch Instrument
	const document = store.doc(`users/${userID}/instruments/${symbol}`)
	return document.get()
		.catch((err) => Promise.reject(new NError('instrument read failed', err)))
		.then((snapshot) => {
			const data = snapshot.data()
			const instrument = { document, data }
			return instrument
		})
}

	superagent
		.get(`${config.endpoint}/instruments`)
		.query({ symbols: request.query.symbol })
		.accept('json')
		.set('x-mysolomeo-session-key', response.locals.sessionKey)
		.catch(sendError(response, 500, 'not ok - instrument fetch failed'))
		.then((result) => result.body[0])
		.then((instrument) => response.locals.user.document.collection('instruments').doc(request.query.symbol).set(instrument))
		.catch(sendError(response, 500, 'not ok - instrument save failed'))
		.then(() => response.send('ok'))
*/


function validateSession (user) {
	// Check Session
	const sessionKey = user.data.session && user.data.session.sessionKey
	if (!sessionKey) return Promise.reject(new NError('missing session'))
	return Promise.resolve(user)
}

// Version
exports.version = functions.https.onRequest(function (request, response) {
	response.send(datetime)
})

exports.saveUser = functions.https.onRequest(function (request, response) {
	const { username, password } = request.body
	return createUser(username, password)
		.then((userID) => response.send(userID))
		.catch(sendError(response))
})

exports.saveSession = functions.https.onRequest(function (request, response) {
	return getUser(request.query.userid)
		.then(createSession)
		.then(() => response.send('ok - saved user session'))
		.catch(sendError(response))
})

exports.fetchAccountSummary = functions.https.onRequest(function (request, response) {
	return getUser(request.query.userid)
		.then(validateSession)
		.then(fetchAccountSummary)
		.then((accountSummary) => response.send(accountSummary))
		.catch(sendError(response))
})

exports.fetchAccount = functions.https.onRequest(function (request, response) {
	return getUser(request.query.userid)
		.then(validateSession)
		.then(fetchAccount)
		.then((account) => response.send(account))
		.catch(sendError(response))
})

exports.fetchInstrument = functions.https.onRequest(function (request, response) {
	return getUser(request.query.userid)
		.then(validateSession)
		.then((user) => fetchInstrument(user, request.query.symbol))
		.then((instrument) => response.send(instrument))
		.catch(sendError(response))
})

exports.saveOrder = functions.https.onRequest(function (request, response) {
	const state = {}
	return getUser(request.query.userid)
		.then(validateSession)
		.then((user) => {
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
		.then(() => {
			const action = request.query.action

			// Fetch
			const { user, instrument, accountSummary } = state
			const session = user.data.session
			const sessionKey = user.datasession.sessionKey
			const account = session.accounts[0]
			const percent = (user.data.percent || 50) / 100
			const available = accountSummary.cash.cashAvailableForTrade

			// Prepare Order
			const order = {
				instrumentID: instrument.instrumentID,
				accountID: account.accountID,
				accountNo: account.accountNo,
				accountType: account.accountType,
				userID: session.userID,
				ordType: '1'
			}
			if (action === 'enterlong') {
				order.side = 'B'
				order.amountCash = percent * available
				if (order.amountCash < 100) {
					return Promise.reject(new NError('create order failed because trade size is too small', { order, available, percent }))
				}
			}
			else if (action === 'exitlong') {
				order.side = 'S'
				const positions = accountSummary.equity.equityPositions
				const active = positions.find((item) => item.instrumentID === order.instrumentID)
				if (!active) {
					return Promise.reject(new NError('create order failed because there is no position to sell', { positions }))
				}
				else if (active.side === 'B') {
					order.orderQty = active.availableForTradingQty
				}
			}
			else {
				return Promise.reject(new NError('create order failed because action was invalid', { action }))
			}

			return superagent
				.post(`${config.endpoint}/orders/`)
				.type('json').accept('json')
				.set('x-mysolomeo-session-key', sessionKey)
				.send(order)
				.then((result) => result.body)
				.catch((err) => Promise.reject(new NError('create order failed because the request failed', err)))
				.then((result) => response.send(result))
		})
})
