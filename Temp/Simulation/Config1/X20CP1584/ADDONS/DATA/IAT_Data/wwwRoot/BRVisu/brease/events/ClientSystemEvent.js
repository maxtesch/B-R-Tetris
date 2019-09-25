define(['brease/core/Utils'], function (Utils) {

    'use strict';

    var ClientSystemEvent = {};

    Utils.defineProperty(ClientSystemEvent, 'KEY_DOWN', 'KeyDown');
    Utils.defineProperty(ClientSystemEvent, 'KEY_UP', 'KeyUp');
    Utils.defineProperty(ClientSystemEvent, 'KEY_PRESS', 'KeyPress');
    Utils.defineProperty(ClientSystemEvent, 'LOGIN_SUCCESS', 'LoginSuccess');
    Utils.defineProperty(ClientSystemEvent, 'LOGIN_FAILED', 'LoginFailed');
    Utils.defineProperty(ClientSystemEvent, 'SYSTEM_SWIPE', 'SystemSwipe');
    Utils.defineProperty(ClientSystemEvent, 'CONTENT_LOADED', 'ContentLoaded');
    Utils.defineProperty(ClientSystemEvent, 'DISABLED_CLICK', 'DisabledClick');
    Utils.defineProperty(ClientSystemEvent, 'DIALOG_OPENED', 'DialogOpened');
    Utils.defineProperty(ClientSystemEvent, 'DIALOG_CLOSED', 'DialogClosed');
    Utils.defineProperty(ClientSystemEvent, 'TOOLTIPMODE_ACTIVATED', 'TooltipModeActivated');
    Utils.defineProperty(ClientSystemEvent, 'TOOLTIPMODE_DEACTIVATED', 'TooltipModeDeactivated');
    return ClientSystemEvent;

});
