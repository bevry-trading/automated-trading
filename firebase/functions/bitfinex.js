/* eslint camelcase:0 */
'use strict'

const crypto = require('crypto')
const superagent = require('superagent')
const { NError } = require('./util')
const endpoint = 'https://api.bitfinex.com'
const version = 'v1'

function get (path) {
	const url = `${endpoint}/${version}/${path}`
	return superagent.get(url).type('json').accept('json').timeout(15000)
		.then((response) => response.body)
		.catch((err) => {
			const message = err.response && err.response.body && err.response.body.message
			if (message) return Promise.reject(new NError(err.stack, null, { message }))
			return Promise.reject(err)
		})
		.catch((err) => Promise.reject(new NError('request failed', err, {
			url
		})))
}

function post (path, service, params) {
	const { key, secret } = service.data
	if (!key || !secret) return Promise.resolve(new NError('missing key or secret'))
	const url = `${endpoint}/${version}/${path}`
	const nonce = Date.now().toString()
	const data = Object.assign({
		request: `/${version}/${path}`,
		nonce
	}, params)
	const payload = new Buffer(JSON.stringify(data)).toString('base64')
	const signature = crypto.createHmac('sha384', secret).update(payload).digest('hex')
	const headers = {
		'X-BFX-APIKEY': key,
		'X-BFX-PAYLOAD': payload,
		'X-BFX-SIGNATURE': signature
	}
	return superagent.post(url).type('json').accept('json').set(headers).timeout(15000)
		.then((response) => response.body)
		.catch((err) => {
			const message = err.response && err.response.body && err.response.body.message
			if (message) return Promise.reject(new NError(err.stack, null, { message }))
			return Promise.reject(err)
		})
		.catch((err) => Promise.reject(new NError('request failed', err, {
			url, headers, params
		})))
}

function createService (store, atuserid, key, secret) {
	if (!key || !secret) return Promise.reject(new NError('create service failed because invalid auth'))
	return store.collection(`users/${atuserid}/services`)
		.add({ key, secret, atservice: 'bitfinex', atmarket: 'cryptocurrency' })
		.catch((err) => Promise.reject(new NError('create service failed because the save failed', err)))
		.then((ref) => ref.id)
}

function fetchTicker (symbol) {
	if (!symbol) return Promise.reject(new Error('invalid symbol'))
	return get(`pubticker/${symbol}`).catch((err) => Promise.reject(new NError('fetch ticker failed', err)))
}

function fetchBalances (service) {
	return post('balances', service, {}).catch((err) => Promise.reject(new NError('fetch balances failed', err)))
}

function fetchBalance (service, symbol) {
	if (!symbol) return Promise.reject(new Error('invalid symbol'))
	return fetchBalances(service).then((results) => results.reduce((sum, value) => sum + (value.type === 'exchange' && value.currency === symbol && value.available), 0))
}


// https://bitfinex.readme.io/v1/reference#rest-auth-new-order
function createOrder (service, action, from, to) {
	if (!action || !from || !to) return Promise.reject(new Error('invalid inputs'))
	if (action !== 'buy' && action !== 'sell') return Promise.reject(new Error('invalid action'))
	const symbol = from + to
	return Promise
		.all([
			fetchBalance(service, from),
			fetchBalance(service, to),
			fetchTicker(symbol)
		])
		.then(([balanceFrom, balanceTo, ticker]) => post('order/new', service, {
			symbol,
			amount: (action === 'sell' ? balanceFrom : (balanceTo / ticker.mid)).toString(),
			price: ticker.mid.toString(),
			use_all_available: '1',
			is_hidden: false,
			is_postonly: false,
			ocoorder: false,
			buy_price_oco: '0',
			sell_price_oco: '0',
			side: action, // buy or sell
			type: 'exchange market'
		}))
		.catch((err) => Promise.reject(new NError('create order failed', err)))
}

module.exports = { createService, fetchBalances, fetchBalance, createOrder }
