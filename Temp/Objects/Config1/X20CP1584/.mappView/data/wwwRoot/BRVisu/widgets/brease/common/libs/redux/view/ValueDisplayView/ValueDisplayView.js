define(['brease/enum/Enum'],function (Enum) {

    'use strict';

    var ValueDisplayView = function (props, parent, self) {
        if (self === undefined) {
            this.create(props, parent);
            this.render(props);
            return this;
        } else {
            self.render(props);
            return self;
        }
    };

    var p = ValueDisplayView.prototype;

    p.create = function (props, parent) {
        this.el = $('<output></output>');
        this.el.addClass("ValueDisplayView");
        this.addElements(props);
        parent.append(this.el);
    };


    p.render = function render(props) {

        this.zIndex(props);

        this.visible(props);

        this.showUnit(props);

        this.orientation(props);

        this.ellipsis(props);

        this.position(props);

        this.updateElements(props);


    };

    p.position = function (props) {

        if (props.ellipsis === true || props.ellipsis === undefined) {
            this.el.css('width', props.width);
        } else {
            this.el.css('width', 'auto');
        }

        if (props.left !== undefined) {
            this.el.css('left', props.left);
            this.el.css('right', 'initial');
        }

        if (props.right !== undefined) {
            this.el.css('right', props.right);
            this.el.css('left', 'initial');
        }

        this.el.css('height', props.height);
        this.el.css('top', props.top);
    };

    p.ellipsis = function (props) {
        if (props.ellipsis === true) {
            this.el.addClass('ellipsis');
        } else {
            this.el.removeClass('ellipsis');
        }
    };

    p.zIndex = function (props) {
        if (props.selected !== undefined && props.selected) {
            this.el.css('z-index', 5);
        } else {
            this.el.css('z-index', 0);
        }
    };

    p.visible = function (props) {
        if (props.visible === true) {
            this.el.removeClass('remove');
        } else {
            this.el.addClass('remove');
        }
    };

    p.orientation = function (props) {
        if (props.orientation === Enum.Orientation.LTR || props.orientation === Enum.Orientation.RTL) {
            this.el.addClass('horizontal');
        } else if (props.orientation === Enum.Orientation.BTT || props.orientation === Enum.Orientation.TTB) {
            this.el.addClass('vertical');
        }

    };

    p.addElements = function addElements(props) {
        this.outputValEl = $('<span/>').attr('class', 'valueOutput').text(props.value),
        this.outputUnitEl = $('<span/>').attr('class', 'unitOutput').text(props.unitSymbol),
        this.outputArrowEl = $('<span/>').attr('class', 'arrowOutput');

        this.el.append([this.outputValEl, this.outputUnitEl, this.outputArrowEl]);
    };

    p.showUnit = function (props) {
        if (props.showUnit === true) {
            this.outputUnitEl.removeClass('remove');
        } else {
            this.outputUnitEl.addClass('remove');
        }
    };

    p.updateElements = function (props) {
        this.outputValEl.text(props.value);
        this.outputUnitEl.text(props.unitSymbol);
    };

    p.dispose = function dispose() {
        this.el.removeClass('horizontal vertical');
    };

    return ValueDisplayView;

});