// Load in dependencies
var expect = require('chai').expect;
var browserUtils = require('./utils/browser');
var browserMusicUtils = require('./utils/browser-music');

// Start our tests
describe('A track in Google Music', function () {
  browserUtils.openMusic({
    url: 'https://play.google.com/music/listen#/album//this-is-an-album-artist/this-is-an-album'
  });
  browserUtils.execute(function setupHooks () {
    window.ratingCount = 0;
    window.googleMusic.on('change:rating', function ratingChanged (rating) {
      window.ratingCount += 1;
    });
  });
  browserUtils.execute(function playViaApi () {
    window.googleMusic.playback.playPause();
  });
  browserMusicUtils.waitForPlaybackStart();

  describe('when \'thumbs down\'-ed', function () {
    browserUtils.execute(function resetRating () {
      window.googleMusic.rating.toggleThumbsUp();
    });
    browserUtils.execute(function thumbsDownTrack () {
      // DEV: Warning this will skip to next track
      window.googleMusic.rating.toggleThumbsDown();
    });
    browserUtils.execute(function thumbsDownTrack () {
      return window.googleMusic.rating.getRating();
    });

    it('has a low rating', function () {
      expect(this.result).to.equal('1');
    });

    describe('a hook result', function () {
      browserUtils.execute(function getHookResult () {
        return window.ratingCount;
      });

      it('was triggered', function () {
        expect(this.result).to.be.at.least(2);
      });
    });
  });

  describe('when \'thumbs up\'-ed', function () {
    browserUtils.execute(function resetRating () {
      // DEV: Warning this will skip to next track
      window.googleMusic.rating.toggleThumbsDown();
    });
    browserUtils.execute(function thumbsUpTrack () {
      window.googleMusic.rating.toggleThumbsUp();
    });
    browserUtils.execute(function thumbsUpTrack () {
      return window.googleMusic.rating.getRating();
    });

    it('has a high rating', function () {
      expect(this.result).to.equal('5');
    });

    describe('when switched to neutral', function () {
      browserUtils.execute(function thumbsUpTrack () {
        window.googleMusic.rating.toggleThumbsUp();
      });
      browserUtils.execute(function thumbsUpTrack () {
        return window.googleMusic.rating.getRating();
      });

      it('has no rating', function () {
        expect(this.result).to.equal('0');
      });

      describe('when a rating is set via `setRating`', function () {
        browserUtils.execute(function setRating () {
          window.googleMusic.rating.setRating('5');
        });
        browserUtils.execute(function setRating () {
          return window.googleMusic.rating.getRating();
        });
        it('becomes set', function () {
          expect(this.result).to.equal('5');
        });

        describe('and when set again', function () {
          browserUtils.execute(function setRating () {
            window.googleMusic.rating.setRating('5');
          });
          browserUtils.execute(function setRating () {
            return window.googleMusic.rating.getRating();
          });

          it('remains set', function () {
            expect(this.result).to.equal('5');
          });
        });
      });
    });
  });
});
