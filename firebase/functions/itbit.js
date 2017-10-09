/* eslint camelcase:0 max-params:0 */
'use strict'

const crypto = require('crypto')
const superagent = require('superagent')
const { NError } = require('./util')
const endpoint = 'https://api.itbit.com/v1'

// https://api.itbit.com/docs#faq-1.-why-do-i-keep-getting-"bad-signature"-responses?
function request (service, method, path, params) {
	const { key, secret } = service.data
	if (!key || !secret) return Promise.resolve(new NError('invalid key/secret'))

	const url = `${endpoint}/${path}`

	const timestamp = Date.now().toString()
	const nonce = timestamp
	const list = [method, url, params || '', nonce, nonce]
	const listString = nonce + JSON.stringify(list)
	const hash = crypto.createHash('sha256').update(listString).digest('hex') // latin1 || base64
	const hashString = url + hash
	const signature = crypto.createHmac('sha512', secret).update(hashString).digest('base64')
	const headers = {
		'Authorization': `${key}:${signature}`,
		'X-Auth-Timestamp': timestamp,
		'X-Auth-Nonce': nonce
	}

	const request = superagent[method](url).type('json').accept('json').set(headers).timeout(15000)
	if (params) request.send(params)
	return request
		.then((response) => response.body)
		.catch((err) => Promise.reject(new NError('request failed', err, {
			url, headers, params
		})))
}

function createService (store, atuser, userid, key, secret) {
	if (!key || !secret) return Promise.reject(new NError('create service failed because invalid auth'))
	return store.collection(`users/${atuser}/services`)
		.add({ userid, key, secret, service: 'itbit', market: 'cryptocurrency' })
		.catch((err) => Promise.reject(new NError('create service failed because the save failed', err)))
		.then((ref) => ref.id)
}

function fetchTicker (service, symbol) {
	if (!symbol) return Promise.reject(new Error('invalid symbol'))
	return request(service, 'get', `markets/${symbol}/ticker`).catch((err) => Promise.reject(new NError('fetch ticker failed', err)))
}

// https://api.itbit.com/docs#trading-get-all-wallets
function fetchWallets (service) {
	const userid = service.data.userid
	return request(service, 'get', `wallets?userId=${userid}`).catch((err) => Promise.reject(new NError('fetch wallets failed', err)))
}
function fetchWallet (service, walletid) {
	return request(service, 'get', `wallets/${walletid}`).catch((err) => Promise.reject(new NError('fetch wallet failed', err)))
}
function fetchWalletCurrencyBalance (wallet, currency) {
	const result = wallet.balances.find((balance) => balance.currency === currency)
	if (!result) return Promise.reject(new NError('currency in wallet not found', null, { wallet, currency }))
	return result.availableBalance
}

// https://bitfinex.readme.io/v1/reference#rest-auth-new-order
function createOrder (service, action, from, to, walletid) {
	if (!action || !from || !to) return Promise.reject(new Error('invalid inputs'))
	if (action !== 'buy' && action !== 'sell') return Promise.reject(new Error('invalid action'))
	const symbol = from + to

	const walletPromise = walletid
		? fetchWallet(service, walletid)
		: fetchWallets(service).then((wallets) => wallets[0])
	const walletBalancePromise = walletPromise
		.then((wallet) => Promise.all([
			walletid,
			fetchWalletCurrencyBalance(wallet, from),
			fetchWalletCurrencyBalance(wallet, to)
		]))
	const tickerPricePromise = fetchTicker(service, symbol)
		.then((ticker) => (ticker.bid + ticker.amount) / 2)

	return Promise
		.all([
			walletBalancePromise,
			tickerPricePromise
		])
		.then(([[walletid, balanceFrom, balanceTo], mid]) => {
			const amount = (action === 'sell' ? balanceFrom : (balanceTo / mid)).toString()
			return request(service, 'post', `/wallets/${walletid}/orders`, {
				side: action, // buy or sell
				type: 'limit',
				currency: from,
				amount,
				display: amount,
				price: mid.toString(),
				instrument: symbol
			})
		})
		.catch((err) => Promise.reject(new NError('create order failed', err)))
}

module.exports = { createService, fetchWallets, fetchWallet, createOrder }
