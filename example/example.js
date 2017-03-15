'use strict';

angular.module('example', ['ui.mention']).run(function ($rootScope) {
  $rootScope.post = {
    message: 'hi there $k'
  };
}).directive('mentionExample', function () {
  return {
    require: 'uiMention',
    link: function link($scope, $element, $attrs, uiMention) {
      /**
       * $mention.findChoices()
       *
       * @param  {regex.exec()} match    The trigger-text regex match object
       * @todo Try to avoid using a regex match object
       * @return {array[choice]|Promise} The list of possible choices
       */
      uiMention.findChoices = function (match, mentions) {
        return choices
        // Matches items from search query
        .filter(function (choice) {
          return ~(choice.label).indexOf(match[1]);
        });
      };
    }
  };
});

var choices = [{label: 'bob mare' }, { label: 'kenny' }, { label: 'kyle$' }, { label: 'kyle' }, {  label: 'steve' }, { label: 'steve.hello' }];
