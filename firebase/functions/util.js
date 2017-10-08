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

module.exports = { NError, sendError }
