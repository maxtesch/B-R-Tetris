define(['widgets/brease/common/libs/wfUtils/UtilsImage'], function (UtilsImage) {

    'use strict';

    /**
    * @class widgets.brease.common.libs.ImageHandling
    */

    var ImageHandling = {};

    /*
    * The helpers functions should not be directly used from the Module.
    * If you need the Utils, require them directly in your widget, module
    * They are just placed inside the helper object to have a better testability
    */
    ImageHandling.helpers = {
        utilsImage: UtilsImage
    };

    ImageHandling.setImage = function (image, callBackFn) {
        var tag;
        if (ImageHandling.helpers.utilsImage.isStylable(image)) {
            //image is SVG
            tag = ImageHandling.createSvgTag();
            if (this.imageDeferred !== undefined) {
                if (this.imageDeferred.state() === 'pending') {
                    this.imageDeferred.reject();
                }
            }
            this.imageDeferred = ImageHandling.helpers.utilsImage.getInlineSvg(image);
            this.imageDeferred.done(function (svgElement) {
                tag.replaceWith(svgElement);
                tag = svgElement;
                tag.removeClass('remove');
                callBackFn(tag);
            });
        } else {
            //image is NOT SVG
            if (this.imageDeferred !== undefined) {
                this.imageDeferred.reject();
            }

            tag = ImageHandling.createImgTag();
            tag.attr('src', image);
            if (image !== undefined && image !== '') {
                tag.removeClass('remove');
            }
            callBackFn(tag);

        }
    };

    ImageHandling.createImgTag = function () {
        return $('<img/>').addClass('remove');
    };

    ImageHandling.createSvgTag = function () {
        return $('<svg/>').addClass('remove');
    };

    ImageHandling.createImgSvgTags = function () {
        var obj = {
            imgEl: ImageHandling.createImgTag(),
            svgEl: ImageHandling.createSvgTag()
        };
        return obj;
    };

    function ImageHandlingFn(){
        return {
            setImage: ImageHandling.setImage,
            createImgTag: ImageHandling.createImgTag,
            createSvgTag: ImageHandling.createSvgTag,
            createImgSvgTags: ImageHandling.createImgSvgTags
        };
    }

    return ImageHandlingFn;

});