define(['libs/d3/d3'], function (d3) {
    'use strict';
    var UtilsScale = {};

    UtilsScale.createScaleLinear = function (domain, range) {
        return d3.scale.linear().domain(domain).range(range);

    };

    UtilsScale.updateDomain = function (scale, newDomain) {
        scale.domain(newDomain);
    };

    UtilsScale.updateRange = function (scale, newRange) {
        scale.range(newRange);
    };

    return UtilsScale;
});