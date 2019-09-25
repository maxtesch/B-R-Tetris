define(['brease/events/BreaseEvent', 'libs/d3/d3'], function (BreaseEvent, d3) {

    'use strict';

    var ThumbView = function (props, parent, self) {
        if (self === undefined) {
            this.create(props, parent);
            this.render(props);
            return this;
        } else {
            self.render(props);
            return self;
        }
    };

    var p = ThumbView.prototype;

    p.create = function render(props, parent) {
        if (props.additionalId !== undefined) {
            this.id = parent[0].id + '_Thumb_' + props.additionalId;
        } else {
            this.id = parent[0].id + '_Thumb';
        }

        this.el = $('<div id="' + this.id + '"></div>');
        if (props.additionalClass !== undefined) {
            this.el.addClass(props.additionalClass);
        }
        this.el.addClass("ThumbView");
        this.el.append('<img/>');

        parent.append(this.el);
    };

    p.render = function (props) {

        if (props.thumbImage !== undefined && props.thumbImage !== "") {
            this.el.find('img').attr('src', props.thumbImage).show();
        } else {
            this.el.find('img').hide();
        }

        this.el.css('left', props.left);
        this.el.css('top', props.top);
        this.el.css('height', props.thumbSize);
        this.el.css('width', props.thumbSize);
        if (props.selected !== undefined && props.selected) {
            this.el.css('z-index', 5);
        } else {
            this.el.css('z-index', 0);
        }
        this.dragBehavior(props);
    };

    p.dragBehavior = function (props) {
        if (brease.config.editMode || !props.enabled) { return; }

        this.mouseMove = props.onMouseMove;
        this.mouseUp = props.onMouseUp;
        this.mouseDown = props.onMouseDown;

        if (props.selected) {
            $(document.body).on(BreaseEvent.MOUSE_MOVE, props.onMouseMove);
            $(document.body).on(BreaseEvent.MOUSE_UP, props.onMouseUp);
        } else {
            this.el.on(BreaseEvent.MOUSE_DOWN, props.onMouseDown);
        }
    };

    p.dispose = function dispose() {
        $(document.body).off(BreaseEvent.MOUSE_MOVE, this.mouseMove);
        $(document.body).off(BreaseEvent.MOUSE_UP, this.mouseUp);
        this.el.off(BreaseEvent.MOUSE_DOWN, this.mouseDown);
    };

    return ThumbView;

});