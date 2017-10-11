/* eslint camelcase:0 */
'use strict'

const crypto = require('crypto')
const superagent = require('superagent')
const { log, NError } = require('./util')
const endpoint = 'https://api.bitfinex.com'
const version = 'v1'

function prepareCurrency (currency) {
	return currency.toLowerCase().replace('xbt', 'btc')
}

function get (path) {
	log('bitfinex get', path)
	const url = `${endpoint}/${version}/${path}`
	return superagent.get(url).accept('json').timeout(15000)
		.then((response) => response.body)
		.catch((err) => {
			const message = err.response && err.response.body && err.response.body.message
			if (message) return Promise.reject(new NError(message))
			return Promise.reject(err)
		})
		.catch((err) => Promise.reject(new NError('request failed', err, {
			url
		})))
}

function post (path, service, params) {
	log('bitfinex post', path)
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
	return superagent.post(url).accept('json').set(headers).timeout(15000)
		.then((response) => response.body)
		.catch((err) => {
			const message = err.response && err.response.body && err.response.body.message
			if (message) return Promise.reject(new NError(message))
			return Promise.reject(err)
		})
		.catch((err) => Promise.reject(new NError('request failed', err, {
			url, headers, params, nonce
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
	log('bitfinex fetchTicker', symbol)
	if (!symbol) return Promise.reject(new Error('invalid symbol'))
	return get(`pubticker/${symbol}`).catch((err) => Promise.reject(new NError('fetch ticker failed', err)))
}

function fetchBalances (service) {
	log('bitfinex fetchBalances')
	return post('balances', service, {}).catch((err) => Promise.reject(new NError('fetch balances failed', err)))
}

function fetchBalance (balances, symbol) {
	log('bitfinex fetchBalance')
	return balances.reduce((sum, value) => sum + (value.type === 'exchange' && value.currency === symbol && value.available), 0)
}

// https://bitfinex.readme.io/v1/reference#rest-auth-new-order
function createOrder (service, symbol, action) {
	log('bitfinex order', symbol, action)
	if (!symbol || !action) return Promise.reject(new Error('invalid inputs'))

	symbol = prepareCurrency(symbol)

	if (symbol !== 'btcusd') return Promise.reject(new NError('unsupported symbol', null, { symbol }))
	if (['buy', 'sell'].indexOf(action) === -1) return Promise.reject(new NError('unsupported action', null, { action }))

	return Promise
		.all([
			fetchBalances(service).then((balances) => Promise.all([
				fetchBalance(balances, 'btc'),
				fetchBalance(balances, 'usd')
			])),
			fetchTicker(symbol)
		])
		.then(([[balanceBTC, balanceUSD], ticker]) => {
			log('bitfinex create order', balanceBTC, balanceUSD, ticker)
			const amount = (action === 'sell' ? balanceBTC : (balanceUSD / ticker.mid)).toString()
			const price = ticker.mid.toString()
			const data = {
				symbol,
				amount,
				price,
				use_all_available: '1',
				is_hidden: false,
				is_postonly: false,
				ocoorder: false,
				buy_price_oco: '0',
				sell_price_oco: '0',
				side: action, // buy or sell
				type: 'exchange market'
			}
			return post('order/new', service, data)
		})
		.catch((err) => Promise.reject(new NError('create order failed', err)))
}

module.exports = { createService, fetchBalances, createOrder }
