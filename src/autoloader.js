CTS._ready = Q.defer();
// You can use this to trigger things that depend on CTS and
// all its dependencies (e.g., CTS.$)
CTS.ready = CTS._ready.promise; 

CTS.status = {
  _libraryLoaded: Q.defer(),
  _defaultTreeReady: Q.defer()
};

CTS.status.libraryLoaded = CTS.status._libraryLoaded.promise;
CTS.status.defaultTreeReady = CTS.status._defaultTreeReady.promise;

CTS.ensureJqueryThenMaybeAutoload = function() {
  if (typeof root.jQuery != 'undefined') {
    CTS.$ = root.jQuery;
    CTS.maybeAutoload();
    CTS.status._libraryLoaded.resolve();
  } else if ((typeof exports !== 'undefined') && (typeof require == 'function')) {
    // This is only if we're operating inside node.js
    CTS.$ = require('jquery');
    CTS.maybeAutoload();
    CTS.status._libraryLoaded.resolve();
  } else {
    var s = document.createElement('script');
    s.setAttribute('src', '//ajax.googleapis.com/ajax/libs/jquery/2.0.2/jquery.min.js');
    s.setAttribute('type', 'text/javascript');
    s.onload = function() {
      CTS.$ = jQuery.noConflict();
      CTS.maybeAutoload();
      CTS.status._libraryLoaded.resolve();
    };
    document.getElementsByTagName('head')[0].appendChild(s);
  }
};

CTS.maybeAutoload = function() {
  if (typeof CTS.shouldAutoload == 'undefined') {
    CTS.shouldAutoload = CTS.autoloadCheck();
  }
  if (CTS.shouldAutoload) {
    CTS.$('body').css('display', 'none');
    CTS.$(function() {
      CTS.engine = new CTS.Engine();
      CTS.engine.boot().then(
        function() {
          CTS.$('body').fadeIn();
        }
      );
    });
  }
};

CTS.ensureJqueryThenMaybeAutoload();


