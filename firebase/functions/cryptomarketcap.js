'use strict'

const { NError } = require('./util')
const superagent = require('superagent')

function fetch (store) {
	return Promise.all([
		superagent.get('https://api.coinmarketcap.com/v1/global').accept('json').timeout(15000)
			.catch((err) => Promise.reject(new NError('failed to fetch market data', err)))
			.then((response) =>
				store.doc(`data/coinmarketcap/global/${response.body.last_updated}`).set(response.body)
					.catch((err) => Promise.reject(new NError('failed to save market data', { market: response.body }, err)))
			),
		superagent.get('https://api.coinmarketcap.com/v1/ticker/?limit=0').accept('json').timeout(15000)
			.catch((err) => Promise.reject(new NError('failed to fetch currency data', err)))
			.then((response) => Promise.all(
				response.body.map((currency) => store.doc(`data/coinmarketcap/${currency.id}/${currency.last_updated}`).set(currency)
					.catch((err) => Promise.reject(new NError('failed to save currency data', { currency }, err)))
				)
			))
	]).then(() => 'ok')
}

module.exports = { fetch }
