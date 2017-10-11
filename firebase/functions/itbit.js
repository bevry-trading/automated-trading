/* eslint camelcase:0 max-params:0 */
'use strict'

const crypto = require('crypto')
const superagent = require('superagent')
const { NError } = require('./util')
const endpoint = 'https://api.itbit.com/v1'

function prepareCurrency (currency) {
	return currency.toUpperCase().replace('BTC', 'XBT')
}

// https://api.itbit.com/docs#faq-1.-why-do-i-keep-getting-"bad-signature"-responses?
function request (service, method, path, params) {
	const { key, secret } = service.data
	if (!key || !secret) return Promise.resolve(new NError('invalid key/secret'))

	const url = `${endpoint}/${path}`

	const timestamp = Date.now().toString()
	const nonce = timestamp
	const list = [method.toUpperCase(), url, params || '', nonce, timestamp]
	const listString = nonce + JSON.stringify(list)
	const hash = crypto.createHash('sha256').update(listString).digest() // latin1 || base64 || hex
	const concat = Buffer.concat([Buffer.from(url), hash])
	const signature = crypto.createHmac('sha512', secret).update(concat).digest('base64')
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
		.add({ userid, key, secret, atservice: 'itbit', atmarket: 'cryptocurrency' })
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
	currency = prepareCurrency(currency)
	const result = wallet.balances.find((balance) => balance.currency === currency)
	if (result == null) return Promise.reject(new NError('currency in wallet not found', null, { wallet, currency }))
	return Number(result.availableBalance)
}

// https://api.itbit.com/docs#trading-new-order
function createOrder (service, symbol, action, walletid) {
	if (!symbol || !action) return Promise.reject(new Error('invalid inputs'))

	symbol = prepareCurrency(symbol)

	if (symbol !== 'XBTUSD') return Promise.reject(new NError('unsupported symbol', null, { symbol }))
	if (['buy', 'sell'].indexOf(action) === -1) return Promise.reject(new NError('unsupported action', null, { action }))

	const walletPromise = walletid
		? fetchWallet(service, walletid)
		: fetchWallets(service).then((wallets) => wallets[0])
	const walletBalancePromise = walletPromise
		.then((wallet) => Promise.all([
			wallet.id,
			fetchWalletCurrencyBalance(wallet, 'XBT'),
			fetchWalletCurrencyBalance(wallet, 'USD')
		]))
	const tickerPricePromise = fetchTicker(service, symbol).then((ticker) => (Number(ticker.ask) + Number(ticker.bid)) / 2)

	return Promise
		.all([
			walletBalancePromise,
			tickerPricePromise
		])
		.then(([[walletid, balanceXBT, balanceUSD], mid]) => {
			const amount = (action === 'sell' ? balanceXBT : (balanceUSD / mid)).toFixed(4)
			const price = mid.toFixed(4)
			const data = {
				side: action,
				type: 'limit',
				currency: 'XBT',
				amount,
				display: amount,
				price,
				instrument: symbol
			}
			return request(service, 'post', `/wallets/${walletid}/orders`, data)
		})
		.catch((err) => Promise.reject(new NError('create order failed', err)))
}

module.exports = { createService, fetchTicker, fetchWallets, fetchWallet, createOrder }
