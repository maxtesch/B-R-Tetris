define(['brease/services/Preloader'], function (preloader) {

    'use strict';

    /**
    * @class brease.services.Configuration
    * @extends core.javascript.Object
    * Configuration service; available via brease.configuration  
    * 
    * @singleton
    */
    var Configuration = {

            init: function (runtimeService) {
                _runtimeService = runtimeService;
                return this;
            },

            loadConfigurations: function (visuConfig) {
                if (visuConfig) {
                    _mergeVisuConfig(visuConfig);
                }
                var deferred = $.Deferred();
                var configuration = preloader.get('configuration');
                if (configuration) {
                    _mergeMvConfig(configuration);
                    deferred.resolve();
                } else {
                    _runtimeService.loadConfiguration(_loadConfigurationResponseHandler, { deferred: deferred });
                }
                return deferred.promise();
            }
        },
        _runtimeService;

    function _loadConfigurationResponseHandler(response, callbackInfo) {
        if (response.success === true) {

            if (response.configuration) {
                _mergeMvConfig(response.configuration);
            }
            callbackInfo.deferred.resolve();
        } else {
            callbackInfo.deferred.reject();
        }
    }

    function _mergeVisuConfig(configurations) {

        // config from .visu file
        brease.config.visu.zoom = _getZoom(configurations.zoom);
        brease.config.visu.browserZoom = _getBrowserZoom(configurations.browserZoom);
        brease.config.visu.activityCount = _getActivityCount(configurations.activityCount);
        brease.config.visu.bootProgressBar = _getBootProgressBar(configurations.bootProgressBar);
        brease.config.watchdog = _getWatchdog(configurations.watchdog);
        brease.config.gestures = _getGestures(configurations.gestures);
        brease.config.virtualKeyboards = _getVirtualKeyboards(configurations.virtualKeyboards);
    }

    function _mergeMvConfig(configurations) {

        // config from .mappviewcfg file
        brease.config.ContentCaching = {
            preserveOldValues: (configurations.ContentCaching && configurations.ContentCaching.preserveOldValues === 'TRUE'),
            cachingSlots: (configurations.ContentCaching && configurations.ContentCaching.cachingSlots !== undefined) ? Math.min(parseInt(configurations.ContentCaching.cachingSlots, 10), brease.settings.cachingSlotsMax) : brease.settings.cachingSlotsDefault
        };
    }

    function _getZoom(zoom) {
        return (zoom === 'true' || zoom === true);
    }

    function _getBrowserZoom(browserZoom) {
        return (browserZoom === 'true' || browserZoom === true);
    }

    function _getActivityCount(activityCount) {
        return (activityCount === 'true' || activityCount === true);
    }

    function _getBootProgressBar(bootProgressBar) {
        return !!((bootProgressBar === 'true' || bootProgressBar === true));
    }

    function _getWatchdog(watchdog) {
        return (brease.config.watchdog === undefined && watchdog !== undefined) ? parseInt(watchdog, 10) : brease.config.watchdog;
    }

    function _getGestures(gestures) {
        return gestures || undefined;
    }

    function _getVirtualKeyboards(virtualKeyboards) {
        return virtualKeyboards || undefined;
    }

    return Configuration;

});
