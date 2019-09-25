define(['brease/events/EventDispatcher', 'brease/events/ServerEvent', 'brease/controller/objects/VisuStatus'], function (EventDispatcher, ServerEvent, VisuStatus) {

    'use strict';

    var RuntimeServiceStub = function RuntimeServiceStub(testData, subscriptions, eventSubscriptions) {
        this.testData = {};
        for (var key in testData) {
            this.testData[key.toLowerCase()] = testData[key];
        }
        this.subscriptions = (subscriptions) || {};
        this.eventSubscriptions = (eventSubscriptions) || {};
    };

    RuntimeServiceStub.prototype = new EventDispatcher();
    RuntimeServiceStub.prototype.constructor = RuntimeServiceStub;

    var p = RuntimeServiceStub.prototype;

    p.loadVisuData = function (visuId, callback, callbackInfo) {
        visuId = visuId.toLowerCase();
        if (typeof callback === 'function') {
            if (this.testData && this.testData[visuId]) {
                callback({ success: true, visuData: this.testData[visuId] }, callbackInfo);
            } else {
                if (visuId === 'malformedvisu') {
                    callback({ success: false, status: 'parsererror' }, callbackInfo);
                } else {
                    callback({ success: false, status: VisuStatus.NOT_FOUND }, callbackInfo);
                }
            }
        }
    };

    p.activateVisu = function (visuId, callback, callbackInfo) {
        console.warn('activateVisu:' + visuId);

        window.setTimeout(activateResponse.bind(this, callback, callbackInfo), 50);
        window.setTimeout(activateEvent.bind(this, {
            visuId: visuId.toLowerCase()
        }, ServerEvent.VISU_ACTIVATED), 150);
    };

    p.activateContent = function (contentId, visuId, callback, callbackInfo) {
        console.log('activateContent:' + contentId + ',visuId=' + visuId);

        window.setTimeout(activateResponse.bind(this, callback, callbackInfo), 50);
        window.setTimeout(activateEvent.bind(this, {
            visuId: visuId.toLowerCase(),
            contentId: contentId
        }, ServerEvent.CONTENT_ACTIVATED), 100);
    };

    p.deactivateContent = function (contentId, visuId, callback, callbackInfo) {
        console.log('deactivateContent:' + contentId + ',visuId=' + visuId);
        window.setTimeout(activateResponse.bind(this, callback, callbackInfo), 50);
        window.setTimeout(activateEvent.bind(this, {
            visuId: visuId.toLowerCase(),
            contentId: contentId
        }, ServerEvent.CONTENT_DEACTIVATED), 100);
    };

    p.deactivateVisu = function (visuId) {
        console.log('deactivateVisu:' + visuId);
    };

    p.getSessionEventSubscription = function () {
        return { success: true, eventSubscriptions: [] };
    };

    p.getEventSubscription = function (contentId, visuId, callback, callbackInfo) {
        callback({ 'status': { 'code': 0, 'message': '' }, 'success': true, 'eventSubscriptions': this.eventSubscriptions[contentId] }, callbackInfo);
    };

    p.getSubscription = function (contentId, visuId, callback, callbackInfo) {
        callback({ 'status': { 'code': 0, 'message': '' }, 'success': true, 'subscriptions': this.subscriptions[contentId] }, callbackInfo);
    };

    p.setClientInformation = function (data) {
        console.log('%csetClientInformation:' + data, 'color:#cc00cc;');
    };

    p.sendUpdate = function (data) {
        console.info('%csendUpdate:' + JSON.stringify(data), 'color:darkgreen');
    };

    p.sendEvent = function (data) {
        console.log('sendEvent:', JSON.stringify(data));
    };

    p.opcuaReadNodeHistory = function () {
        console.log('opcuaReadNodeHistory:', JSON.stringify(arguments));
    };

    p.opcuaReadHistoryCount = function () {
        console.log('opcuaReadHistoryCount:', JSON.stringify(arguments));
    };

    p.opcuaReadHistoryStart = function () {
        console.log('opcuaReadHistoryStart:', JSON.stringify(arguments));
    };

    p.opcuaReadHistoryEnd = function () {
        console.log('opcuaReadHistoryEnd:', JSON.stringify(arguments));
    };

    p.opcuaBrowse = function () {
        console.log('opcuaBrowse:', JSON.stringify(arguments));
    };

    p.opcuaCallMethod = function () {
        console.log('opcuaCallMethod:', JSON.stringify(arguments));
    };

    p.opcuaRead = function () {
        console.log('opcuaRead:', JSON.stringify(arguments));
    };

    p.triggerServerAction = function (action, target, aId, args) {
        var type = 'action';
        this.dispatchEvent({
            'event': type,
            'detail': {
                'action': action,
                'target': target,
                'actionArgs': args || {},
                'actionId': aId
            }
        }, type);
    };

    p.initLangModule = function (langModule) {
        var instance = this;
        this.langModule = langModule;

        this.loadLanguages = function (callback) {
            callback({
                'current_language': instance.langModule.current_language,
                'languages': instance.langModule.languages,
                success: instance.langModule.loadSuccess
            });
        };
        this.loadTexts = function (langKey, callback, callbackInfo) {
            callback(instance.langModule.text[langKey], callbackInfo);
        };
        this.loadSystemTexts = function (langKey, callback, callbackInfo) {
            callback(instance.langModule.text[langKey], callbackInfo);
        };
        this.getUnitSymbols = function (langKey, arKeys, callback, callbackInfo) {
            var result = {};
            for (var i = 0; i < arKeys.length; i += 1) {
                if (instance.langModule.unitSymbols[langKey][arKeys[i]] !== undefined) {
                    result[arKeys[i]] = instance.langModule.unitSymbols[langKey][arKeys[i]];
                }
            }
            window.setTimeout(function () {
                callback({ unitSymbols: result }, callbackInfo);
            }, 10);
        };
        this.switchLanguage = function (langKey, callback) {
            if (instance.langModule.switchSuccess) {
                instance.langModule.current_language = langKey;
            }
            callback({ success: instance.langModule.switchSuccess });
        };
    };

    function activateResponse(callback, callbackInfo) {
        callback({ status: { code: 0 }, success: true }, callbackInfo);
    }

    function activateEvent(detail, type) {
        this.dispatchEvent({
            event: type,
            detail: detail
        }, type);
    }

    return RuntimeServiceStub;

});
