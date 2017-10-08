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

function getService (store, userid, serviceid) {
	if (!userid || !serviceid) return Promise.reject(new NError('get service failed because invalid data'))
	const document = store.doc(`users/${userid}/services/${serviceid}`)
	return document.get()
		.then((snapshot) => {
			const data = snapshot.data()
			const service = { document, data }
			return service
		})
		.catch((err) => Promise.reject(new NError('get service failed because the read failed', err)))
}

function createUser (store, email) {
	if (!email) return Promise.reject(new NError('create user failed because invalid email'))
	return store.collection('users')
		.add({ email })
		.catch((err) => Promise.reject(new NError('create user failed because the save failed', err)))
		.then((ref) => ref.id)
}

module.exports = { NError, sendError, getService, createUser }
