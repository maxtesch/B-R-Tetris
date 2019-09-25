define(function () {

    'use strict';

    var TrackView = function (props, parent, self) {
        if (self === undefined) {
            this.create(props, parent);
            this.render(props);
            return this;
        } else {
            self.render(props);
            return self;
        }
    };

    var p = TrackView.prototype;

    p.create = function (props, parent) {
        if (props.additionalId !== undefined) {
            this.id = parent[0].id + '_TrackView_' + props.additionalId;
        } else {
            this.id = parent[0].id + '_TrackView';
        }

        this.el = $('<div id="' + this.id + '"></div>');
        this.el.addClass("TrackView");

        if (props.additionalClass !== '' || props.additionalClass !== undefined) {
            this.el.addClass(props.additionalClass);
        }
        parent.append(this.el);
    };

    p.render = function render(props) {
        this.el.css('height', props.height);
        this.el.css('left', props.left);
        this.el.css('top', props.top);
        this.el.css('width', props.width);
    };

    p.dispose = function dispose() {

    };

    return TrackView;

});