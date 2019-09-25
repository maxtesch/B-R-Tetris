define(['widgets/brease/common/libs/redux/utils/UtilsAxis'],function (UtilsAxis) {

    'use strict';

    var TrackView = function (props, parent, self) {
        if (self === undefined) {
            this.create(props, parent);
            this.render(props, parent);
        } else {
            self.render(props, parent);
        }
        this.props = props;
    };

    var p = TrackView.prototype;

    p.create = function (props, parent) {
        var svgContainer = UtilsAxis.createCombinedAxis(props);
        this.el = parent.find('svg.Axis');
        this.el.addClass('AxisView');
    };

    p.render = function render(props, parent) {
        UtilsAxis.updateCombinedAxis(props);

    };

    p.dispose = function dispose() {
        
    };

    return TrackView;

});