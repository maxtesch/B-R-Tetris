define(['brease/objects/WidgetObject', 'brease/core/Utils', 'brease/enum/Enum'], function (WidgetObject, Utils, Enum) {

    'use strict';

    function WidgetModel() {
        this.initialState = Enum.WidgetState.IN_QUEUE;
        this.items = new Map();
        this.contents = {};
        window.widgetModel = {
            items: this.items,
            contents: this.contents
        };
    }

    WidgetModel.prototype.add = function (id) {
        if (!id || Utils.isString(id) === false) {
            throw new SyntaxError('cannot create widget without id');
        }
        this.items.set(id, new WidgetObject({
            id: id,
            state: this.initialState
        }));
        return this.items.get(id);
    };

    WidgetModel.prototype.getWidget = function (id) {
        if (!id || Utils.isString(id) === false) {
            return undefined;
        } else {
            return this.items.get(id);
        }
    };

    WidgetModel.prototype.getOrCreate = function (id) {
        if (!id || Utils.isString(id) === false) {
            throw new SyntaxError('cannot create widget without id');
        } else {
            if (this.items.get(id) === undefined) {
                this.add(id);
            }
            return this.items.get(id);
        }
    };

    WidgetModel.prototype.deleteWidget = function (id) {
        var item = this.items.get(id);
        if (item) {
            var content = this.contents[item.contentId];
            if (content) {
                content.delete(id);
            }
            this.items.delete(id);
        }
    };

    WidgetModel.prototype.addToContent = function (widgetId, contentId) {
        var widget = this.items.get(widgetId);
        if (widget) {
            widget.contentId = contentId;
            if (this.contents[contentId] === undefined) {
                this.contents[contentId] = new Map();
            }
            this.contents[contentId].set(widgetId, widget);
        }
    };

    WidgetModel.prototype.getWidgetsOfContent = function (contentId) {
        return this.contents[contentId];
    };

    return WidgetModel;
});
