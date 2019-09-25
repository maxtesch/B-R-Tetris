/*global define,brease*/
define(['ace/ace',
    'widgets/brease/common/libs/TextEditor/Commands',
    'brease/core/Utils'],
function (ace, Commands, Utils) {

    'use strict';

    var clipboardText = '';

    /**
    * Constructor that creates a new editor object and append it to element 
    * @param {Object} element element in which the editor will be appended
    * @param {String} mode define the highlighting mode for the text
    * @param {Function} onModified callback to be called when the doc is modified
    * @param {Boolean} disabled indicated if the editor is disabled by default
    * @param {Object} Keyboard module for keyboard
    * @param {Boolean} ShowLineNumber decides whether the gutter needs to be shown or not
    */
    function TextEditor(element, mode, onModified, disabled, Keyboard, showLineNumber) {
        if (!(element instanceof Element)) {
            return;
        }
        this.settings = _mergeOption(mode, onModified, disabled, Keyboard, showLineNumber);
        this.editor = ace.edit(element);
        this.editor.setTheme('ace/theme/brace');
        this.editor.session.setMode('ace/mode/' + this.settings.mode);
        if (this.settings.disabled) {
            this.disableInteraction(true);
        }
        this.editor.on('change', this.settings.onModified);
        this.boundOnFocus = this.onFocus.bind(this);
        this.editor.on('focus', this.boundOnFocus);
        this.boundOnBlur = this.onBlur.bind(this);
        this.editor.on('blur', this.boundOnBlur);
        this.editor.setShowPrintMargin(false);
        this.editor.setOption('hasCssTransforms', true);
        this.editor.renderer.setShowGutter(this.settings.showLineNumber);
        Commands.addCommands(this);
        if (this.settings.keyboard) {
            this.boundOnKeyboardInput = this.onKeyboardInput.bind(this);
            this.keyboard = new Keyboard();
        }
    }

    /**
    * Set mode
    * @param {String} mode
    */
    TextEditor.prototype.setMode = function (mode) {
        this.settings.mode = mode;
        this.editor.session.setMode('ace/mode/' + this.settings.mode);
    };

    /**
    * Get mode
    * @return {String} mode
    */
    TextEditor.prototype.getMode = function () {
        return this.settings.mode;
    };

    /**
    * Get if the virtual keyboard is enabled
    * @return {String} mode
    */
    TextEditor.prototype.getKeyboard = function () {
        return this.settings.keyboard;
    };

    /**
    * Set onModified
    * @param {String} onModified
    */
    TextEditor.prototype.setOnModified = function (onModified) {
        this.settings.onModified = onModified;
        this.editor.on('change', this.settings.onModified);
    };

    /**
    * Get onModified
    * @return {Object} onModified
    */
    TextEditor.prototype.getOnModified = function () {
        return this.settings.onModified;
    };

    /**
    * Sets the clipboardText inside the TextEditor for all instances
    * @param {String} text
    */
    TextEditor.prototype.setClipboardText = function (text) {
        clipboardText = text;
    };

    /**
    * Gets the clipboardText text inside the TextEditor
    * @return {String} clipboardText inside the TextEditor (same for all instances)
    */
    TextEditor.prototype.getClipboardText = function () {
        return clipboardText;
    };

    /**
    * Sets the new file in the textEditor
    * @param {String} value text to be displayed in the editor
    * @param {Boolean} cleanUndoHistory reset the stack of changes
    */
    TextEditor.prototype.setValue = function (value, cleanUndoHistory) {
        this.editor.setValue(value);
        this.editor.clearSelection();
        if (cleanUndoHistory === true) {
            this.editor.getSession().getUndoManager().reset();
        }
    };

    /**
    * Gets the actual value on the editor
    * @return {String} value text displayed on the editor
    */
    TextEditor.prototype.getValue = function () {
        return this.editor.getValue();
    };

    /**
    * Gets the actual selected text
    * @return {String} actual selected text
    */
    TextEditor.prototype.getSelectedText = function () {
        return this.editor.getSelectedText();
    };

    /**
    * Shows/Hide the lineNumber gutter
    * @param {Boolean} showLineNumber 
    */
    TextEditor.prototype.setShowLineNumber = function (showLineNumber) {
        this.settings.showLineNumber = showLineNumber;
        this.editor.renderer.setShowGutter(showLineNumber);
    };

    /**
    * gets the actual state
    * @return {Boolean} showLineNumber 
    */
    TextEditor.prototype.getShowLineNumber = function () {
        return this.settings.showLineNumber;
    };

    /**
    * Disable user interaction with the editor
    * @param {Boolean} dim defines if the editor should be gray out
    */
    TextEditor.prototype.disableInteraction = function (dim) {
        this.settings.disabled = true;
        if (this.cover !== undefined) {
            this.cover.remove();
        }
        this.cover = document.createElement('div');
        this.editor.container.appendChild(this.cover);
        this.cover.style.cssText = 'position:absolute;' +
            'top:0;bottom:0;right:0;left:0;' +
            'background:rgba(150,150,150,' + (dim ? 0.5 : 0) + ');' +
            'z-index:100';
        this.editor.renderer.scrollBarH.element.style.zIndex = '101';
        this.editor.renderer.scrollBarV.element.style.zIndex = '101';
        this.editor.renderer.$cursorLayer.element.style.opacity = 0;
        this.editor.setOptions({
            highlightActiveLine: false,
            highlightSelectedWord: false,
            readOnly: true,
            highlightGutterLine: false
        });
    };

    /**
    * Enable user interaction with the editor
    */
    TextEditor.prototype.enableInteraction = function () {
        this.settings.disabled = false;
        if (this.cover !== undefined) {
            this.cover.remove();
        }
        this.editor.renderer.$cursorLayer.element.style.opacity = 1;
        this.editor.setOptions({
            highlightActiveLine: true,
            highlightSelectedWord: true,
            readOnly: false,
            highlightGutterLine: true
        });
    };

    /**
    * Gets the actual value for the enable
    * @return {Boolean}
    */
    TextEditor.prototype.isEnabled = function () {
        return !this.settings.disabled;
    };

    /**
    * Update the size of the text editor
    */
    TextEditor.prototype.resize = function (force) {
        this.editor.resize(force);
    };

    /**
    * Dispose the editor
    */
    TextEditor.prototype.dispose = function () {
        if (this.editor !== undefined) {
            $(this.editor.container).children().off();
            this.editor.destroy();
        }
    };

    /**
    * Event received when the textEditor comes into focus
    */
    TextEditor.prototype.onFocus = function () {
        if (this.settings.keyboard) {
            this.openKeyboard();
        }
    };

    /**
    * Event received when the textEditor comes into focus
    */
    TextEditor.prototype.onSearchFocus = function () {
        if (this.settings.keyboard) {
            this.openKeyboard();
        }
    };

    /**
    * Event received when the textEditor lose focus
    */
    TextEditor.prototype.onBlur = function () {
        this.editor.clearSelection();
        if (this.settings.keyboard) {
            this.closeKeyboard();
        }
    };

    /**
    * Event received when the textEditor comes into focus
    */
    TextEditor.prototype.onSearchBlur = function () {
        if (this.settings.keyboard) {
            this.closeKeyboard();
        }
    };

    /**
    * Event received from keyboard
    * @param {Object} e data for the keyboard event
    */
    TextEditor.prototype.onKeyboardInput = function (e) {
        var command = e.data.action,
            args = e.data.args;
        if (Commands.isValidCommand(command)) {
            this.editor.execCommand(command, args);
        } else if (command === 'close') {
            this.keyboard.removeCallback(this.boundOnKeyboardInput);
            this.editor.blur();
        }
    };

    /**
    * Open the keyboard
    */
    TextEditor.prototype.openKeyboard = function () {
        if (this.keyboard !== undefined) {
            this.keyboard.show();
            this.keyboard.addCallback(this.boundOnKeyboardInput);
        }
    };

    /**
    * Close the keyboard
    */
    TextEditor.prototype.closeKeyboard = function () {
        if (this.keyboard !== undefined) {
            this.keyboard.hide();
            this.keyboard.removeCallback(this.boundOnKeyboardInput);
        }
    };

    /**
    * Start listening for focus/blur events on the searchBox
    */
    TextEditor.prototype.addListenersSearchBox = function () {
        if (!this.listenersAdded) {
            $(this.editor.container).find('.ace_search_field').on('focus', this.onSearchFocus.bind(this));
            $(this.editor.container).find('.ace_replace_field').on('focus', this.onSearchFocus.bind(this));
            $(this.editor.container).find('.ace_search_field').on('blur', this.onSearchBlur.bind(this));
            $(this.editor.container).find('.ace_replace_field').on('blur', this.onSearchBlur.bind(this));
            this.listenersAdded = true;
            //force a first call to open the keyboard
            this.openKeyboard();
        }
    };

    //Private
    function _mergeOption(mode, onModified, disabled, Keyboard, showLineNumber) {
        return {
            mode: Utils.isString(mode) ? mode : 'plain',
            onModified: Utils.isFunction(onModified) ? onModified : function () { },
            disabled: disabled ? true : false,
            keyboard: Utils.isObject(Keyboard),
            showLineNumber: showLineNumber === false ? false : true
        };
    }

    return TextEditor;
});
