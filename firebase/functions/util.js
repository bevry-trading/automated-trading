'use strict'

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

let counter = 0
function count () {
	return ++counter
}

function logError (...args) {
	console.error(...args)
}

function log (...args) {
	console.log(count(), ...args)
}

function errorInspect (err) {
	logError(require('util').inspect(err, false, 10, false))
}

function successInspect (details) {
	log(require('util').inspect(details, false, 10, false))
}

function sendError (response, message) {
	return function (err) {
		if (err) {
			errorInspect(err)
			if (!message) message = err.message
		}
		if (!message) message = 'an unknown error occured'
		response.status(err.statusCode || 500).send(message)
		return Promise.resolve()
	}
}

function getService (store, atuserid, atserviceid) {
	if (!atuserid || !atserviceid) return Promise.reject(new NError('get service failed because invalid credentials'))
	const document = store.doc(`users/${atuserid}/services/${atserviceid}`)
	return document.get()
		.then((snapshot) => {
			const data = snapshot.data()
			const service = { document, data }
			return service
		})
		.catch((err) => Promise.reject(new NError('get service failed because the read failed', err)))
}

function getServices (store, atuserid, atmarket) {
	if (!atuserid || !atmarket) return Promise.reject(new NError('get service failed because invalid credentials'))
	return store.collection(`users/${atuserid}/services`)
		.where('atmarket', '==', atmarket)
		.get()
		.then((querySnapshot) => {
			const result = []
			querySnapshot.forEach((document) => result.push({ data: document.data(), document }))
			log('get services', result.length)
			return result
		})
		.catch((err) => Promise.reject(new NError('get services failed because the read failed', err)))
}

function createUser (store, email) {
	if (!email) return Promise.reject(new NError('create user failed because invalid email'))
	return store.collection('users')
		.add({ email })
		.catch((err) => Promise.reject(new NError('create user failed because the save failed', err)))
		.then((ref) => ref.id)
}

module.exports = { count, logError, log, NError, errorInspect, successInspect, sendError, getService, getServices, createUser }
