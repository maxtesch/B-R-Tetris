define(['libs/polyfill'], function () {

    'use strict';

    /**
    * @class brease.services.Preloader
    * @extends Object
    * @singleton
    */

    var preloader = {
            get: function (key) {
                var value = data.get(key);
                if (value !== undefined) {
                    data.delete(key);
                }
                return value;
            }
        },
        data = new Map();

    (function init() {
        if (window.brease && window.brease.preloader) {
            for (var key in window.brease.preloader) {
                data.set(key, window.brease.preloader[key]);
            }
        }
    })();

    return preloader;

});
