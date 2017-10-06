'use strict'

// Firebase
const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp(functions.config().firebase)
const store = admin.firestore()

// Configuration
const superagent = require('superagent')
const config = {
	endpoint: 'https://api.drivewealth.net/v1'
}
const datetime = new Date().toISOString()

// Helper
function sendError (response, code, message) {
	return function (err) {
		if (err) console.error(err)
		response.status(code).send(message)
		return err
	}
}
function userRequest (next) {
	return function userRequestMiddleware (request, response) {
		// Check User ID
		if (!request.query.userid) return sendError(response, 404, 'not ok - missing userid')()

		// Fetch User
		const document = store.doc(`users/${request.query.userid}`)
		document.get()
			.catch(sendError(response, 404, 'not ok - user read failed'))
			.then((snapshot) => {
				const data = snapshot.data()
				response.locals.user = { document, data }
				next(request, response)
			})
	}
}
function sessionRequest (next) {
	return userRequest(function sessionRequestMiddleware (request, response) {
		// Check Session
		if (!response.locals.user.data.session.sessionKey) return sendError(response, 404, 'not ok - missing session')()
		response.locals.sessionKey = response.locals.user.data.session.sessionKey
		return next(request, response)
	})
}
function instrumentRequest (next) {
	return sessionRequest(function instrumentRequestMiddleware (request, response) {
		// Check Symbol
		if (!request.query.symbol) return sendError(response, 404, 'not ok - missing symbol')()

		// Fetch Instrument
		const document = store.doc(`users/${request.query.userid}/instruments/${request.query.symbol}`)
		document.get()
			.catch(sendError(response, 404, 'not ok - instrument read failed'))
			.then((snapshot) => {
				const data = snapshot.data()
				response.locals.instrument = { document, data }
				next(request, response)
			})
	})
}

// Version
exports.version = functions.https.onRequest(function (request, response) {
	response.send(datetime)
})

exports.saveUser = functions.https.onRequest(function (request, response) {
	const { username, password } = request.body
	if (!username || !password) return sendError(response, 500, 'not ok - missing username or password')()
	store.collection('users')
		.add({
			username,
			password
		})
		.then((ref) => response.send(ref.id))
		.catch(sendError(response, 500, 'not ok - failed to save user'))
})

exports.saveSession = functions.https.onRequest(userRequest(function (request, response) {
	Promise.resolve()
		.then(fetchSession(request, response))


	const { username, password } = response.locals.user.data
	if (!username || !password) return sendError(response, 500, 'not ok - user data invalid')()
	superagent
		.post(`${config.endpoint}/userSessions`)
		.type('json').accept('json')
		.send({
			username: response.locals.user.data.username,
			password: response.locals.user.data.password,
			accountType: 2,
			appTypeID: 2000,
			appVersion: 0.1,
			languageID: 'en_US',
			osType: 'node',
			osVersion: process.version,
			scrRes: '1920x1080',
			ipAddress: '1.1.1.1' // request.headers['x-forwarded-for']
		})
		.catch(sendError(response, 500, 'not ok - session creation failed'))
		.then((result) => result.body)
		.then((session) => response.locals.user.document.set({ session }, { merge: true }))
		.catch(sendError(response, 500, 'not ok - session save failed'))
		.then(() => response.send('ok - user session saved'))
}))

exports.saveAccountSummary = functions.https.onRequest(sessionRequest(function (request, response) {
	const session = response.locals.user.data.session
	const account = session.accounts[0]
	superagent
		.get(`${config.endpoint}/users/${session.userID}/accountSummary/${account.accountID}`)
		.accept('json')
		.set('x-mysolomeo-session-key', response.locals.sessionKey)
		.catch(sendError(response, 500, 'not ok - account summary fetch failed'))
		.then((result) => result.body)
		.then((accountSummary) => response.locals.user.document.set({ accountSummary }, { merge: true }))
		.catch(sendError(response, 500, 'not ok - account summary save failed'))
		.then(() => response.send('ok - account summary saved'))
}))

exports.saveAccount = functions.https.onRequest(sessionRequest(function (request, response) {
	const session = response.locals.user.data.session
	const account = session.accounts[0]
	superagent
		.get(`${config.endpoint}/users/${session.userID}/accounts/${account.accountID}`)
		.accept('json')
		.set('x-mysolomeo-session-key', response.locals.sessionKey)
		.catch(sendError(response, 500, 'not ok - account fetch failed'))
		.then((result) => result.body)
		.then((account) => response.locals.user.document.set({ account }, { merge: true }))
		.catch(sendError(response, 500, 'not ok - account summary save failed'))
		.then(() => response.send('ok - account summary saved'))
}))

exports.saveInstrument = functions.https.onRequest(sessionRequest(function (request, response) {
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
}))

exports.saveOrder = functions.https.onRequest(instrumentRequest(function (request, response) {
	const action = request.query.action

	// Fetch
	const user = response.locals.user.data
	const session = user.session
	const account = session.accounts[0]
	const instrument = response.locals.instrument.data
	const percent = (user.percent || 50) / 100

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
		// Apply
		order.amountCash = percent * account.rtCashAvailForTrading
		if (order.amountCash < 100) {
			return sendError(response, 400, 'not ok - trade size is too small')()
		}
	}
	else if (action === 'exitlong') {
		order.side = 'B'
		// Apply
		const active = user.accountSummary.equity.equityPositions.find((item) => item.instrumentID === order.instrumentID)
		if (active.side === 'B') {
			order.orderQty = active.availableForTradingQty
		}
	}
	else {
		return sendError(response, 400, 'not ok - invalid action')()
	}

	superagent
		.post(`${config.endpoint}/orders/`)
		.type('json').accept('json')
		.set('x-mysolomeo-session-key', response.locals.sessionKey)
		.send(order)
		.then((result) => result.body)
		.catch(sendError(response, 500, 'not ok - order creation failed'))
		.then(() => response.send('ok'))
}))
