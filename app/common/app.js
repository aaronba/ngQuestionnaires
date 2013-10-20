'use strict';

angular.module('ngQuestionnaires', [
        'ng',
        'ngRoute',
        'ngAnimate',
        'ui.bootstrap',
        'ngQuestionnaires.skip',
        'ngQuestionnaires.questionnaireFactory',
        'ngQuestionnaires.questionFactory',
        'ngQuestionnaires.responseFactory',
        'ngQuestionnaires.disabledWhenInvalid',
        'ngQuestionnaires.validationClass',
        'ngQuestionnaires.showHelp',
        'ngQuestionnaires.uniqueQuestionnaireTitle',
        'ngQuestionnaires.uniqueQuestionText',
        'ngQuestionnaires.multipleRequired',
        'ngQuestionnaires.questionnaireListController',
        'ngQuestionnaires.questionListController',
        'ngQuestionnaires.responseListController'
    ])
    .constant('fbUrl', 'https://ngquestionnaires.firebaseio.com/')
    .constant('pagination', {
        itemsPerPage: 5,
        maxSize: 5
    })
    .value('Firebase', Firebase)
    .value('_', _)
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/questionnaires/list', {
            templateUrl: 'questionnaires/questionnaire-list.tpl.html',
            controller: 'questionnaireListController'
        });
        $routeProvider.when('/questions/list', {
            templateUrl: 'questions/question-list.tpl.html',
            controller: 'questionListController'
        });
        $routeProvider.when('/responses/list', {
            templateUrl: 'responses/response-list.tpl.html',
            controller: 'responseListController'
        });
        $routeProvider.otherwise({redirectTo: '/questionnaires/list'});
    }])
    .run([
        '$cacheFactory',
        function ($cacheFactory) {
            var data = $cacheFactory('data');
        }]);
