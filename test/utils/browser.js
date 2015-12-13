// Load in dependencies
var assert = require('assert');
var fs = require('fs');
var functionToString = require('function-to-string');
var wd = require('wd');

// Resolve the compiled script
var script = fs.readFileSync(__dirname + '/../../dist/google-music.js', 'utf8');

// Google Login Info you have to fill this in
var username = process.env.GPM_USER;
var password = process.env.GPM_PWD;
var BS_USER = process.env.BS_USER;
var BS_KEY = process.env.BS_KEY;

if (!username || !password) {
  throw 'You need to define your GPM Username and Password';
}

// Define helpers for interacting with the browser
exports.openMusic = function (options) {
  // Fallback our options and default URL
  // DEV: We choose the Artists page because it has a "Shuffle" button
  //   In non-paid Google Music, there is a 15 second ad that plays for I'm Feeling Lucky radio
  //   "Shuffle artists" is a much better and faster alternative
  options = options || {};
  var url = options.url || 'https://play.google.com/music/listen#/artists';

  // Execute many async steps
  before(function startBrowser () {
    this.browser = wd.remote('hub.browserstack.com', 80);
    global.browser = this.browser;
  });
  before(function openBrowser (done) {
    var that = this;
    this.browser.init({
      browserName: 'firefox',
      name: 'Google Music Core Test Suite',
      'browserstack.user': BS_USER,
      'browserstack.key': BS_KEY
    }, function () {
      that.browser.maximize();
      that.browser.setAsyncScriptTimeout(30000, done);
    });
  });
  before(function navigateToMusicBeforeLogin (done) {
    this.browser.get(url, done);
  });
  before(function handleLoginViaCookies (done) {
    var browser = this.browser;
    browser.elementByCssSelector('[data-action=signin]', function (err, el) {
      if (err) { done(err); }

      el.click(function (err) {
        if (err) { done(err); }

        browser.elementById('Email', function (err, el) {
          if (err) { done(err); }

          var emailSetCondition = 'document.getElementById("Email").value == "' + username + '"';
          browser.waitForConditionInBrowser('document.getElementById("Email") != null', function () {
            browser.execute('document.getElementById("Email").value = "' + username + '"');
            browser.waitForConditionInBrowser(emailSetCondition, function (err) {
              browser.elementById('next', function (err, el) {
                if (err) { done(err); }

                el.click(function (err) {
                  if (err) { done(err); }

                  browser.waitForConditionInBrowser('document.getElementById("Passwd") != null', function () {
                    var passwordSetCondition = 'document.getElementById("Passwd").value == \'' + password + '\'';

                    browser.execute('document.getElementById("Passwd").value = "' + password + '"');
                    browser.waitForConditionInBrowser(passwordSetCondition, function () {
                      browser.elementById('signIn', function (err, el) {
                        el.click(function (err) {
                          if (err) { done(err); }

                          var doneLoginCondition = 'window.location.href.indexOf("https://play.google.com/music") === 0';
                          browser.waitForConditionInBrowser(doneLoginCondition, function () { done(); });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
  before(function navigateToMusicAfterLogin (done) {
    this.browser.get(url, done);
  });
  before(function loadGoogleMusicConstructor (done) {
    this.browser.execute(script, done);
  });
  exports.execute(function startGoogleMusicApi () {
    window.googleMusic = new window.GoogleMusic(window);
  });

  // If we want to want to kill the session, clean it up
  // DEV: This is useful for inspecting state of a session
  var killBrowser = options.killBrowser === undefined ? true : options.killBrowser;
  if (killBrowser) {
    after(function killBrowserFn (done) {
      this.browser.quit(done);
    });
  }
  after(function cleanup () {
    delete this.browser;
  });
};

// Helper to assert we have a browser started always
exports.assertBrowser = function () {
  before(function assertBrowser () {
    assert(this.browser, '`this.browser` is not defined. Please make sure `browserUtils.openMusic()` has been run.');
  });
};

// TODO: Consider creating `mocha-wd`
exports.execute = function () {
  // Save arguments in an array
  var args = [].slice.call(arguments);

  // If the first argument is a function, coerce it to a string
  var evalFn = args[0];
  if (typeof evalFn === 'function') {
    args[0] = functionToString(evalFn).body;
  }

  // Run the mocha bindings
  exports.assertBrowser();
  before(function runExecute (done) {
    // Add on a callback to the arguments
    var that = this;
    args.push(function handleResult (err, result) {
      // Save the result and callback
      that.result = result;
      done(err);
    });

    // Execute our request
    this.browser.execute.apply(this.browser, args);
  });
  after(function cleanup () {
    delete this.result;
  });
};
