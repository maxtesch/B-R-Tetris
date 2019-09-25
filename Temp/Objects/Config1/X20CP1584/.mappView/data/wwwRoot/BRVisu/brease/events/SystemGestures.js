define(['brease/core/Utils', 'brease/config', 'hammer'], function (Utils, config, Hammer) {

    'use strict';

    var defaultTouchPoints = 2,
        maxTouchPoints = 5,
        minTouchPoints = 1,
        GESTURES = {
            SystemGesture1: {
                Type: 'SystemGesture1',
                touchPoints: 2
            },
            SystemGesture2: {
                Type: 'SystemGesture2',
                touchPoints: 2
            },
            SystemGesture3: {
                Type: 'SystemGesture3',
                touchPoints: 2
            }
        },
        SystemGestures = {

            GESTURES: GESTURES,
            maxTouchPoints: maxTouchPoints,
            minTouchPoints: minTouchPoints,
            activeGestures: [],
            lockTimeout: 300,

            init: function (GestureManager) {
                // init touchPoints from config
                for (var i = 1; i <= 3; i += 1) {
                    if (brease.config.gestures && brease.config.gestures['SystemGesture' + i]) {
                        GESTURES['SystemGesture' + i].touchPoints = Math.min(maxTouchPoints, Math.max(minTouchPoints, brease.config.gestures['SystemGesture' + i].touchPoints));
                    } else {
                        GESTURES['SystemGesture' + i].touchPoints = defaultTouchPoints;
                    }
                }

                var options = {};
                // setting 'pinch-zoom' enables zoom gesture on iOS
                if (config.visu.browserZoom === true && config.detection.ios === true) {
                    options.touchAction = 'pinch-zoom';
                }
                var ManagerClass = (GestureManager) || Hammer.Manager;
                this.gestureManager = new ManagerClass(document.body, options);
                return this.gestureManager;
            },

            on: function (type, fn) {
                if (GESTURES[type] === undefined) {
                    console.warn('unknown gesture type:' + type);
                    return;
                }
                if (_gestures[type] === undefined) {
                    _initGesture.call(SystemGestures, type);
                }
                if (!_listeners[type]) {
                    _listeners[type] = [];
                }
                if (_listeners[type].indexOf(fn) === -1) {
                    _listeners[type].push(fn);
                }
            },

            off: function (type, fn) {
                if (_listeners[type]) {
                    var index = _listeners[type].indexOf(fn);
                    if (index !== -1) {
                        _listeners[type].splice(index, 1);
                    }
                }
            },

            hasEventListener: function (type) {
                return Array.isArray(_listeners[type]) && _listeners[type].length > 0;
            }
        },
        _gestures = {},
        _listeners = {},
        lock = false,
        lockTimer,
        positionProps = ['clientX', 'clientY', 'pageX', 'pageY', 'screenX', 'screenY'];

    function _initGesture(type) {

        _gestures[type] = {
            manager: this.gestureManager,
            recognizer: new Hammer.Swipe({ event: type, direction: Hammer.DIRECTION_ALL, pointers: GESTURES[type].touchPoints, threshold: brease.settings.swipe.moveThreshold, velocity: brease.settings.swipe.velocity })
        };

        _gestures[type].manager.add([_gestures[type].recognizer]);

        _gestures[type].manager.on(type, _gestureHandler);

    }

    function _gestureHandler(e) {

        var dir = '';
        switch (e.direction) {
            case 2:
                dir = 'fromRight';
                break;
            case 4:
                dir = 'fromLeft';
                break;
            case 8:
                dir = 'fromBottom';
                break;
            case 16:
                dir = 'fromTop';
                break;
        }

        var fingerDistance = 0,
            x = [],
            y = [];
        if (Array.isArray(e.pointers)) {
            for (var i = 0; i < e.pointers.length; i += 1) {
                x.push(e.pointers[i].pageX);
                y.push(e.pointers[i].pageY);
            }
        }
        if (x.length > 1) {
            var diffX = (x.length > 1) ? Math.abs(x[0] - x[1]) : 0;
            var diffY = (y.length > 1) ? Math.abs(y[0] - y[1]) : 0;
            if (e.direction === 2 || e.direction === 4) {
                fingerDistance = parseInt(diffY, 10);
            } else {
                fingerDistance = parseInt(diffX, 10);
            }
        }

        if (dir !== '' && lock === false && (fingerDistance === 0 || fingerDistance <= brease.settings.swipe.maxFingerDistance)) {
            lock = true;
            var newEvent = { type: e.type, target: e.target, detail: { direction: dir } };
            if (Array.isArray(e.changedPointers)) {
                Utils.transferProperties(e.changedPointers[0], newEvent, positionProps);
            }
            _dispatch(newEvent);
            _startUnlock();
        }
    }

    function _startUnlock() {
        if (lockTimer) { clearTimeout(lockTimer); }
        if (SystemGestures.lockTimeout > 0) {
            lockTimer = window.setTimeout(_unlock, SystemGestures.lockTimeout);
        } else {
            _unlock();
        }
    }

    function _unlock() {
        lock = false;
    }

    function _dispatch(e) {
        for (var i = 0; i < _listeners[e.type].length; i += 1) {
            _listeners[e.type][i].call(null, e);
        }
    }

    return SystemGestures;
});
