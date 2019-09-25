define(['brease/model/BindingModel', 'brease/controller/BindingLoader', 'brease/config', 'brease/events/BreaseEvent', 'brease/events/ServerEvent', 'brease/enum/Enum', 'brease/core/Utils', 'brease/datatype/Notification', 'brease/objects/Subscription', 'brease/controller/ContentManager', 'brease/core/Types', 'brease/controller/objects/ContentStatus'], function (bindingModel, bindingLoader, config, BreaseEvent, ServerEvent, Enum, Utils, NotificationType, Subscription, contentManager, Types, ContentStatus) {

    'use strict';

    var bindingController = {
            init: function (runtimeService) {

                _runtimeService = runtimeService;
                runtimeService.addEventListener(ServerEvent.PROPERTY_VALUE_CHANGED, _serverChangeHandler);
                contentManager.init(runtimeService);
                bindingLoader.init(runtimeService, bindingModel, contentManager);
            },

            startListen: function () {
                bindingLoader.startListen();
            },

            /**
            * @method activateVirtualContent
            * activate virtual content with given contentId
            * @param {String} contentId
            * @param {String} visuId
            */
            activateVirtualContent: function (contentId, visuId) {
                contentManager.addVirtualContent(contentId, visuId);
                return bindingController.activateContent(contentId);
            },

            /**
            * @method activateContent
            * activate content with given contentId
            * @param {String} contentId
            */
            activateContent: function (contentId) {
                //console.log('%c' + 'activateContent:' + contentId, 'color:#cc00cc');
                var deferred = $.Deferred(),
                    content = contentManager.setLatestRequest(contentId, 'activate');

                if (content) {
                    contentManager.setActiveState(contentId, ContentStatus.activatePending);
                    window.performanceMonitor.profile('activateContent - ' + contentId + '', 0);
                    _runtimeService.activateContent(content.serverId, content.visuId, _activateContentResponseHandler, { requestId: content.latestRequest, contentId: contentId, deferred: deferred });
                } else {
                    deferred.resolve(contentId);
                }
                return deferred.promise();
            },

            isBindingLoaded: function (contentId) {
                return contentManager.isBindingLoaded(contentId);
            },

            isContentActive: function (contentId) {
                return contentManager.isContentActive(contentId);
            },

            getContentState: function (contentId) {
                return contentManager.getActiveState(contentId);
            },

            sendInitialValues: function (contentId, callback) {
                var arChanges = [],
                    readyDef = $.Deferred(),
                    content = contentManager.setLatestRequest(contentId, 'attach');

                if (content) {
                    if (bindingModel.contentHasSubscriptions(contentId)) {

                        bindingModel.getSubscriptionsForContent(contentId).forEach(function (subscriptions, widgetId) {
                            for (var attr in subscriptions) {
                                var subscription = subscriptions[attr];
                                if (subscription !== undefined) {
                                    arChanges.push(_valuesForSubscription(subscription, widgetId, attr));
                                }
                            }
                        });
                        contentManager.setActivateDeferred(contentId, readyDef);
                        _processAttributeChanges(arChanges);
                    } else {
                        readyDef.resolve(contentId);
                    }

                    readyDef.done(function (contentId) {
                        if (typeof callback === 'function') {
                            callback(contentId);
                        }
                    });
                } else {
                    if (typeof callback === 'function') {
                        callback(contentId);
                    }
                }
            },

            deactivateContent: function (contentId, callback) {
                //console.log('%c' + 'deactivateContent:' + contentId, 'color:#00cccc');
                var readyDef = $.Deferred(),
                    content = contentManager.setLatestRequest(contentId, 'detach');

                if (content) {
                    contentManager.setActiveState(contentId, ContentStatus.deactivated);
                    window.performanceMonitor.profile('deactivateContent - ' + contentId + '', 0);
                    contentManager.setDeactivateDeferred(contentId, readyDef);
                    _runtimeService.deactivateContent(content.serverId, content.visuId, _deactivateContentResponseHandler, { requestId: content.latestRequest, contentId: contentId });
                    bindingModel.removeDynamicBindings(contentId);
                    bindingModel.deactivateSubscriptions(contentId);
                    readyDef.done(function (contentId) {
                        if (typeof callback === 'function') {
                            callback(contentId);
                        }
                    });

                } else {
                    if (typeof callback === 'function') {
                        callback(contentId);
                    }
                }
            },

            getSubscriptionsForElement: function (elemId, attribute) {
                return bindingModel.getSubscriptionsForElement(elemId, attribute);
            },

            getEventsForElement: function (elemId, event) {
                return bindingModel.getEventsForElement(elemId, event);
            },

            isActiveSessionEvent: function (eventName) {
                var sessionEvents = bindingModel.getSessionEvents(),
                    isActive = false;

                for (var scopeId in sessionEvents) {
                    if (scopeId === '_client' || contentManager.isContentActive(scopeId)) {
                        if (sessionEvents[scopeId].indexOf(eventName) !== -1) {
                            isActive = true;
                            break;
                        }
                    }
                }
                return isActive;
            },

            allActive: function (contents) {
                return contentManager.allActive(contents);
            },

            createBindings: function (contentId, visuId, bindings) {
                var def = $.Deferred();
                _runtimeService.createBindings(contentId, visuId, bindings, _createBindingsResponseHandler, { contentId: contentId, bindings: bindings, deferred: def });
                return def.promise();
            },

            deleteBindings: function (contentId, visuId, targets) {
                var def = $.Deferred();
                _runtimeService.deleteBindings(contentId, visuId, targets, _deleteBindingsResponseHandler, { contentId: contentId, targets: targets, deferred: def });
                return def.promise();
            },
            attributeChangeForwarder: function (e) {
                _attributeChangeListener(e);
            },
            nodeAttributeChangeForwarder: function (e) {
                _nodeAttributeChangeListener(e);
            }

        },
        _runtimeService;

    function _deleteBindingsResponseHandler(response, callbackInfo) {
        //console.log('_deleteBindings_response:', response, callbackInfo);
        if (response.status.code === 0) {
            for (var i = 0; i < callbackInfo.targets.length; i += 1) {
                if (response.bindingsStatus[i].code === 0) {
                    bindingModel.removeDynamicBinding(callbackInfo.targets[i]);
                }
            }
            callbackInfo.deferred.resolve(response.bindingsStatus);
        } else {
            callbackInfo.deferred.reject(response.status);
        }
    }

    function _createBindingsResponseHandler(response, callbackInfo) {
        //console.log('_createBindings_response:', response, callbackInfo);
        var binding,
            subscription,
            arChanges = [];

        if (response.status.code === 0) {
            for (var i = 0; i < callbackInfo.bindings.length; i += 1) {
                binding = callbackInfo.bindings[i];
                if (response.bindingsStatus[i].code === 0) {
                    bindingModel.addDynamicBinding(binding, callbackInfo.contentId);
                    subscription = bindingModel.addDynamicSubscription(binding.target.refId, binding.target.attribute, callbackInfo.contentId);
                    arChanges.push(_valuesForSubscription(subscription, binding.target.refId, binding.target.attribute));
                    if (binding.source.type === 'brease') {
                        subscription = bindingModel.addDynamicSubscription(binding.source.refId, binding.source.attribute, callbackInfo.contentId);
                        arChanges.push(_valuesForSubscription(subscription, binding.source.refId, binding.source.attribute));
                    }
                }
            }
            callbackInfo.deferred.resolve(response.bindingsStatus);
            if (arChanges.length > 0) {
                _processAttributeChanges(arChanges);
            }
        } else {
            callbackInfo.deferred.reject(response.status);
        }
    }

    function _activateContentResponseHandler(response, callbackInfo) {

        if (callbackInfo.requestId === contentManager.getLatestRequest(callbackInfo.contentId) && contentManager.getActiveState(callbackInfo.contentId) > ContentStatus.initialized) {

            if (response.success === true) {
                bindingLoader.loadSubscriptions(callbackInfo.contentId, callbackInfo.deferred);
                brease.loggerService.log(Enum.EventLoggerId.CLIENT_BINDING_ATTACH_OK, Enum.EventLoggerCustomer.BUR, Enum.EventLoggerVerboseLevel.LOW, Enum.EventLoggerSeverity.SUCCESS, [callbackInfo.contentId]);
            } else {
                console.iatWarn('activateContent for content "' + callbackInfo.contentId + '" failed, possibly no binding defined!');
                callbackInfo.deferred.resolve(callbackInfo.contentId);
                brease.loggerService.log(Enum.EventLoggerId.CLIENT_BINDING_ATTACH_FAIL, Enum.EventLoggerCustomer.BUR, Enum.EventLoggerVerboseLevel.LOW, Enum.EventLoggerSeverity.ERROR, [callbackInfo.contentId]);
            }
        } else {
            console.iatWarn('activateContent for content "' + callbackInfo.contentId + '" aborted!');
        }
    }

    function _deactivateContentResponseHandler(response, callbackInfo) {

        window.performanceMonitor.profile('deactivateContent - ' + callbackInfo.contentId + '', 1);
        if (response.success === true) {
            brease.loggerService.log(Enum.EventLoggerId.CLIENT_BINDING_DETACH_OK, Enum.EventLoggerCustomer.BUR, Enum.EventLoggerVerboseLevel.LOW, Enum.EventLoggerSeverity.SUCCESS, [callbackInfo.contentId]);
        } else {
            brease.loggerService.log(Enum.EventLoggerId.CLIENT_BINDING_DETACH_FAIL, Enum.EventLoggerCustomer.BUR, Enum.EventLoggerVerboseLevel.LOW, Enum.EventLoggerSeverity.ERROR, [callbackInfo.contentId]);
        }
    }

    // related getter is either defined (getter) or constructed from the property name
    function _getterOfProperty(attribute, widgetId) {
        var widget = brease.uiController.callWidget(widgetId, 'widget'),
            WidgetClass = widget.constructor,
            metaProperty = (WidgetClass.meta && WidgetClass.meta.properties) ? WidgetClass.meta.properties[attribute] : undefined;

        if (metaProperty && metaProperty.getter) {
            return metaProperty.getter;
        } else {
            return Utils.getter(attribute);
        }
    }

    function _valuesForSubscription(subscription, widgetId, attr) {

        var widgetState = brease.uiController.getWidgetState(widgetId);

        if (widgetState <= Enum.WidgetState.NON_EXISTENT) {
            return _nullWithMessage(subscription, 'subscription: widget does not exist (widgetId:"' + widgetId + '", attribute:"' + attr + '")');
        }

        // support for editable binding, e.g. editable::node
        var attribute = (attr.indexOf('::') !== -1) ? attr.split('::')[0] : attr,
            data = brease.uiController.callWidget(widgetId, _getterOfProperty(attribute, widgetId), attribute);

        if (data === undefined) {
            return _nullWithMessage(subscription, 'subscription: undefined value (widgetId:"' + widgetId + '", attribute:"' + attr + '")');
        }

        if (data === null) {
            return _nullWithMessage(subscription, 'subscription: getter returns null (widgetId:"' + widgetId + '", attribute:"' + attr + '")');
        }

        if (NotificationType.prototype.isPrototypeOf(data)) {
            return {
                subscription: subscription,
                data: [],
                type: 'notification'
            };
        } else {
            return {
                subscription: subscription,
                data: data
            };
        }
    }

    function _nullWithMessage(subscription, message) {
        console.iatWarn(message);
        return {
            subscription: subscription,
            data: null
        };
    }

    function _serverChangeHandler(e) {

        var arItems = e.detail,
            itemLength = arItems.length;

        if (itemLength > 0) {

            for (var i = 0; i < itemLength; i += 1) {

                var widgetId = arItems[i].refId,
                    arData = arItems[i].data;

                for (var j = 0, l = arData.length; j < l; j += 1) {
                    try {
                        var subscription = bindingModel.getSubscriptionsForElement(widgetId, arData[j].attribute);
                        if (subscription) {
                            _setWidgetProperty(widgetId, arData[j].attribute, arData[j].value, subscription);
                        } else {
                            console.iatWarn('no subscription for attribute "' + arData[j].attribute + ', widgetId=' + widgetId);
                        }
                    } catch (er) {
                        console.warn('error processing property', er);
                    }

                }
            }
        }
    }

    // related setter is either defined (setter) or constructed from the property name
    function _setterOfProperty(attribute, widget) {
        var WidgetClass = widget.constructor,
            metaProperty = (WidgetClass.meta && WidgetClass.meta.properties) ? WidgetClass.meta.properties[attribute] : undefined;

        if (metaProperty && metaProperty.setter) {
            return metaProperty.setter;
        } else {
            return Utils.setter(attribute);
        }
    }

    function _setWidgetProperty(widgetId, attribute, value, subscription) {
        if (attribute === undefined) {
            console.iatWarn('binding for widget[' + widgetId + ']: no binding attribute given');
        } else {
            var widget = brease.callWidget(widgetId, 'widget');

            if (widget !== null && (widget.state === Enum.WidgetState.INITIALIZED || widget.state === Enum.WidgetState.READY)) {
                var metaData = {
                    origin: 'server'
                };
                // support for editable binding, e.g. editable::node
                if (attribute.indexOf('::') !== -1) {
                    var attr = attribute.split('::');
                    metaData.attribute = attr[0];
                    metaData.refAttribute = attr[1];
                } else {
                    metaData.attribute = attribute;
                }
                var methodName = _setterOfProperty(metaData.attribute, widget);
                if (widget[methodName] !== undefined) {

                    metaData.value = _parseValue(value, widget.constructor, methodName, metaData.attribute, widgetId);

                    subscription.active = true;
                    widget[methodName](metaData.value, metaData);

                    widget.dispatchEvent(new CustomEvent(BreaseEvent.PROPERTY_CHANGED, {
                        detail: {
                            attribute: metaData.attribute,
                            value: metaData.value
                        }
                    }));

                } else {
                    console.iatWarn('binding for widget[' + widgetId + ']: unknown binding method "' + methodName + '"');
                }
            }
        }
    }

    function _parseValue(value, WidgetClass, methodName, attrName, widgetId) {

        if (!Utils.isString(value)) {
            return value;
        }

        var actionName = methodName.substring(0, 1).toUpperCase() + methodName.substring(1);

        if (WidgetClass.meta === undefined || WidgetClass.meta.actions === undefined || (WidgetClass.meta.actions[actionName] === undefined && WidgetClass.meta.actions[methodName] === undefined)) {
            return value;
        }
        var action = (WidgetClass.meta.actions[actionName]) ? WidgetClass.meta.actions[actionName] : WidgetClass.meta.actions[methodName];

        var parameter = action.parameter,
            param = parameter[Object.keys(parameter)[0]];

        if (!param || Types.objectTypes.indexOf(param.type) === -1) {
            return value;
        }

        try {
            value = JSON.parse(value.replace(/'/g, '"'));
        } catch (e) {
            console.iatWarn('illegal data in binding: attribute: ' + attrName + ', widgetId:' + widgetId);
        }

        return value;
    }

    function _attributeChangeListener(e) {
        var widgetId = e.target.id,
            detail = e.detail,
            widgetSubscriptions = bindingModel.getSubscriptionsForElement(widgetId);

        _filterSubscriptions(widgetSubscriptions, function (attribute) { return detail.hasOwnProperty(attribute); })
            .forEach(function (actSubscription) {
                // A&P 509115: widgets duerfen erst ein ValueChange schicken, wenn der content aktiv ist (ContentActivated) oder die subscription
                if (_validateSubscription(actSubscription.data)) {
                    _processAttributeChange(actSubscription.data, detail[actSubscription.attribute]);
                }
            });
    }

    function _nodeAttributeChangeListener(e) {
        //console.debug('_nodeAttributeChangeListener:', e.target.id, e.detail);
        var widgetId = e.target.id,
            detail = e.detail,
            widgetSubscriptions = bindingModel.getSubscriptionsForElement(widgetId);

        _filterSubscriptions(widgetSubscriptions, function (attribute) { return detail.attribute === attribute; })
            .forEach(function (actSubscription) {
                // A&P 509115: widgets duerfen erst ein ValueChange schicken, wenn der content aktiv ist (ContentActivated) oder die subscription
                if (_validateSubscription(actSubscription.data)) {
                    _processNodeChange(actSubscription.data, detail.nodeAttribute, detail.value);
                }
            });
    }

    // Hilfsfunktion zum Filtern von Widget Subscriptions
    function _filterSubscriptions(subscriptions, fn) {
        var _filteredSubscriptions = [];
        if (!Utils.isObject(subscriptions) || typeof fn !== 'function') {
            return _filteredSubscriptions;
        }
        for (var attribute in subscriptions) {
            if (fn(attribute, subscriptions[attribute]) === true) {
                _filteredSubscriptions.push({ attribute: attribute, data: subscriptions[attribute] });
            }
        }
        return _filteredSubscriptions;
    }

    // Hilfsfunktion zum Validieren einer Widget Subscription
    // Liefert den Wert "true" zurueck wenn die Subscription und der Content
    // in dem sie enthalten ist aktiv sind
    function _validateSubscription(subscription) {
        // A&P 509115: widgets duerfen erst ein ValueChange schicken, wenn der content aktiv ist (ContentActivated) oder die subscription
        return subscription !== undefined && (contentManager.isContentActive(subscription.contentId) || subscription.active);
    }

    function _processAttributeChanges(arChanges) {
        //console.log('_processAttributeChanges:', arChanges);
        var update = {
                event: ServerEvent.PROPERTY_VALUE_CHANGED,
                eventArgs: []
            },
            i;

        update.eventArgs = arChanges.map(function (actChange) {
            return (actChange.type !== undefined) ? {
                refId: actChange.subscription.elemId,
                data: [{
                    attribute: actChange.subscription.attribute,
                    value: actChange.data,
                    type: actChange.type
                }]
            } : {
                refId: actChange.subscription.elemId,
                data: [{
                    attribute: actChange.subscription.attribute,
                    value: actChange.data
                }]
            };
        });
        _runtimeService.sendUpdate([update]);
        // after sendInitialValues we can set subscriptions active
        // this way it is guaranteed that initialValues are the first values for subscriptions
        for (i = 0; i < arChanges.length; i += 1) {
            arChanges[i].subscription.active = true;
        }
    }

    function _processAttributeChange(subscription, value) {

        _runtimeService.sendUpdate([{
            event: ServerEvent.PROPERTY_VALUE_CHANGED,
            eventArgs: [Subscription.toServerData(subscription, value)]
        }]);

    }

    function _processNodeChange(subscription, nodeAttribute, value) {

        var singleUpdate = {
                refId: subscription.elemId,
                data: [{
                    attribute: subscription.attribute
                }]
            },
            update = {
                eventArgs: [singleUpdate]
            };
        if (nodeAttribute === 'unit') {
            update.event = 'PropertyUnitChanged';
            singleUpdate.data[0][nodeAttribute] = value;
            _runtimeService.sendUpdate([update]);
        }

    }

    return bindingController;

});
