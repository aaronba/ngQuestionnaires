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

app = angular.module 'oauth', ['ui.bootstrap', 'ngDragDrop', 'ui.select2', 'ngCookies']

app.config([
	'$routeProvider'
	'$locationProvider'
	($routeProvider, $locationProvider) ->
		$routeProvider.when '/',
			templateUrl: 'templates/signin.html'
			controller: 'SigninCtrl'

		$routeProvider.otherwise redirectTo: '/'
		hooks.configRoutes $routeProvider, $locationProvider if hooks?.configRoutes
]).config ['$httpProvider', ($httpProvider) ->
	interceptor = [
		'$rootScope'
		'$location'
		'$cookieStore'
		'$q'
		($rootScope, $location, $cookieStore, $q) ->

			success = (response) ->

				$rootScope.error =
					state : false
					message : ''
					type : ''

				return response

			error = (response) ->

				$rootScope.error =
					state : false
					message : ''
					type : ''

				if response.status == 401

					if $cookieStore.get 'accessToken'
						delete $rootScope.accessToken
						$cookieStore.remove 'accessToken'

					if $location.path() == "/"
						$rootScope.error.state = true
						$rootScope.error.message = "Invalid passphrase"

					$rootScope.authRequired = $location.path()
					$location.path '/'
					deferred = $q.defer()
					return deferred.promise


				# otherwise, default behaviour
				return $q.reject response

			return (promise) ->
				return promise.then success, error
	]
	$httpProvider.responseInterceptors.push interceptor
]
if hooks?.config
	config() for config in hooks.config


app.factory 'UserService', ($http, $rootScope, $cookieStore) ->
	$rootScope.accessToken = $cookieStore.get 'accessToken'
	return $rootScope.UserService = {
		login: (user, success, error) ->
			authorization = (user.name + ':' + user.pass).encodeBase64()

			$http(
				method: "POST"
				url: "/token"
				data:
					grant_type: "client_credentials"
				headers:
					Authorization: "Basic " + authorization
			).success((data) ->
				$rootScope.accessToken = data.access_token
				$cookieStore.put 'accessToken', data.access_token

				path = $rootScope.authRequired || '/key-manager'
				delete $rootScope.authRequired
				success path if success
			).error(error)

		isLogin: -> $cookieStore.get('accessToken')?

		logout: ->
			delete $rootScope.accessToken
			$cookieStore.remove 'accessToken'
	}

app.factory 'MenuService', ($rootScope, $location) ->
	$rootScope.selectedMenu = $location.path()
	return changed: -> $rootScope.selectedMenu = $location.path()

app.controller 'SigninCtrl', ($scope, $rootScope, $timeout, $http, $location, UserService, MenuService) ->
	MenuService.changed()
	if UserService.isLogin() && hooks?.configRoutes
		return $location.path '/key-manager'
	$scope.user = {}

	$scope.userForm =
		template: "/templates/userForm.html"
		submit: ->
			$scope.info =
				status: ''
				message: ''

			#signin
			UserService.login $scope.user, ((path)->
				window.location.reload()
			), (error) ->
				$scope.info =
					status: 'error'
					message: error?.message || 'Internal error'