define([],function () {

        'use strict';

        var UtilsEditableBinding = {};

        UtilsEditableBinding.handleEditable = function (editable, metaData, widget, propertyArray) {
            if (metaData !== undefined && metaData.refAttribute !== undefined) {
                var refAttribute = metaData.refAttribute;
                if (propertyArray.indexOf(refAttribute) > -1) {
                    widget.settings.editable = editable;
                    widget._internalEnable();
                }
            }
        };

        return UtilsEditableBinding;
    });