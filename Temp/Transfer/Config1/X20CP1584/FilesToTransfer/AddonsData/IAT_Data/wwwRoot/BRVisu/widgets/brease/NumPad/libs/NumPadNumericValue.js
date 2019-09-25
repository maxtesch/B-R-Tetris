/*global define,brease,console,CustomEvent,_*/
define(['brease/events/BreaseEvent', 'brease/enum/Enum', 'brease/core/Utils'], function (BreaseEvent, Enum, Utils) {

    'use strict';

    var NumericValue = {
        init: function (widget) {
            this.numericValueVal = widget.el.find('.breaseNumpadNumericValue');
            this.settings = {
                error: false
            };

            return this;
        },
        setSettings: function (minValue, maxValue, smallChange, largeChange, numberFormat, useDigitGrouping, separators) {
            this.settings.minValue = minValue;
            this.settings.maxValue = maxValue;
            this.settings.smallChange = smallChange;
            this.settings.largeChange = largeChange;
            this.settings.numberFormat = numberFormat;
            this.settings.useDigitGrouping = useDigitGrouping;
            this.settings.separators = separators;
        },
        setValue: function (value, omitDispatch) {
            //console.debug('numpadNumericValue.setValue:', value);
            if (value !== undefined) {
                this.value = value;
                if (this.value !== null) {

                    var val = Math.round(value / this.settings.smallChange) * this.settings.smallChange,
                        pos;

                    val = _limit(val, this.settings.minValue, this.settings.maxValue);

                    if (val >= this.settings.minValue && val <= this.settings.maxValue) {
                        this.value = val;
                        if (this.value === null) {
                            this.numericValueVal.text(brease.settings.noValueString);
                        } else {
                            this.numericValueVal.text(brease.formatter.formatNumber(this.value, this.settings.numberFormat, this.settings.useDigitGrouping, this.settings.separators));
                        }
                    }
                }
            }
        },
        setValueAsString: function (str) {
            //console.debug('numpadNumericValue.setValueAsString:', str);
            this.numericValueVal.text(brease.formatter.formatNumber(Number(str), this.settings.numberFormat, this.settings.useDigitGrouping, this.settings.separators));
        },
        setError: function (error) {
            this.settings.error = error;
            this.numericValueVal.toggleClass('error', error);
        },
        getLimit: function (val, minValue, maxValue) {
            return _limit(val, minValue, maxValue);
        }
    };

    function _limit(val, minValue, maxValue) {
        if (val < minValue) {
            val = minValue;
        }

        if (val > maxValue) {
            val = maxValue;
        }
        return val;
    }

    return NumericValue;
});
