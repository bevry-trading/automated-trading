'use strict'

const crypto = require('crypto')
const superagent = require('superagent')
const { NError } = require('./util')
const endpoint = 'https://api.bitfinex.com'

function request (path, user, params) {
	const { key, secret } = user.data
	if (!key || !secret) return Promise.resolve(new NError('missing key or secret'))
	const version = 'v1'
	const url = `${endpoint}/${version}/${path}`
	const nonce = Date.now().toString()
	const payload = new Buffer(JSON.stringify(
		Object.assign({
			request: `/${version}/${path}`,
			nonce
		}, params)
	)).toString('base64')
	const signature = crypto.createHmac('sha384', secret).update(payload).digest('hex')
	const headers = {
		'X-BFX-APIKEY': key,
		'X-BFX-PAYLOAD': payload,
		'X-BFX-SIGNATURE': signature
	}
	return superagent.post(url).type('json').accept('json').set(headers).timeout(15000).then((result) => {
		if (result.body && result.body.message) return Promise.reject(new Error(result.body.message))
		return result.body
	})
}

function createService (store, userid, key, secret) {
	if (!key || !secret) return Promise.reject(new NError('create service failed because missing key/secret'))
	return store.collection(`users/${userid}/services`)
		.add({ key, secret, service: 'bitfinex' })
		.catch((err) => Promise.reject(new NError('create service failed because the save failed', err)))
		.then((ref) => ref.id)
}

function fetchBalances (service) {
	return request('balances', service, {})
		.catch((err) => Promise.reject(new NError('fetch balances failed because the request failed', err)))

	/*
	[{
		"type": "deposit",
		"currency": "btc",
		"amount": "0.0",
		"available": "0.0"
	}, {
		"type": "deposit",
		"currency": "usd",
		"amount": "1.0",
		"available": "1.0"
	}, {
		"type": "exchange",
		"currency": "btc",
		"amount": "1",
		"available": "1"
	}, {
		"type": "exchange",
		"currency": "usd",
		"amount": "1",
		"available": "1"
	}, {
		"type": "trading",
		"currency": "btc",
		"amount": "1",
		"available": "1"
	}, {
		"type": "trading",
		"currency": "usd",
		"amount": "1",
		"available": "1"
	}]
	*/
}

function fetchBalance (service, symbol) {
	if (!symbol) return Promise.reject(new Error('missing symbol'))
	return fetchBalances(service).then((results) => results.reduce((sum, value) => sum + (value.type === 'exchange' && value.currency === symbol && value.available), 0))
}

// https://bitfinex.readme.io/v1/reference#rest-auth-new-order
function createOrder (service, action, from, to) {
	return fetchBalance(service, from)
		.then((balance) => request('order/new', service, {
			symbol: from + to,
			amount: balance,
			price: Math.random(),
			side: action, // buy or sell
			type: 'exchange market'
		}))
		.catch((err) => Promise.reject(new NError('create order failed because the request failed', err)))
}

module.exports = { createService, fetchBalances, fetchBalance, createOrder }
