angular.module('ui.mention')
.controller('uiMention', function (
  $element, $scope, $attrs, $q, $timeout, $document, $compile
) {

  // Beginning of input or preceeded by spaces: @sometext
  this.delimiter = '$';

  // this.pattern is left for backward compatibility
  this.searchPattern = this.pattern || new RegExp("(?:\\s+|^)\\" + this.delimiter + "(\[A-Za-z0-9._-]*(?: \\w+)?)$");

  this.decodePattern = new RegExp(this.delimiter + "\[[\\s\\w]+:[0-9a-z-]+\]", "gi");

  this.$element = $element;
  this.$compile = $compile;
  this.$scope = $scope;
  this.$attrs = $attrs;

  this.choices = [];
  this.mentions = [];
  var ngModel;

  /**
   * $mention.init()
   *
   * Initializes the plugin by setting up the ngModelController properties
   *
   * @param  {ngModelController} model
   */
  this.init = function(model) {
    // Leading whitespace shows up in the textarea but not the preview
    $attrs.ngTrim = 'false';

    ngModel = model;

    ngModel.$parsers.push( value => {
      // Removes any mentions that aren't used
      this.mentions = this.mentions.filter( mention => {
       if (~value.indexOf(this.label(mention)))
          return value = value.replace(this.label(mention), this.encode(mention));
      });

      this.render(value);

      return value;
    });

    ngModel.$formatters.push( (value = '') => {
      // In case the value is a different primitive
      value = value.toString();

      // Removes any mentions that aren't used
      this.mentions = this.mentions.filter( mention => {
        if (~value.indexOf(this.encode(mention))) {
          value = value.replace(this.encode(mention), this.label(mention));
          return true;
        } else {
          return false;
        }
      });

      return value;
    });

    ngModel.$render = () => {
      $element.val(ngModel.$viewValue || '');
      $timeout(this.autogrow, true);
      this.render();
    };

    appendTemplate(this.choices, this, getTextBoundingRect($element[0], $element[0].selectionStart, $element[0].selectionEnd, false))
  };

  var temp = document.createElement('span');
  function parseContentAsText(content) {
    try {
      temp.textContent = content;
      return temp.innerHTML;
    } finally {
      temp.textContent = null;
    }
  }

  /**
   * $mention.render()
   *
   * Renders the syntax-encoded version to an HTML element for 'highlighting' effect
   *
   * @param  {string} [text] syntax encoded string (default: ngModel.$modelValue)
   * @return {string}        HTML string
   */
  this.render = (html = ngModel.$modelValue) => {
    html = (html || '').toString();
    // Convert input to text, to prevent script injection/rich text
    html = parseContentAsText(html);
    this.mentions.forEach( mention => {
      html = html.replace(this.encode(mention), this.highlight(mention));
    });
    this.renderElement().html(html);
    return html;
  };

  /**
   * $mention.renderElement()
   *
   * Get syntax-encoded HTML element
   *
   * @return {Element} HTML element
   */
   this.renderElement = () => {
     return $element.next();
   };

  /**
   * $mention.highlight()
   *
   * Returns a choice in HTML highlight formatting
   *
   * @param  {mixed|object} choice The choice to be highlighted
   * @return {string}              HTML highlighted version of the choice
   */
  this.highlight = function(choice) {
    return `${this.label(choice)}`;
  };

  /**
   * $mention.decode()
   *
   * @note NOT CURRENTLY USED
   * @param  {string} [text] syntax encoded string (default: ngModel.$modelValue)
   * @return {string}        plaintext string with encoded labels used
   */
  this.decode = function(value = ngModel.$modelValue) {
    return value ? value.replace(this.decodePattern, '$1') : '';
  };

  /**
   * $mention.label()
   *
   * Converts a choice object to a human-readable string
   *
   * @param  {mixed|object} choice The choice to be rendered
   * @return {string}              Human-readable string version of choice
   */
  this.label = function(choice) {
    return `${this.delimiter}${choice.label}`;
  };

  /**
   * $mention.encode()
   *
   * Converts a choice object to a syntax-encoded string
   *
   * @param  {mixed|object} choice The choice to be encoded
   * @return {string}              Syntax-encoded string version of choice
   */
  this.encode = function(choice) {
    return `${this.delimiter}${this.label(choice)}`;
  };

  /**
   * $mention.replace()
   *
   * Replaces the trigger-text with the mention label
   *
   * @param  {mixed|object} mention  The choice to replace with
   * @param  {regex.exec()} [search] A regex search result for the trigger-text (default: this.searching)
   * @param  {string} [text]         String to perform the replacement on (default: ngModel.$viewValue)
   * @return {string}                Human-readable string
   */
  this.replace = function(mention, search = this.searching, text = ngModel.$viewValue) {
    // TODO: come up with a better way to detect what to remove
    // TODO: consider alternative to using regex match
    text = text.substr(0, search.index + search[0].indexOf(this.delimiter)) +
           this.label(mention) +
           text.substr(search.index + search[0].length);
    return text;
  };

  /**
   * $mention.select()
   *
   * Adds a choice to this.mentions collection and updates the view
   *
   * @param  {mixed|object} [choice] The selected choice (default: activeChoice)
   */
  this.select = function(choice = this.activeChoice) {
    if (!choice) {
      return false;
    }

    // Add the mention
    this.mentions.push(choice);

    // Replace the search with the label
    ngModel.$setViewValue(this.replace(choice));

    // Close choices panel
    this.cancel();

    // Update the textarea
    ngModel.$render();
  };

  /**
   * $mention.up()
   *
   * Moves this.activeChoice up the this.choices collection
   */
  this.up = function() {
    let index = this.choices.indexOf(this.activeChoice);
    if (index > 0) {
      this.activeChoice = this.choices[index - 1];
    } else {
      this.activeChoice = this.choices[this.choices.length - 1];
    }
  };

  /**
   * $mention.down()
   *
   * Moves this.activeChoice down the this.choices collection
   */
  this.down = function() {
    let index = this.choices.indexOf(this.activeChoice);
    if (index < this.choices.length - 1) {
      this.activeChoice = this.choices[index + 1];
    } else {
      this.activeChoice = this.choices[0];
    }
  };

  /**
   * $mention.search()
   *
   * Searches for a list of mention choices and populates
   * $mention.choices and $mention.activeChoice
   *
   * @param  {regex.exec()} match The trigger-text regex match object
   * @todo Try to avoid using a regex match object
   */
  this.search = function(match) {
    this.searching = match;

    return $q.when( this.findChoices(match, this.mentions) )
      .then( choices => {
        this.choices = choices;
        this.activeChoice = choices[0];
        return choices;
      });
  };

  /**
   * $mention.findChoices()
   *
   * @param  {regex.exec()} match    The trigger-text regex match object
   * @todo Try to avoid using a regex match object
   * @todo Make it easier to override this
   * @return {array[choice]|Promise} The list of possible choices
   */
  this.findChoices = function(match, mentions) {
    return [];
  };

  /**
   * $mention.cancel()
   *
   * Clears the choices dropdown info and stops searching
   */
  this.cancel = function() {
    this.choices = [];
    this.searching = null;
  };

  this.autogrow = function() {
    $element[0].style.height = 0; // autoshrink - need accurate scrollHeight
    let style = getComputedStyle($element[0]);
    if (style.boxSizing == 'border-box')
    $element[0].style.height = $element[0].scrollHeight + 'px';
  };

  // Interactions to trigger searching
  $element.on('keyup', event => {
    // If event is fired AFTER activeChoice move is performed
    if (this.moved)
      return this.moved = false;
    // Don't trigger on selection
    if ($element[0].selectionStart != $element[0].selectionEnd)
      return;
    let text = $element.val();
    // text to left of cursor ends with `@sometext`
    let match = this.searchPattern.exec(text.substr(0, $element[0].selectionStart));

    if (match) {
      this.search(match)
      updatePopOverPosition($element[0]);
    } else {
      this.cancel();
    }

    if (!$scope.$$phase) {
      $scope.$apply();
    }
  });

  $element.on('keydown', event => {
    if (!this.searching)
      return;

    switch (event.keyCode) {
      case 13: // return
        this.select();
        break;
      case 38: // up
        this.up();
        break;
      case 40: // down
        this.down();
        break;
      default:
        // Exit function
        return;
    }

    this.moved = true;
    event.preventDefault();

    if (!$scope.$$phase) {
      $scope.$apply();
    }
  });

  this.onMouseup = (function(event) {
    if (event.target == $element[0])
      return

    $document.off('mouseup', this.onMouseup);

    if (!this.searching)
      return;

    // Let ngClick fire first
    $scope.$evalAsync( () => {
      this.cancel();
    });
  }).bind(this);

  $element.on('focus', event => {
    $document.on('mouseup', this.onMouseup);
  });

  // Autogrow is mandatory beacuse the textarea scrolls away from highlights
  $element.on('input', this.autogrow);

  // Initialize autogrow height
  $timeout(this.autogrow, true);

  function getTextBoundingRect(input, selectionStart, selectionEnd, debug) {
    // Basic parameter validation
    if(!input || !('value' in input)) return input;
    if(typeof selectionStart == "string") selectionStart = parseFloat(selectionStart);
    if(typeof selectionStart != "number" || isNaN(selectionStart)) {
      selectionStart = 0;
    }
    if(selectionStart < 0) selectionStart = 0;
    else selectionStart = Math.min(input.value.length, selectionStart);
    if(typeof selectionEnd == "string") selectionEnd = parseFloat(selectionEnd);
    if(typeof selectionEnd != "number" || isNaN(selectionEnd) || selectionEnd < selectionStart) {
      selectionEnd = selectionStart;
    }
    if (selectionEnd < 0) selectionEnd = 0;
    else selectionEnd = Math.min(input.value.length, selectionEnd);

    // If available (thus IE), use the createTextRange method
    if (typeof input.createTextRange == "function") {
      let range = input.createTextRange();
      range.collapse(true);
      range.moveStart('character', selectionStart);
      range.moveEnd('character', selectionEnd - selectionStart);
      return range.getBoundingClientRect();
    }
    // createTextRange is not supported, create a fake text range
    let offset = getInputOffset(),
      topPos = offset.top,
      leftPos = offset.left,
      width = getInputCSS('width', true),
      height = getInputCSS('height', true);

    let cssDefaultStyles = "white-space:pre-wrap;padding:0;margin:0;";

    let text = input.value,
      textLen = text.length,
      fakeClone = document.createElement("div");
    if(selectionStart > 0) appendPart(0, selectionStart);
    let fakeRange = appendPart(selectionStart, selectionEnd);
    if(textLen > selectionEnd) appendPart(selectionEnd, textLen);

    // Styles to inherit the font styles of the element
    fakeClone.style.cssText = cssDefaultStyles;

    // Styles to position the text node at the desired position
    fakeClone.style.position = "absolute";
    fakeClone.style.top = topPos + "px";
    fakeClone.style.left = leftPos + "px";
    fakeClone.style.width = width + "px";
    fakeClone.style.height = height + "px";
    document.body.appendChild(fakeClone);
    let returnValue = fakeRange.getBoundingClientRect(); //Get rect

    if (!debug) fakeClone.parentNode.removeChild(fakeClone); //Remove temp
    return returnValue;

    // Local functions for readability of the previous code
    function appendPart(start, end){
      let span = document.createElement("span"),
        tmpText = text.substring(start, end);
      span.style.cssText = cssDefaultStyles; //Force styles to prevent unexpected results
      // add a space if it ends in a newline
      if (/[\n\r]$/.test(tmpText)) {
        tmpText += ' ';
      }
      span.textContent = tmpText;
      fakeClone.appendChild(span);
      return span;
    }
    // Computing offset position
    function getInputOffset(){
      let body = document.body,
        win = document.defaultView,
        docElem = document.documentElement,
        box = document.createElement('div');
      box.style.paddingLeft = box.style.width = "1px";
      body.appendChild(box);
      let isBoxModel = box.offsetWidth == 2;
      body.removeChild(box);
      box = input.getBoundingClientRect();
      let clientTop = docElem.clientTop || body.clientTop || 0,
        clientLeft = docElem.clientLeft || body.clientLeft || 0,
        scrollTop = win.pageYOffset || isBoxModel && docElem.scrollTop  || body.scrollTop,
        scrollLeft = win.pageXOffset || isBoxModel && docElem.scrollLeft || body.scrollLeft;
      return {
        top : box.top + scrollTop - clientTop,
        left: box.left + scrollLeft - clientLeft};
    }
    function getInputCSS(prop, isnumber){
      let val = document.defaultView.getComputedStyle(input, null).getPropertyValue(prop);
      return isnumber ? parseFloat(val) : val;
    }
  }

  function appendTemplate (choices, _this, coordinates) {
    let html = '<ul class="dropdown">\
      <li ng-repeat="choice in $mention.choices" ng-class="{active:$mention.activeChoice==choice}">\
        <a ng-click="$mention.select(choice)">\
          {{choice.label}}\
        </a>\
      </li>\
    </ul>'

    let element = angular.element(html);
    element.css({ display: "block", visibility: "visible", left: coordinates.left + 'px', top: coordinates.top + 'px', width: 0 });
    angular.element($document[0].querySelector('.mention-container')).append(element);
    _this.$compile(element)(_this.$scope);
  }

  function updatePopOverPosition (element) {
    let coordinates =  getTextBoundingRect(element, element.selectionStart, element.selectionEnd, false)
    angular.element($document[0].querySelector('.dropdown')).css({left: coordinates.left + 'px', top: coordinates.top + 'px'});
  }
});
