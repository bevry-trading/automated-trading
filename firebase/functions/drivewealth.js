'use strict'

const { NError } = require('./util')
const superagent = require('superagent')
const endpoint = 'https://api.drivewealth.net/v1'

function createService (store, userid, username, password) {
	if (!username || !password) return Promise.reject(new NError('create service failed because missing username/password'))
	return store.collection(`users/${userid}/services`)
		.add({ username, password, service: 'drivewealth' })
		.catch((err) => Promise.reject(new NError('create service failed because the save failed', err)))
		.then((ref) => ref.id)
}

function createSession (service) {
	const { username, password } = service.data
	if (!username || !password) return Promise.reject(new NError('create session failed because invalid data'))
	return superagent
		.post(`${endpoint}/userSessions`)
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
			ipAddress: '1.1.1.1'
		})
		.catch((err) => Promise.reject(new NError('create session failed because the request failed', err)))
		.then((result) => {
			const session = result.body
			return service.document.set({ session }, { merge: true })
				.then(session)
				.catch((err) => Promise.reject(new NError('create session failed because the save failed', err)))
		})
}

function fetchAccountSummary (service) {
	const session = service.data.session
	const account = session.accounts[0]
	const sessionKey = service.data.session.sessionKey
	return superagent
		.get(`${endpoint}/users/${session.userID}/accountSummary/${account.accountID}`)
		.accept('json')
		.set('x-mysolomeo-session-key', sessionKey)
		.catch((err) => Promise.reject(new NError('fetch account summary failed because the request failed', err)))
		.then((result) => result.body)
}

function fetchAccount (service) {
	const session = service.data.session
	const account = session.accounts[0]
	const sessionKey = service.data.session.sessionKey
	return superagent
		.get(`${endpoint}/users/${session.userID}/accounts/${account.accountID}`)
		.accept('json')
		.set('x-mysolomeo-session-key', sessionKey)
		.catch((err) => Promise.reject(new NError('fetch account failed because the request failed', err)))
		.then((result) => result.body)
}

function fetchInstrument (service, symbol) {
	const sessionKey = service.data.session.sessionKey
	return superagent
		.get(`${endpoint}/instruments`)
		.query({ symbols: symbol })
		.accept('json')
		.set('x-mysolomeo-session-key', sessionKey)
		.catch((err) => Promise.reject(new NError('fetch instrument failed because the request failed', err)))
		.then((result) => result.body[0])
}

/*
function saveAccountSummary (service) {
	return fetchAccountSummary(service)
		.then((accountSummary) => service.document.set({ accountSummary }, { merge: true }).then(() => accountSummary))
		.catch((err) => Promise.reject(new NError('save accoumt summary failed', err)))
}

function saveAccount (service) {
	return fetchAccountSummary(service)
		.then((account) => service.document.set({ account }, { merge: true }).then(() => account))
		.catch((err) => Promise.reject(new NError('save account failed', err)))
}

function saveInstrument (service) {
	return fetchAccountSummary(service)
		.then((instrument) => service.document.collection('instruments').doc(request.query.symbol).set(instrument).then(() => instrument))
		.catch((err) => Promise.reject(new NError('save account failed', err)))
}

function getInstrument (store, service, symbol) {
	// Check Symbol
	if (!symbol) return Promise.reject(new NError('missing symbol'))

	// Fetch Instrument
	const document = service.document.doc(`/instruments/${symbol}`)
	return document.get()
		.catch((err) => Promise.reject(new NError('instrument read failed', err)))
		.then((snapshot) => {
			const data = snapshot.data()
			const instrument = { document, data }
			return instrument
		})
}

	superagent
		.get(`${endpoint }/instruments`)
		.query({ symbols: request.query.symbol })
		.accept('json')
		.set('x-mysolomeo-session-key', response.locals.sessionKey)
		.catch(sendError(response, 500, 'not ok - instrument fetch failed'))
		.then((result) => result.body[0])
		.then((instrument) => response.locals.service.document.collection('instruments').doc(request.query.symbol).set(instrument))
		.catch(sendError(response, 500, 'not ok - instrument save failed'))
		.then(() => response.send('ok'))
*/


function validateSession (service) {
	// Check Session
	const sessionKey = service.data.session && service.data.session.sessionKey
	if (!sessionKey) return Promise.reject(new NError('missing session'))
	return Promise.resolve(service)
}

function prepareOrder (service, action, symbol) {
	const state = {}
	return Promise.all([
		fetchInstrument(service, symbol).then((instrument) => {
			state.instrument = instrument
		}),
		fetchAccountSummary(service).then((accountSummary) => {
			state.accountSummary = accountSummary
		})
	]).then(() => state)
}
function placeOrder (service, action, instrument, accountSummary) {
	// Fetch
	const session = service.data.session
	const sessionKey = service.data.session.sessionKey
	const account = session.accounts[0]
	const percent = (service.data.percent || 45) / 100  /* @todo use a higher percentage if the account is a margin account */
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
	if (action === 'buy') {
		order.side = 'B'
		order.amountCash = percent * available
		if (order.amountCash < 100) {
			return Promise.reject(new NError('create order failed because trade size is too small', { order, available, percent }))
		}
	}
	else if (action === 'sell' || action === 'short') { /* @todo add short support when drivewealth adds short support */
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
		.post(`${endpoint}/orders/`)
		.type('json').accept('json')
		.set('x-mysolomeo-session-key', sessionKey)
		.send(order)
		.then((result) => result.body)
		.catch((err) => Promise.reject(new NError('create order failed because the request failed', err)))
}

function createOrder (service, action, symbol) {
	return prepareOrder(service, action, symbol).then(({ instrument, accountSummary }) => placeOrder(service, action, instrument, accountSummary))
}

module.exports = { createService, createSession, fetchAccountSummary, fetchAccount, fetchInstrument, validateSession, createOrder }
