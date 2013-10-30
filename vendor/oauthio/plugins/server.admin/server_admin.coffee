# OAuth daemon
# Copyright (C) 2013 Webshell SAS
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see <http://www.gnu.org/licenses/>.

'use strict'

restify = require 'restify'
fs = require 'fs'
Url = require 'url'

{db} = shared = require '../shared'

db_getApps = (callback) ->
	db.redis.smembers 'adm:apps', (err, apps) ->
		return callback err if err
		return callback null, [] if not apps.length
		keys = ('a:' + app + ':key' for app in apps)
		db.redis.mget keys, (err, appkeys) ->
			return callback err if err
			return callback null, appkeys

## Event: add app to user when created
shared.on 'app.create', (req, app) ->
	db.redis.sadd 'adm:apps', app.id

## Event: remove app from user when deleted
shared.on 'app.remove', (req, app) ->
	db.redis.srem 'adm:apps', app.id

exports.setup = (callback) ->
	@server.get @config.base + '/admin', @auth.optional, (req, res, next) ->
		fs.readFile __dirname + '/app/index.html', 'utf8', (err, data) ->
			res.setHeader 'Content-Type', 'text/html'
			data = data.toString().replace /\{\{if admin\}\}([\s\S]*?)\{\{endif\}\}\n?/gm, if req.user then '$1' else ''
			res.end data
			next()

	@server.get new RegExp('^' + @config.base + '\/(lib|css|js|img|templates)\/.*'), restify.serveStatic
		directory: __dirname + '/app'
		maxAge: 1

	@server.get new RegExp('^' + @config.base + '\/admin\/(lib|css|js|img|templates)\/*'), @auth.needed, restify.serveStatic
		directory: __dirname + '/app'
		maxAge: 1

	# get my infos
	@server.get @config.base + '/api/me', @auth.needed, (req, res, next) =>
		db_getApps (e, appkeys) ->
			return next(e) if e
			res.send apps:appkeys
			next()

	callback()