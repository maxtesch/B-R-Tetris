define(['libs/d3/d3', 'widgets/brease/common/libs/redux/utils/UtilsNumeric', 'brease/enum/Enum'], function (d3, UtilsNumeric, Enum) {

    'use strict';

    var UtilsAxis = {};

    UtilsAxis.createSVGContainer = function createSVGContainer(elem, height, width, additionalClasses) {
        var svgContainer = d3.select(elem).append('svg').attr('height', height).attr('width', width).attr('class', 'Axis');
        return svgContainer;
    };

    UtilsAxis.createAxisTop = function createAxisTop(scale, limitMin, limitMax, majorTicks, format) {
        var tickValues = _calculateValues(limitMin, limitMax, majorTicks),
            axis = d3.svg.axis()
                        .orient('top')
                        .tickValues(tickValues)
                        .tickFormat(d3.format(",." + UtilsNumeric.getDecimalPlaces(format) + "f"))
                        .scale(scale);
        return axis;
    };

    UtilsAxis.createAxisRight = function createAxisRight(scale, limitMin, limitMax, majorTicks, format) {
        var tickValues = _calculateValues(limitMin, limitMax, majorTicks),
            axis = d3.svg.axis()
                        .orient('right')
                        .tickValues(tickValues)
                        .tickFormat(d3.format(",." + UtilsNumeric.getDecimalPlaces(format) + "f"))
                        .scale(scale);
        return axis;
    };

    UtilsAxis.createAxisBottom = function createAxisBottom(scale, limitMin, limitMax, majorTicks, format) {
        var tickValues = _calculateValues(limitMin, limitMax, majorTicks),
            axis = d3.svg.axis()
                        .orient('bottom')
                        .tickValues(tickValues)
                        .tickFormat(d3.format(",." + UtilsNumeric.getDecimalPlaces(format) + "f"))
                        .scale(scale);
        return axis;
    };

    UtilsAxis.createAxisLeft = function createAxisLeft(scale, limitMin, limitMax, majorTicks, format) {
        var tickValues = _calculateValues(limitMin, limitMax, majorTicks),
            axis = d3.svg.axis()
                        .orient('left')
                        .tickValues(tickValues)
                        .tickFormat(d3.format(",." + UtilsNumeric.getDecimalPlaces(format) + "f"))
                        .scale(scale);
        return axis;
    };

    UtilsAxis.appendAxisHorizontal = function appendAxisHorizontal(svgContainer, axis, offset) {
        svgContainer.append('g')
            .attr('transform', 'translate(0,'+ offset +')')
            .call(axis);
    };

    UtilsAxis.appendAxisVertical = function appendAxisVertical(svgContainer, axis, offset) {
        svgContainer.append('g')
            .attr('transform', 'translate('+offset+',0)')
            .call(axis);
    };


    UtilsAxis.showTickNumber = function showTickNumber(svgContainer, showTickNumbers) {
        //if true, show Numbers
        
        if (showTickNumbers) {
            svgContainer.selectAll('g.tick text').classed('remove', false);
        } else {
            svgContainer.selectAll('g.tick text').classed('remove', true);
        }
    };

    UtilsAxis.showUnitSymbol = function showUnitSymbol(svgContainer, showUnitSymbols) {
        //if true, show UnitSymbol
        if (showUnitSymbols) {
            svgContainer.selectAll('text.UnitSymbol').classed('remove', false);
        } else {
            svgContainer.selectAll('text.UnitSymbol').classed('remove', true);
        }
    };

    UtilsAxis.createCombinedAxis = function createCombinedAxis(configObject) {
        //1. create SVG
        var svgContainer = this.createSVGContainer(configObject.elem, configObject.height, configObject.width, configObject.additionalClasses);


        //2. Check which Axis should be created
        switch (configObject.orientation) {
            case Enum.Orientation.LTR:
            case Enum.Orientation.RTL:
                //3. Create Axis with scale and selected format
                this.createCombinedAxisHorizontal(configObject, svgContainer);
                break;
            case Enum.Orientation.BTT:
            case Enum.Orientation.TTB:
                //3. Create Axis with scale and selected format
                this.createCombinedAxisVertical(configObject, svgContainer);
                break;
        }

        this.showTickNumber(svgContainer, configObject.showTickNumbers);

        return svgContainer;
    };
    UtilsAxis.updateCombinedAxis = function updateCombinedAxis(configObject) {
        var svgContainer = d3.select(configObject.elem).select('svg').attr('height', configObject.height).attr('width', configObject.width);
        svgContainer.selectAll('g').remove();
        //2. Check which Axis should be created
        switch (configObject.orientation) {
            case Enum.Orientation.LTR:
            case Enum.Orientation.RTL:
                //3. Create Axis with scale and selected format
                this.createCombinedAxisHorizontal(configObject, svgContainer);
                break;
            case Enum.Orientation.BTT:
            case Enum.Orientation.TTB:
                //3. Create Axis with scale and selected format
                this.createCombinedAxisVertical(configObject, svgContainer);
                break;
        }

        this.showTickNumber(svgContainer, configObject.showTickNumbers);

        return svgContainer;
    };

    UtilsAxis.createCombinedAxisHorizontal = function createCombinedAxisHorizontal(configObject, svgContainer) {
        var axis;
        switch (configObject.tickPosition) {
            case Enum.TickStyle.NONE:
                //no appending of axis needed.
                break;
            case Enum.TickStyle.TOP:
                //1. create AxisTop
                axis = this.createAxisTop(configObject.scale, configObject.limitMin, configObject.limitMax, configObject.majorTicks, configObject.format);
                //1. append axis on position
                this.appendAxisHorizontal(svgContainer, axis, (configObject.height / 2) - configObject.scaleOffset);
                break;
            case Enum.TickStyle.BOTTOM:
                //1. create AxisBottom
                axis = this.createAxisBottom(configObject.scale, configObject.limitMin, configObject.limitMax, configObject.majorTicks, configObject.format);
                //2. Append Axis on Position
                this.appendAxisHorizontal(svgContainer, axis, (configObject.height / 2) + configObject.scaleOffset);
                break;
            case Enum.TickStyle.TOPBOTTOM:
                //1. create AxisTop
                axis = this.createAxisTop(configObject.scale, configObject.limitMin, configObject.limitMax, configObject.majorTicks, configObject.format);
                //2. Append Axis on Position
                this.appendAxisHorizontal(svgContainer, axis, (configObject.height / 2) - configObject.scaleOffset);
                //3. create AxisBottom
                axis = this.createAxisBottom(configObject.scale, configObject.limitMin, configObject.limitMax, configObject.majorTicks, configObject.format);
                //4. Append Axis on Position
                this.appendAxisHorizontal(svgContainer, axis, (configObject.height / 2) + configObject.scaleOffset);
                break;
        }
    };

    UtilsAxis.createCombinedAxisVertical = function createCombinedAxisVertical(configObject, svgContainer) {
        var axis;
        switch (configObject.tickPosition) {
            case Enum.TickStyle.NONE:
                //no appending of axis needed.
                break;
            case Enum.TickStyle.TOP:
                //1. create AxisLeft
                axis = this.createAxisLeft(configObject.scale, configObject.limitMin, configObject.limitMax, configObject.majorTicks, configObject.format);
                //2. Append Axis on Position
                this.appendAxisVertical(svgContainer, axis, (configObject.width / 2) - configObject.scaleOffset);
                break;
            case Enum.TickStyle.BOTTOM:
                //1. create AxisRight
                axis = this.createAxisRight(configObject.scale, configObject.limitMin, configObject.limitMax, configObject.majorTicks, configObject.format);
                //2. Append Axis on Position
                this.appendAxisVertical(svgContainer, axis, (configObject.width / 2) + configObject.scaleOffset);
                break;
            case Enum.TickStyle.TOPBOTTOM:
                //1. create AxisLeft
                axis = this.createAxisLeft(configObject.scale, configObject.limitMin, configObject.limitMax, configObject.majorTicks, configObject.format);
                //2. Append Axis on Position
                this.appendAxisVertical(svgContainer, axis, (configObject.width / 2) - configObject.scaleOffset);
                //3. create AxisRight
                axis = this.createAxisRight(configObject.scale, configObject.limitMin, configObject.limitMax, configObject.majorTicks, configObject.format);
                //4. Append Axis on Position
                this.appendAxisVertical(svgContainer, axis, (configObject.width / 2) + configObject.scaleOffset);
                break;
        }
    };

    function _calculateValues(limitMin, limitMax, majorTicks) {
        var values = [];
        var range = limitMax - limitMin;


        if (majorTicks === 0) {
            values = [];
        } else if (majorTicks === 1) {
            values = [(range / 2) + limitMin];
        } else {
            var factor = range / (majorTicks - 1);
            for (var i = 0; i < majorTicks; i += 1) {
                values.push((limitMin) + ((factor) * i));
            }
        }

        return values;
    }


    return UtilsAxis;
});