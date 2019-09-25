/*global brease*/
define(['brease/core/Class'], function (SuperClass) {

    'use strict';

    /**
    * @class widgets.brease.common.mpLinkHandler
    * #Description
    * mpLinkHandler
    * @extends brease.core.Class
    *
    * @iatMeta studio:visible
    * false
    */

    var ModuleClass = SuperClass.extend(function MpLinkHandler(widget) {
        SuperClass.call(this);
        this.widget = widget;
        this.callbackQueue = []; // every request that's awaiting data is added into queue
        this.activeSubscriptions = {}; // to be unsubscribed on dispose
        this.init();
    }, null),

	p = ModuleClass.prototype;

    p.init = function () {
        this.reset();
    };

    p.reset = function () {
        this.componentActive = false; // if Backend Component is not ready when binding is ready we have to wait for it
        this.queueUntilComponentIsActive = []; //queue for requests until backend is ready
    };

    p.dispose = function () {
        if (this.callbackQueue.length > 0) {
            console.iatWarn("Open requests...");
        }
    };

    p.incomingMessage = function (message) {
        var methodID,
            index,
            callbackItem;

        if (message === null || message === '' || (this.componentActive && message.parameter === undefined)) {
            return;
        }

        if (!this.componentActive) {
            this._updateComponentActiveState(message);
            return;
        }

        if (message.parameter.widgetId !== this.widget.elem.id) {
            return;
        }

        methodID = message.methodID;
        if (message.error) {
            this.widget._onErrorHandler(message.error.code);
        }
        if (message.response) {
            index = this._getIndexInQueue(methodID);

            if (index > -1) {
                callbackItem = this.callbackQueue[index];
                if (!callbackItem.subscription) { //remove after response
                    this.callbackQueue.splice(index, 1);
                }
                callbackItem.callback.call(this.widget, message.response, message);
            } else {
                console.iatWarn("Response without callback to handle it", message);
            }
        } else {
            console.iatWarn("Unexpected message recieved", this.widget.elem.id, message);
        }
    };

    p.sendMessage = function (message) {
        if (!this.componentActive) {
            this._handleInactiveComponent(message);
            return;
        }
        if (message === undefined) {
            this.widget.sendValueChange({ mpLink: {} });
            return;
        }
        if (message.parameter === undefined || message.parameter === null) {
            message.parameter = { widgetId: this.widget.elem.id };
        } else {
            message.parameter.widgetId = this.widget.elem.id;
        }
        this.widget.sendValueChange({ mpLink: message });
    };

    p.sendRequestAndProvideCallback = function (request, callback, requestData, requestParameter) {
        var message = {
            request: 'Get',
            methodID: request
        };
        if (requestData !== undefined) {
            message.data = requestData;
        }
        if (requestParameter !== undefined) {
            message.parameter = requestParameter;
        }
        this.callbackQueue.push({ method: request, callback: callback });
        this.sendMessage(message);
    };

    p.sendDataAndProvideCallback = function (request, callback, requestData, requestParameter) {
        var message = {
            request: 'Set',
            methodID: request
        };
        if (requestData !== undefined) {
            message.data = requestData;
        }
        if (requestParameter !== undefined) {
            message.parameter = requestParameter;
        }
        this.callbackQueue.push({ method: request, callback: callback });
        this.sendMessage(message);
    };

    p.subscribeWithCallback = function (request, callback, requestData, requestParameter) {
        var message = {
            request: 'Subscribe',
            methodID: request
        };
        if (requestData !== undefined) {
            message.data = requestData;
        }
        if (requestParameter !== undefined) {
            message.parameter = requestParameter;
        }
        this.callbackQueue.push({ method: request, callback: callback, subscription: true });
        this.sendMessage(message);
    };

    p.unSubscribe = function (request) {
        var message = {
            request: 'Unsubscribe',
            methodID: request
        },
        index = this._getIndexInQueue(request);

        if (index > -1) {
            this.callbackQueue.splice(index, 1);
        }
        this.sendMessage(message);
    };

    // comparison helper for _.findIndex()
    p._getIndexInQueue = function (methodId) {
        return _.findIndex(this.callbackQueue, function (o) { return o.method === methodId; });
    };

    p._handleInactiveComponent = function (message) {
        //queue message to be sent later
        this.queueUntilComponentIsActive.push(message);
    };

    p._handleComponentSwitchedToActive = function () {
        var self = this;
        $.each(this.queueUntilComponentIsActive, function () {
            self.sendMessage(this);
        });
        this.queueUntilComponentIsActive = [];
    };

    p._handleComponentNotYetActive = function (message) {
        this.widget._onErrorHandler(message.error.code);
    };

    //called once if backend component is active or twice if backend component is not active when binding gets active but get's active later. 
    p._updateComponentActiveState = function (message) {
        if (message.methodID === "GetActiveState") {
            if (message.response === "OK") {
                this.componentActive = true;
                this._handleComponentSwitchedToActive();
            } else {
                this._handleComponentNotYetActive(message);
            }
        }
    };

    return ModuleClass;
});
