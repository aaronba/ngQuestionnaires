describe('Test ngQuestionnaires.questions QuestionDeleteCtrl', function () {
  var ctrl, $scope;

  beforeEach(module('ngQuestionnaires.questions'));

  beforeEach(inject(function ($controller, $rootScope) {
    $scope = $rootScope.$new();
    ctrl = $controller('QuestionDeleteCtrl', { $scope: $scope });
  }));

  it('should pass a dummy test', inject(function () {
    expect(ctrl).toBeTruthy();
  }));
});