define(['brease/controller/objects/Client', 'brease/events/BreaseEvent', 'brease/core/Utils', 'brease/core/Types', 'brease/enum/Enum'],
    function (Client, BreaseEvent, Utils, Types, Enum) {

        'use strict';

        /**
        * @class brease.controller.ActionController
        * @extends core.javascript.Object
        * Main controller to handle actions
        * It provides methods handle actions
        * 
        * @singleton
        */
        var ActionController = function ActionController() { },
            p = ActionController.prototype,
            _runtimeService;

        p.init = function (runtimeService) {
            if (_runtimeService !== undefined) {
                _runtimeService.removeEventListener('action', _serverActionHandler);
            }
            _runtimeService = runtimeService;
            _runtimeService.addEventListener('action', _serverActionHandler);
        };

        function _serverActionHandler(e) {

            var action = e.detail,
                type = _getActionType(action);

            try {
                switch (type) {
                    case 'widget':
                        _processWidgetAction(action);
                        break;

                    case 'clientSystem':
                        _processSystemAction(action);
                        break;

                    default:
                        _processActionResponse({}, action.actionId, false);
                        break;

                }
            } catch (error) {
                _log(error, action);
                _processActionResponse(null, action.actionId, false);
            }
        }

        function _getActionType(action) {
            if (action.action.indexOf('widgets.') !== -1) {
                return 'widget';
            } else if (action.action.indexOf('clientSystem.') === 0) {
                return 'clientSystem';
            } else {
                console.warn('Target:', action.action, 'notAvailable');
            }
        }

        function _processSystemAction(action) {

            switch (action.action) {
                case ('clientSystem.Action.ShowMessageBox'):
                    _runShowMessageBoxAction(action);
                    break;

                case ('clientSystem.Action.OpenDialog'):
                    if (Client.isValid === true) {
                        _runOpenDialogAction(action);
                    } else {
                        _processActionResponse({}, action.actionId, false);
                        console.warn('client not valid -> action "OpenDialog" rejected');
                    }
                    break;

                case ('clientSystem.Action.OpenDialogAtTarget'):
                    if (Client.isValid === true) {
                        _runOpenDialogAtTarget(action);
                    } else {
                        _processActionResponse({}, action.actionId, false);
                        console.warn('client not valid -> action "OpenDialogAtTarget" rejected');
                    }
                    break;

                case ('clientSystem.Action.CloseDialog'):
                    if (Client.isValid === true) {
                        _runCloseDialogAction(action);
                    } else {
                        _processActionResponse({}, action.actionId, false);
                        console.warn('client not valid -> action "CloseDialog" rejected');
                    }
                    break;

                case ('clientSystem.Action.Navigate'):
                    if (Client.isValid === true) {
                        _runNavigateAction(action);
                        _deactivateTooltipMode();
                    } else {
                        _processActionResponse({}, action.actionId, false);
                        console.warn('client not valid -> action "Navigate" rejected');
                    }
                    break;

                case ('clientSystem.Action.LoadContentInArea'):
                    if (Client.isValid === true) {
                        _runLoadContentInAreaAction(action);
                    } else {
                        _processActionResponse({}, action.actionId, false);
                        console.warn('client not valid -> action "LoadContentInArea" rejected');
                    }
                    break;

                case ('clientSystem.Action.LoadContentInDialogArea'):
                    if (Client.isValid === true) {
                        _runLoadContentInDialogAreaAction(action);
                    } else {
                        _processActionResponse({}, action.actionId, false);
                        console.warn('client not valid -> action "LoadContentInDialogArea" rejected');
                    }
                    break;
                case ('clientSystem.Action.Logout'):
                    _runLogoutAction(action);
                    break;

                case ('clientSystem.Action.Login'):
                    _runLoginAction(action);
                    break;

                case ('clientSystem.Action.ChangeTheme'):
                    if (Client.isValid === true) {
                        _runChangeThemeAction(action);
                    } else {
                        _processActionResponse({}, action.actionId, false);
                        console.warn('client not valid -> action "ChangeTheme" rejected');
                    }
                    break;

                case ('clientSystem.Action.SetLanguage'):
                    _runSetLanguageAction(action);
                    break;

                case ('clientSystem.Action.SetMeasurementSystem'):
                    _runSetMeasurementSystemAction(action);
                    break;
                case ('clientSystem.Action.ScrollContent'):
                    if (Client.isValid === true) {
                        _runScrollContentSystemAction(action);
                    } else {
                        _processActionResponse({}, action.actionId, false);
                        console.iatWarn('client not valid -> action "ScrollContent" rejected');
                    }
                    break;
                case ('clientSystem.Action.ShowTooltips'):
                    _runShowTooltipsAction(action);
                    break;

                default:
                    console.warn('Action:', action.action, 'notAvailable');
                    _processActionResponse({}, action.actionId, false);
                    break;
            }
        }

        function _getMethodArgs(WidgetClass, actionName, method) {

            if (WidgetClass.meta && WidgetClass.meta.actions) {
                var params = [];
                for (var param in WidgetClass.meta.actions[actionName].parameter) {
                    params[WidgetClass.meta.actions[actionName].parameter[param].index] = param;
                }
                return params;
            } else {
                return Utils.getFunctionArguments(method);
            }

        }

        function _processWidgetAction(action) {

            var widgetId = action.target.refId,
                widget = brease.callWidget(widgetId, 'widget'),
                actionName = action.action.split('.').pop();

            if (widget === null) {
                _processActionResponse(null, action.actionId, false);
            } else if (widget.state < Enum.WidgetState.INITIALIZED) {
                console.iatWarn('widget action "' + actionName + '" for ' + action.target.refId + ': widget in unavailable state:' + widget.state);
                _processActionResponse(null, action.actionId, false);
            } else {
                var WidgetClass = widget.constructor,
                    metaMethod = (WidgetClass.meta && WidgetClass.meta.actions) ? WidgetClass.meta.actions[actionName] : undefined,
                    methodName = (metaMethod) ? metaMethod.method : actionName.substring(0, 1).toLowerCase() + actionName.substring(1),
                    method = widget[methodName];

                if (method === undefined) {
                    console.iatWarn('Action "' + actionName + '" not available on type ' + WidgetClass.defaults.className);
                    _processActionResponse(null, action.actionId, false);
                } else {

                    var methodCallArgs = _createArgs(method, actionName, action.actionArgs, WidgetClass),
                        methodResult = method.apply(widget, methodCallArgs);

                    if (methodResult && typeof methodResult.done === 'function') {
                        methodResult.done(function (data) {
                            _processActionResponse(data, action.actionId, (data !== null));
                        });
                    } else {
                        $.when(methodResult).then(function (data) {
                            _processActionResponse(data, action.actionId, (data !== null));
                        });
                    }

                    // A&P 493965: if method is a setter, we have to dispatch a PropertyValueChanged event to the server, 
                    // if there exists a binding for the related property, to update any subsequent bindings
                    if (_isSetter(methodName, metaMethod)) {

                        var prop,
                            subscriptions = brease.uiController.getSubscriptionsForElement(widgetId);
                        // related property is either defined (setterFor) or extracted from the method name
                        if (metaMethod && metaMethod.setterFor) {
                            prop = metaMethod.setterFor;
                        } else {
                            prop = methodName.substring(3).replace(/^[A-Z]/, function (item) {
                                return item.toLowerCase();
                            });
                        }

                        if (subscriptions && subscriptions[prop]) {
                            _forwardPropertyChange(prop, widgetId, methodCallArgs[0]);
                        }
                        if (WidgetClass.meta && WidgetClass.meta.properties && WidgetClass.meta.properties[prop]) {
                            var refNode = WidgetClass.meta.properties[prop].nodeRefId;
                            if (refNode && subscriptions && subscriptions[refNode]) {
                                _forwardPropertyChange(refNode, widgetId, brease.callWidget(widgetId, Utils.getter(refNode)));
                            }
                        }
                    }
                }
            }
        }

        function _isSetter(methodName, metaMethod) {
            return methodName.indexOf('set') === 0 || (metaMethod && metaMethod.setterFor !== undefined);
        }

        function _forwardPropertyChange(propName, widgetId, value) {
            var detail = {};
            detail[propName] = value;
            brease.uiController.bindingController.attributeChangeForwarder({ 
                target: { id: widgetId }, 
                detail: detail });
        }

        // arguments for widget method sorted like defined in the method
        function _createArgs(method, actionName, objActionArgs, WidgetClass) {

            var methodCallArgs = [];

            // unsorted argument names as they come with the action call
            var actionArgNames = Object.keys(objActionArgs);

            // sorting only necessary if there are more than 1 arguments
            if (actionArgNames.length > 1) {
                // sorted names as defined in the widget method
                var sortedArgs = _getMethodArgs(WidgetClass, actionName, method);
                if (sortedArgs) {
                    actionArgNames = sortedArgs;
                }
            }
            // sorted values
            for (var i = 0; i < actionArgNames.length; i += 1) {
                methodCallArgs.push(_parseValue(objActionArgs[actionArgNames[i]], actionArgNames[i], WidgetClass, actionName));
            }

            return methodCallArgs;
        }

        function _parseValue(value, argName, WidgetClass, actionName) {

            // non string: value is returned as is
            if (!Utils.isString(value)) {
                return value;
            }

            // if we find no meta information: value is returned as is
            if (WidgetClass.meta === undefined || WidgetClass.meta.actions === undefined || WidgetClass.meta.actions[actionName] === undefined) {
                return value;
            }

            var param = WidgetClass.meta.actions[actionName].parameter[argName];

            // if the type is no object type: value is returned as is
            if (!param || Types.objectTypes.indexOf(param.type) === -1) {
                return value;
            }

            // try to convert the string to an object
            try {
                value = JSON.parse(value.replace(/'/g, '"'));
            } catch (e) {
                console.iatWarn('illegal data in attribute ' + argName + ' for action ' + actionName);
            }

            return value;
        }

        function _runShowMessageBoxAction(action) {
            var args = action.actionArgs;
            $.when(brease.overlayController.showMessageBox(args.type, args.header, args.message, args.icon, args.buttonText, args.style)).then(function (result) {
                _processActionResponse(result, action.actionId, true);
            });
        }

        function _runOpenDialogAction(action) {
            var args = action.actionArgs;
            $.when(brease.overlayController.openDialog(args.dialogId, args.mode, args.horizontalPos, args.verticalPos, args.target, args.headerText, args.autoClose)).then(function (result, exists) {
                _processActionResponse(result, action.actionId, exists);
            });
        }

        function _runOpenDialogAtTarget(action) {
            var args = action.actionArgs,
                argsPosAlignment = [args.horizontalPos, args.verticalPos, args.horizontalDialogAlignment, args.verticalDialogAlignment],
                target = document.getElementById(args.target);
            if (!(Enum.HorizontalPosition.hasMember(args.horizontalDialogAlignment) && Enum.VerticalPosition.hasMember(args.verticalDialogAlignment) &&
                Enum.HorizontalPosition.hasMember(args.horizontalPos) && Enum.VerticalPosition.hasMember(args.verticalPos))) {
                _runtimeService.logEvents(-2134803119, 0, '', [argsPosAlignment]);
            }
            target = document.getElementById(args.target);
            args.horizontalDialogAlignment = Types.parseValue(args.horizontalDialogAlignment, 'Enum', { IAT_Enum: Enum.HorizontalPosition, default: 'left' });
            args.verticalDialogAlignment = Types.parseValue(args.verticalDialogAlignment, 'Enum', { IAT_Enum: Enum.VerticalPosition, default: 'top' });
            args.horizontalPos = Types.parseValue(args.horizontalPos, 'Enum', { IAT_Enum: Enum.HorizontalPosition, default: 'right' });
            args.verticalPos = Types.parseValue(args.verticalPos, 'Enum', { IAT_Enum: Enum.VerticalPosition, default: 'top' });

            if (target !== null) {
                $.when(brease.overlayController.openDialogAtTarget(args.dialogId, args.mode, args.horizontalPos, args.verticalPos, target, args.headerText, args.autoClose, args.horizontalDialogAlignment, args.verticalDialogAlignment)).then(function (result, exists) {
                    _processActionResponse(result, action.actionId, exists);
                });
            } else {
                _processActionResponse({}, action.actionId, false);
            }
        }

        function _runCloseDialogAction(action) {
            var args = action.actionArgs;
            $.when(brease.overlayController.closeDialog(args.dialogId)).then(function (result) {
                _processActionResponse(result, action.actionId, true);
            });
        }

        function _runLoadContentInAreaAction(action) {
            var args = action.actionArgs;
            brease.pageController.loadContentInArea(args.contentId, args.areaId, args.pageId).done(function (result) {
                _processActionResponse(result, action.actionId, true);
            });
        }

        function _runLoadContentInDialogAreaAction(action) {
            var args = action.actionArgs;
            brease.pageController.loadContentInDialogArea(args.contentId, args.areaId, args.dialogId).done(function (result) {
                _processActionResponse(result, action.actionId, true);
            });
        }

        function _runNavigateAction(action) {
            var args = action.actionArgs,
                visu, container;

            visu = brease.pageController.getVisuById(brease.pageController.getVisu4Page(args.pageId));
            if (visu !== undefined) {
                container = document.getElementById(visu.containerId);
                $.when(brease.pageController.loadPage(args.pageId, container)).then(function () {
                    _processActionResponse({}, action.actionId, true);
                });
            } else {
                _processActionResponse({}, action.actionId, false);
            }
        }

        function _runLoginAction(action) {
            var args = action.actionArgs;

            $.when(brease.user.loginAction(args.userName, args.password)).then(function (result) {
                _processActionResponse(result.success, action.actionId, true);
            });
        }

        function _runLogoutAction(action) {

            $.when(brease.user.setDefaultUser()).then(function () {
                _processActionResponse({}, action.actionId, true);
            });
        }

        function _runChangeThemeAction(action) {
            var args = action.actionArgs;
            $.when(brease.pageController.setTheme(args.theme)).then(function () {
                _processActionResponse({}, action.actionId, true);
            });
        }

        function _runSetLanguageAction(action) {
            var args = action.actionArgs;
            $.when(brease.language.switchLanguage(args.value)).then(function (result) {
                _processActionResponse({}, action.actionId, result.success);
            });
        }

        function _runSetMeasurementSystemAction(action) {
            var args = action.actionArgs;
            $.when(brease.measurementSystem.switchMeasurementSystem(args.value)).then(function () {
                _processActionResponse({}, action.actionId, true);
            });
        }

        function _runScrollContentSystemAction(action) {
            var args = action.actionArgs;
            var supportsTouch = 'ontouchstart' in window || navigator.msMaxTouchPoints;

            if (supportsTouch) {
                // timeout ensures that this will be the last command in the iscroll-probe.js file 
                setTimeout(function () {
                    $.when(brease.pageController.scrollContent(args.contentId, args.position, args.duration)).then(function (result) {
                        _processActionResponse(result, action.actionId, true);
                    });
                }, 0);
            } else {
                $.when(brease.pageController.scrollContent(args.contentId, args.position, args.duration)).then(function (result) {
                    _processActionResponse(result, action.actionId, true);
                });
            }
        }

        function _runShowTooltipsAction(action) {
            var args = action.actionArgs;
            // check server ob value boolean oder string
            if (args.value === 'true' || args.value === true) {
                $('[data-brease-widget]').each(function () {
                    brease.callWidget(this.id, 'activateTooltipMode');
                });
            } else if (args.value === 'false' || args.value === false) {
                _deactivateTooltipMode();
            }

            _processActionResponse({}, action.actionId, true);
        }

        function _deactivateTooltipMode() {
            $('[data-brease-widget]').each(function () {
                brease.callWidget(this.id, 'deactivateTooltipMode');
            });
        }

        function _processActionResponse(data, id, success) {
            var res = {
                actionId: id,
                actionResult: {
                    result: data,
                    success: success
                }
            };
            //console.iatInfo("actionresponse", data, id, success);
            _runtimeService.actionResponse(res);
        }

        function _log(e, action) {

            var message = 'Error in action "' + action.action + '" for widget "' + action.target.refId + '"';
            console.log(message + ':');
            console.log(e);
        }
        return new ActionController();

    });
