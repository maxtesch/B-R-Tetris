define(['brease/events/BreaseEvent', 'brease/enum/Enum', 'brease/core/Utils', 'brease/controller/FileManager'], function (BreaseEvent, Enum, Utils, fileManager) {

    'use strict';

    /**
    * @class brease.controller.OverlayController
    * @extends core.javascript.Object
    * Main controller to show and hide Messageboxes and Dialogs
    * 
    * @singleton
    */

    var DialogWindow,
        MessageBox,
        OverlayController = {
            init: function () {

                this.ready = $.Deferred();

                var systemWidgets = ['widgets/brease/DialogWindow/DialogWindow', 'widgets/brease/MessageBox/MessageBox', 'widgets/brease/NumPad/NumPad', 'widgets/brease/KeyBoard/KeyBoard', 'widgets/brease/DateTimePicker/DateTimePicker', 'system/widgets/ContentLoader/ContentLoader'];
                fileManager.loadOverlays(systemWidgets).done(function (DialogWindowClass, MessageBoxClass) {
                    DialogWindow = DialogWindowClass;
                    MessageBox = MessageBoxClass;
                    _messageBoxPool.push({
                        widget: new MessageBox(),
                        used: false,
                        type: 'MessageBox'
                    });
                    _messageBoxPool.push({
                        widget: new DialogWindow(),
                        used: false,
                        type: 'DialogWindow'
                    });
                    OverlayController.ready.resolve();
                }).fail(errorHandler);

                return this.ready.promise();
            },
            /**
            * @method showMessageBox
            * shows a MessageBox window
            * @param {brease.enum.MessageBoxType} type
            * @param {String} header
            * @param {String} message
            * @param {brease.enum.MessageBoxIcon} icon
            * @param {Object} buttonText
            * @param {String} style
            * @param {Function} callback The callback function is called after a button was clicked. It's passed a parameter data, which contains info about the clicked button, e.g. {button:'ok'}
            */
            showMessageBox: function (type, header, message, icon, buttonText, style) {
                var def = $.Deferred();
                $.when(this.getWindow('MessageBox')).then(function (messageBox) {
                    var options = {};

                    options.header = { text: header || '' };

                    options.content = { text: message || '' };

                    if (icon) {
                        options.icon = icon;
                    }
                    if (buttonText) {
                        options.buttonText = buttonText;
                    }

                    if (type) {
                        options.type = type;
                    }
                    messageBox.widget.resetStyles();

                    if (style) {
                        options.style = style;
                    }

                    messageBox.widget.show(options).then(
                        function (result) {
                            //console.iatInfo("MessageBoxResult", result);
                            def.resolve(result);
                            messageBox.used = false;
                        });
                });

                return def.promise();
            },

            /**
            * @method getWindow
            * get a MessageBox from the Pool
            * @param {String} type Type of Window (MessageBox/DialogWindow)
            * @return {Function} deferred Object with Messagebox Object
            */
            getWindow: function (type) {
                var def, that = this, WindowType;
                for (var i in _messageBoxPool) {
                    if (_messageBoxPool[i].used === false && _messageBoxPool[i].type === type) {
                        _messageBoxPool[i].used = true;
                        return _messageBoxPool[i];
                    }
                }
                def = $.Deferred();

                switch (type) {
                    case 'MessageBox':
                        WindowType = MessageBox;
                        break;
                    case 'DialogWindow':
                        WindowType = DialogWindow;
                        break;
                }

                new WindowType().isReady().then(function (box) {
                    _messageBoxPool.push({
                        widget: box,
                        used: false,
                        type: type
                    });
                    def.resolve(that.getWindow(type));
                });

                return def.promise();

            },

            /**
            * @method openDialog
            * opens a Dialog window
            * @param {String} id Id of the Dialog
            * @param {brease.enum.DialogMode} mode
            * @param {String} horPos
            * @param {String} verPos
            * @param {HTMLElement} refContainer
            * @param {String} headerText
            * @param {Boolean} autoClose
            */
            openDialog: function (id, mode, horPos, verPos, refContainer, headerText, autoClose) {
                var def = $.Deferred(),
                    options = {};

                if (_dialogs[id] !== undefined) {
                    //console.iatInfo('Dialog with id" ' + id + '" already open');
                    def.resolve();
                    return def.promise();
                }

                if (autoClose === true) {
                    options.forceInteraction = false;
                } else {
                    options.forceInteraction = true;
                }

                if (mode === Enum.DialogMode.MODELESS) {
                    options.modal = false;
                } else {
                    options.modal = true; //default
                }
                options.position = options.position || {};
                if (horPos !== undefined) {
                    options.position.horizontal = _getPositionType(horPos);
                }

                if (verPos !== undefined) {
                    options.position.vertical = _getPositionType(verPos);
                }

                if (headerText !== undefined) {
                    options.headerText = headerText;
                }

                $.when(this.getWindow('DialogWindow')).then(function (dwindow) {
                    options.id = id;
                    _dialogs[id] = dwindow;
                    // dispatch dialog id to event controller for dialog_opened event
                    document.body.dispatchEvent(new CustomEvent(BreaseEvent.DIALOG_OPEN, { bubbles: true, cancelable: true, detail: { dialogId: id } }));
                    var dialogExists = dwindow.widget.show(options, refContainer);
                    $.when(dwindow.widget.onClose()).then(
                        function () {
                            // dispatch dialog id to event controller for dialog_closed event
                            document.body.dispatchEvent(new CustomEvent(BreaseEvent.DIALOG_CLOSED, { bubbles: true, cancelable: true, detail: { dialogId: id } }));
                            _dialogs[id] = undefined;
                            dwindow.used = false;
                        });
                    def.resolve(undefined, dialogExists);
                });

                return def.promise();
            },

            /**
          * @method openDialogAtTarget
          * @param {String} id Id of the Dialog
          * @param {brease.enum.DialogMode} mode
          * @param {String} horPos
          * @param {String} verPos
          * @param {HTMLElement} refContainer
          * @param {String} headerText
          * @param {Boolean} autoClose
          * @param {String} horDialogAlignment
          * @param {String} verDialogAlignment
          */
            openDialogAtTarget: function (id, mode, horPos, verPos, refContainer, headerText, autoClose, horDialogAlignment, verDialogAlignment) {
                var def = $.Deferred(),
                    options = {};

                if (_dialogs[id] !== undefined) {
                    def.resolve();
                    return def.promise();
                }

                if (autoClose !== true) {
                    options.forceInteraction = true;
                }

                if (mode !== Enum.DialogMode.MODAL) {
                    options.modal = false;
                }

                options.position = {};
                if (horPos !== undefined) {
                    options.position.horizontal = horPos;
                }

                if (verPos !== undefined) {
                    options.position.vertical = verPos;
                }
                if (horDialogAlignment !== undefined) {
                    options.position.horizontalDialog = horDialogAlignment;
                }

                if (verDialogAlignment !== undefined) {
                    options.position.verticalDialog = verDialogAlignment;
                }

                if (headerText !== undefined) {
                    options.headerText = headerText;
                }

                $.when(this.getWindow('DialogWindow')).then(function (dwindow) {
                    options.id = id;
                    _dialogs[id] = dwindow;
                    // dispatch dialog id to event controller for dialog_opened event
                    document.body.dispatchEvent(new CustomEvent(BreaseEvent.DIALOG_OPEN, { bubbles: true, cancelable: true, detail: { dialogId: id } }));
                    var dialogExists = dwindow.widget.show(options, refContainer);
                    $.when(dwindow.widget.onClose()).then(
                        function () {
                            // dispatch dialog id to event controller for dialog_closed event
                            document.body.dispatchEvent(new CustomEvent(BreaseEvent.DIALOG_CLOSED, { bubbles: true, cancelable: true, detail: { dialogId: id } }));
                            _dialogs[id] = undefined;
                            dwindow.used = false;
                        });
                    def.resolve(undefined, dialogExists);
                });

                return def.promise();

            },

            /**
            * @method closeDialog
            * close a Dialog window
            * @param {String} id Id of the Dialog
            */
            closeDialog: function (id) {
                var drwindow = _dialogs[id];

                if (drwindow) {
                    drwindow.widget.hide();
                    _dialogs[id] = undefined;
                }

            }
        },
        _messageBoxPool = [],
        _dialogs = [];
        
    function errorHandler() {
        brease.messenger.announce('WIDGET_LOAD_ERROR');
    }

    function _getPositionType(pos) {
        var pixelRegex = /\d+px/g;
        if (pixelRegex.test(pos)) {
            return parseInt(pos, 10);
        }
        return pos;
    }

    return OverlayController;
});
