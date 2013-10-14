'use strict';

angular.module('ngQuestionnaires.questionnaireListController', [
        'ngQuestionnaires.questionnaireShowController',
        'ngQuestionnaires.questionnaireNewController',
        'ngQuestionnaires.questionnaireEditController',
        'ngQuestionnaires.questionnaireDeleteController'
    ])
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/questionnaires/show/:id', {
            templateUrl: 'questionnaires/questionnaire-show.tpl.html',
            controller: 'questionnaireShowController'
        });
        $routeProvider.when('/questionnaires/new', {
            templateUrl: 'questionnaires/questionnaire-edit.tpl.html',
            controller: 'questionnaireNewController'
        });
        $routeProvider.when('/questionnaires/edit/:id', {
            templateUrl: 'questionnaires/questionnaire-edit.tpl.html',
            controller: 'questionnaireEditController'
        });
        $routeProvider.when('/questionnaires/delete/:id', {
            templateUrl: 'questionnaires/questionnaire-delete.tpl.html',
            controller: 'questionnaireDeleteController'
        });
    }])
    .controller('questionnaireListController', [
        '$scope',
        'fbUrl',
        'Firebase',
        'angularFireCollection',
        function ($scope, fbUrl, Firebase, angularFireCollection) {
            $scope.questionnaires = angularFireCollection(new Firebase(fbUrl + 'questionnaires'));

            $scope.isMatch = function (questionnaire) {
                return $scope.hasSearchQuery() ? (
                    questionnaire.title.indexOf($scope.search.query) > -1 ||
                        questionnaire.description.indexOf($scope.search.query) > -1
                    ) : true;
            };

            $scope.hasSearchQuery = function () {
                return $scope.search.query;
            };
        }]);