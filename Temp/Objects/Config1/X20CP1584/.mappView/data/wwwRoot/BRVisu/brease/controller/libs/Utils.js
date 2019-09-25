define(['brease/controller/objects/PageTypes'], function (PageTypes) {
    /*jshint evil:true*/
    'use strict';

    /**
    * @class brease.controller.libs.Utils
    * @extends Object
    * @singleton
    */

    var stylePattern = new RegExp('.*_style_.*');

    return {

        findLoaders: function (elem) {
            var loaders = document.querySelectorAll('#' + elem.id + ' .systemContentLoader'),
                length = loaders.length;
            if (length > 0) {
                var ret = new Array(length);
                for (var i = 0; i < length; i += 1) {
                    ret[length - (i + 1)] = loaders[i];
                }
                return ret;
            } else {
                return [];
            }
        },

        resetContentControls: function (elem) {
            var elems = document.querySelectorAll('#' + elem.id + ' .breaseContentControl');

            for (var i = 0; i < elems.length; i += 1) {
                brease.callWidget(elems[i].id, 'reset');
            }
        },

        setPageStyle: function (style, container, type) {

            var $el = $(container), //container is either a HTMLElement or an id-selector
                styleClass = 'system_brease_' + type + '_style_' + style;

            if (type === PageTypes.DIALOG) {
                $el = $el.closest('[data-brease-widget="widgets/brease/DialogWindow"]');
            }
            var classList = $el[0].classList;

            if (classList.contains(styleClass) === false) {

                for (var i in classList) {
                    if (stylePattern.test(classList[i])) {
                        $el.removeClass(classList[i]);
                    }
                }
                $el.addClass(styleClass);
            }
        },

        appendHTML: function (elem, html) {
            if (elem) {
                elem.innerHTML = html;
                var scripts = elem.querySelectorAll('script');
                for (var i = 0; i < scripts.length; i += 1) {

                    /* eslint-disable no-unused-vars, no-eval*/
                    eval(scripts[i].textContent);
                    /* eslint-enable no-unused-vars, no-eval*/
                    scripts[i].parentNode.removeChild(scripts[i]);
                }
            }
        },

        injectCSS: function (css) {
            var head = document.getElementsByTagName('head')[0];
            var style = document.createElement('style');
            style.textContent = css;
            head.appendChild(style);
        }

    };

});
