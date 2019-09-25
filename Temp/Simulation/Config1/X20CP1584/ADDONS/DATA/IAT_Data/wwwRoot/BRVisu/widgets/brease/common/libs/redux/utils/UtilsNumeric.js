define(['brease/config/NumberFormat'], function (NumberFormat) {
    'use strict';
    var UtilsNumeric = {};

    UtilsNumeric.getFormatedNumber = function (value, format) {
        var numberFormat = NumberFormat.getFormat(format, brease.measurementSystem.getCurrentMeasurementSystem());
        value = brease.formatter.formatNumber(value, numberFormat);
        return value;
    };

    UtilsNumeric.getDecimalPlaces = function (format) {
        var decimalPlaces = NumberFormat.getFormat(format, brease.measurementSystem.getCurrentMeasurementSystem());
        return decimalPlaces.decimalPlaces;
    };
    return UtilsNumeric;
});