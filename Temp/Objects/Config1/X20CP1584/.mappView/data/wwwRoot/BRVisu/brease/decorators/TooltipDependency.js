define(['brease/core/Decorator', 'brease/core/Utils', 'brease/events/BreaseEvent', 'brease/enum/Enum', 'brease/controller/PopUpManager'], function (Decorator, Utils, BreaseEvent, Enum, PopUpManager) {

    'use strict';

    var TooltipDependency = function TooltipDependency() {
            this.initType = Decorator.TYPE_PRE;
        },
        dependency = 'tooltip',
        changeHandler = 'tooltipChangeHandler';

    /**
    * @class brease.decorators.TooltipDependency
    * @extends brease.core.Decorator
    * #Description
    * A decorator class to add functionality of tooltip dependency to widgets.
    * ##Example:
    *
    *     define(function (require) {
    *        var SuperClass = require('brease/core/BaseWidget'),
    *            TooltipDependency = require('brease/decorators/TooltipDependency'),
    *            [...]
    *
    *        return TooltipDependency.decorate(WidgetClass);
    *     });
    *
    *
    * @iatMeta studio:visible
    * false
    */

    /**
    * @method decorate
    * decorate a widget class with functionality of user dependency
    * @param {brease.core.WidgetClass} widgetClass
    * @param {Boolean} initialDependency Initial dependency of widget instances
    * @return {brease.core.WidgetClass} returns decorated WidgetClass
    */
    TooltipDependency.prototype = new Decorator();
    TooltipDependency.prototype.constructor = TooltipDependency;

    var instance = new TooltipDependency();

    /**
    * @property {Object} methodsToAdd
    * @property {Function} methodsToAdd.setTooltipDependency
    * @property {Boolean} methodsToAdd.setTooltipDependency.flag
    * Enable or disable tooltip dependency; dependent widgets listen to tooltip changes and execute method *tooltipChangeHandler* on changes
    */
    instance.methodsToAdd = {

        init: function (initialDependency) {
            this.dependencies[dependency] = {
                state: Enum.Dependency.INACTIVE,
                stored: {
                    tooltipModeActive: false,
                    arrowPosition: 'n'
                },
                suspend: suspend.bind(this),
                wake: wake.bind(this)
            };
            if (initialDependency === true) {
                this.setTooltipDependency(initialDependency);
            }
            this.tooltipIndicatorAttached = false;
            this.tooltipContentAttached = false;

            if (this.dependencies[dependency].stored.tooltipModeActive) {
                this.activateTooltipMode();
            }
        },
        tooltipChangeHandler: function () {
            if (_hasTooltip.call(this) && this.tooltipContentAttached) {
                _setTooltipContent.apply(this, [_parseTooltip(this.settings.tooltip)]);

                _positionTooltipContent(this.tooltipElements, this.tooltipIndicator, { x: 'left', y: 'top' });
            }
        },
        setTooltip: function (tooltip) {
            this.settings.tooltip = tooltip;
        },
        getTooltip: function () {
            return this.settings.tooltip;
        },
        showTooltip: function () {
            this.activateTooltipMode();
        },
        activateTooltipMode: function () {
            if (_hasTooltip.call(this) && this.isHidden === false) {
                _appendTooltipToDOM.call(this); // _positionTooltipContent included
                _positionTooltipIndicator(this.tooltipIndicator, this.tooltipElements, this.el, { x: 'right', y: 'top' }, true);

                if (this.dependencies[dependency]) {
                    if (!this.dependencies[dependency].stored.tooltipModeActive) {
                        this.dependencies[dependency].stored.tooltipModeActive = true;
                        // dispatchn in der action
                        document.body.dispatchEvent(new CustomEvent(BreaseEvent.TOOLTIPMODE_ACTIVE));
                    }
                }
            }
        },
        // called when exiting from tooltip mode
        deactivateTooltipMode: function () {
            _detachTooltipIndicator.call(this);
            _detachTooltipContent.call(this);
            if (this.dependencies[dependency]) {
                if (this.dependencies[dependency].stored.tooltipModeActive) {
                    this.dependencies[dependency].stored.tooltipModeActive = false;
                    document.body.dispatchEvent(new CustomEvent(BreaseEvent.TOOLTIPMODE_INACTIVE));
                }
            }
        },

        setTooltipDependency: function (flag) {
            if (flag === true) {
                setState.call(this, Enum.Dependency.ACTIVE);
            } else {
                setState.call(this, Enum.Dependency.INACTIVE);
            }
        },

        dispose: function () {
            this.dependencies[dependency] = null;
            removeListener.call(this);
            brease.bodyEl.off(BreaseEvent.MOUSE_DOWN, this._bind(_onHMIOperation));
            this.deactivateTooltipMode();
            this.tooltipIndicatorAttached = null;
            this.tooltipContentAttached = null;

            this.tooltipElements = null;
            this.tooltipIndicator = null;
            this.tooltipIndicatorInner = null;
            this.tooltipContentOutterWrapper = null;
            this.tooltipContent = null;
            this.tooltipContentText = null;
            this.tooltipContentArrow = null;
        }

    };

    function suspend() {
        if (this.dependencies[dependency].state === Enum.Dependency.ACTIVE) {

            this.dependencies[dependency].stored.key = brease.language.getCurrentLanguage();
            this.dependencies[dependency].stored.version = brease.language.getCurrentVersion();

            setState.call(this, Enum.Dependency.SUSPENDED);
        }
    }

    function wake(e) {
        if (this.dependencies[dependency].state === Enum.Dependency.SUSPENDED) {
            setState.call(this, Enum.Dependency.ACTIVE);
            if (this.dependencies[dependency].stored.key !== brease.language.getCurrentLanguage() ||
                this.dependencies[dependency].stored.version !== brease.language.getCurrentVersion()) {
                this[changeHandler](e);
            }
        }
    }

    function setState(state) {
        //console.log('%c' + this.elem.id + '.dependencies[' + dependency + '].state=' + state, 'color:#cccc00');
        this.dependencies[dependency].state = state;
        if (state === Enum.Dependency.ACTIVE) {
            addListener.call(this);
        } else {
            removeListener.call(this);
            this.deactivateTooltipMode();
        }
    }

    // add listeners to framework events which have an impact on the tooltip (e.g.: language change)
    function addListener() {
        document.body.addEventListener(BreaseEvent.LANGUAGE_CHANGED, this._bind(changeHandler));
    }

    function removeListener() {
        document.body.removeEventListener(BreaseEvent.LANGUAGE_CHANGED, this._bind(changeHandler));
    }

    // returns wether the widget has a valid tooltip configured and is allowed to display the tooltip. (visibility is also taken into account)
    function _hasTooltip() {
        return (this.settings.tooltip.length > 0) &&
            (this.settings.parentContentId &&
                this.settings.parentContentId !== brease.settings.globalContent);
    }

    // creates the element for the tooltip indicator
    function _createTooltipIndicator() {
        this.tooltipIndicator = $('<div class="breaseTooltipIndicator system_brease_Tooltip_style_default" data-source="' + this.elem.id + '" style="box-sizing:border-box;width:auto; height:auto; position:absolute !important; z-index:1;"></div>');
        this.tooltipIndicatorInner = $('<div class="breaseTooltipIndicatorInner"></div>');
        this.tooltipIndicator.append(this.tooltipIndicatorInner);
    }

    // creates the container element for the tooltip content
    function _createTooltipContent() {
        // style="visibility:visible; position:absolute; top:0, left:0, z-index:1;"
        this.tooltipContentOutterWrapper = $('<div class="breaseTooltipOutterWrapper system_brease_Tooltip_style_default" data-source="' + this.elem.id + '"></div>');
        this.tooltipContent = $('<div class="breaseTooltip n"></div>');
        this.tooltipContentText = $('<div class="textDiv breaseTooltipText"></div>');

        this.tooltipContentArrow = $('<div class="tooltip-arrow"></div>');
        this.tooltipContentArrowBorder = $('<div class="tooltip-arrow-border"></div>');
        this.tooltipContentArrowBackground = $('<div class="tooltip-arrow-background"></div>');

        this.tooltipContentArrow.append(this.tooltipContentArrowBorder);
        this.tooltipContentArrow.append(this.tooltipContentArrowBackground);

        this.tooltipContentOutterWrapper.append(this.tooltipContent);
        this.tooltipContentOutterWrapper.append(this.tooltipContentArrow);
        this.tooltipContent.append(this.tooltipContentText);

        this.tooltipElements = {
            tooltipIndicator: this.tooltipIndicator,
            tooltipIndicatorInner: this.tooltipIndicatorInner,
            tooltipContentOutterWrapper: this.tooltipContentOutterWrapper,
            tooltipContent: this.tooltipContent,
            tooltipContentText: this.tooltipContentText,
            tooltipContentArrow: this.tooltipContentArrow
        };
    }

    //******************************//
    //*** TOOLTIP EVENT HANDLING ***//
    //******************************//

    // add listeners to the tooltip indicator
    function _addTooltipListeners() {
        var widget = this;
        brease.bodyEl.on(BreaseEvent.MOUSE_DOWN, this._bind(_onHMIOperation));
        this.tooltipIndicator.on(BreaseEvent.CLICK, this._bind(_appendTooltipContent));
        // this.tooltipIndicator.on('mouseenter',this._bind(_appendTooltipContent));
        // this.tooltipIndicator.on('mouseleave',this._bind(_appendTooltipContent));
        this.tooltipIndicator.on(BreaseEvent.MOUSE_DOWN, function (e) {
            widget._handleEvent(e, true);
        });

        $(window).resize(function () {
            widget.deactivateTooltipMode();
        });
        $(window).on('mousewheel', function (e) {
            widget.deactivateTooltipMode();
        });
    }

    // executed when the HMI is operated while tooltip mode is active
    function _onHMIOperation(e) {
        var targetEl = $(e.target);
        if (!targetEl.hasClass('tooltipindicator') && !$.contains(this.tooltipContentOutterWrapper.get(0), e.target)) {
            brease.bodyEl.off(BreaseEvent.MOUSE_DOWN, this._bind(_onHMIOperation));
            this.deactivateTooltipMode();
        }
    }

    // remove listeners from the tooltip indicator
    function _removeTooltipListeners() {
        brease.bodyEl.off(BreaseEvent.MOUSE_DOWN, this._bind(_onHMIOperation));
        this.tooltipIndicator.off();
    }

    //*************************//
    //*** TOOLTIP INDICATOR ***//
    //*************************//

    // append tooltip indicator and tooltipContent to the DOM
    function _appendTooltipToDOM() {
        if (!this.tooltipIndicatorAttached) {
            _createTooltipIndicator.call(this);
            _addTooltipListeners.call(this);
            this.tooltipIndicatorAttached = true;
        }

        if (!this.tooltipContentAttached) {
            _createTooltipContent.call(this);
            _setTooltipContent.apply(this, [_parseTooltip(this.settings.tooltip)]);
        }
    }

    // tooltip indicator is positioned to the top right corner of the target element (widget)
    // the indicator is appended to the parent element of the widget in order to be hidden
    // when the widget is inside of a scrollable container
    function _positionTooltipIndicator(source, tooltipElements, target, position, inner) {
        inner = inner || false;
        position = position || { x: 'right', y: 'top' };
        var zoomFactor = Utils.getScaleFactor(target),
            rotation = target.css('transform').replace(/matrix|\(|\)/gi, '').split(','),
            cosX = rotation[0] !== 'none' ? rotation[0] : 1,
            sinX = rotation[1] || 0,
            targetClientRect = target.get(0).getBoundingClientRect(),
            targetRect = {
                w: (target.outerWidth() || targetClientRect.width) * zoomFactor,
                h: (target.outerHeight() || targetClientRect.height) * zoomFactor,
                left: target.get(0).offsetLeft,
                top: target.get(0).offsetTop
            },
            setOffset = function () {
                var el = $(this); // tooltipIndicator
                target.parent().append(el);
                var css = {
                        transform: target.css('transform'),
                        'transform-origin': target.css('transform-origin'),
                        'z-index': target.css('z-index') + 1
                    },
                    offset = { top: 0, left: 0 },
                    top = 0,
                    left = 0,
                    rect = {
                        w: el.outerWidth() * zoomFactor,
                        h: el.outerHeight() * zoomFactor
                    };
                el.css(css);

                if (inner) {
                    top = targetRect.top + (sinX * (targetRect.w - rect.w));
                    left = position.x === 'left' ? targetRect.left : targetRect.left + (cosX * (targetRect.w - rect.w));
                } else {
                    top = targetRect.top - rect.h;
                    top = (top < 0) ? (targetRect.top + targetRect.h) : top;
                    left = position.x === 'left' ? targetRect.left : targetRect.left + targetRect.w - rect.w;
                }

                // outter touch area is bigger then the inner area
                // position tooltipIndicator, so that inner area matches the edges of the widget
                // --> outter area overlaps to get a broader touch area
                offset.top = top - tooltipElements.tooltipIndicatorInner.get(0).offsetTop;
                offset.left = left + tooltipElements.tooltipIndicatorInner.get(0).offsetLeft;

                this.css(offset);
            };

        setOffset.call(tooltipElements.tooltipIndicator);
    }

    // resolves the rotate transformation and returns
    // sinAlpha and cosAlpha to position the tooltipIndicator on rotated
    // widgets
    //function _getElementRotation(el) {
    //    var transform,
    //        transformMatrix = [],
    //        rotation = { sinAlpha: 0, colAlpha: 1, transform: '' };

    //    return rotation;
    //}

    // remove tooltip indicator from the DOM
    function _detachTooltipIndicator() {
        if (this.tooltipIndicatorAttached) {
            _removeTooltipListeners.call(this);
            this.tooltipIndicator.detach();
            this.tooltipIndicatorAttached = false;
        }
    }

    //***********************//
    //*** TOOLTIP CONTENT ***//
    //***********************//

    // append tooltip content to the DOM
    // if the content is already appended it toggles between visible/hidden
    function _appendTooltipContent(e) {
        if (!_hasTooltip.call(this) || this.isHidden) {
            return;
        }
        if (e) {
            this._handleEvent(e, true);
        }
        if (!this.tooltipContentAttached) {
            this.tooltipContentAttached = true;
        } else {
            this.tooltipContentOutterWrapper.css('visibility') === 'hidden' ? this.tooltipContentOutterWrapper.css('visibility', 'visible') : this.tooltipContentOutterWrapper.css('visibility', 'hidden');
        }
        if (this.tooltipContentOutterWrapper.css('visibility') !== 'hidden') {
            _positionTooltipContent(this.tooltipElements, this.tooltipIndicator, { x: 'left', y: 'top' });
        }
    }

    // returns the data for the tooltip. resolves the textkey in case of a localizable text
    function _parseTooltip(tooltip) {
        if (brease.language.isKey(tooltip)) {
            return brease.language.getTextByKey(brease.language.parseKey(tooltip));
        } else {
            return tooltip;
        }
    }

    // set the content for the tooltip
    function _setTooltipContent(content) {
        //content = content.replace(/(\r\n|\n|\r)/gm, '<br/>');
        if (content.match(/(\r\n|\n|\r)/gm) !== null) {
            this.tooltipElements.tooltipContentText.css('white-space', 'pre');
        }

        this.tooltipContentText.text(content);
    }

    // boundaries of the appContainer are taken into account because the content is appended to
    // the document body
    function _positionTooltipContent(tooltipElements, target, position, inner) {
        var setOffset = function () {
            var transformFactor = _setZoom(tooltipElements.tooltipContentOutterWrapper);

            var tooltipIndicatorInnerRect = tooltipElements.tooltipIndicatorInner.get(0).getBoundingClientRect();
            var tooltipIndicatorInnerOffset = tooltipElements.tooltipIndicatorInner.offset();
            var tooltipIndicatorInner = {
                top: tooltipIndicatorInnerOffset.top,
                left: tooltipIndicatorInnerOffset.left,
                width: tooltipIndicatorInnerRect.width,
                height: tooltipIndicatorInnerRect.height
            };
            var tooltipContentArrowRect = tooltipElements.tooltipContentArrow.get(0).getBoundingClientRect();
            var middleIndicatorPosition = tooltipIndicatorInner.left + (tooltipIndicatorInner.width / 2);

            var offset = { top: 0, left: 0 };
            var translate = '-50%';

            var css = {
                'width': brease.appView.children().eq(0).width() + 'px',
                'max-width': (brease.appView.children().eq(0).width() * 0.5) + 'px',
                'z-index': PopUpManager.getHighestZindex() + 1
            };
            tooltipElements.tooltipContentOutterWrapper.css(css);

            // always calc after css
            var tooltipContentRect = tooltipElements.tooltipContent.get(0).getBoundingClientRect();
            var contentPlusArrowHeight = tooltipContentRect.height + tooltipContentArrowRect.height;

            // overlap left boundaries
            offset.left = middleIndicatorPosition;

            // limit border radius and
            // consider corner radius and move arrow away from the rounded edges
            var borderRadius = parseFloat(tooltipElements.tooltipContent.css('border-radius'));
            borderRadius = Math.min(borderRadius, 20);
            var cornerRadiusBalancing = borderRadius / 2;

            if (middleIndicatorPosition - (tooltipContentRect.width / 2) <= 0) {
                translate = ((tooltipElements.tooltipContentArrow.width() / 2) * -1) - cornerRadiusBalancing + 'px';
            } else {
                // overlap right boundaries
                if (middleIndicatorPosition - (tooltipContentRect.width / 2) + tooltipContentRect.width >= brease.appView.get(0).getBoundingClientRect().width) {
                    translate = ((tooltipElements.tooltipContent.outerWidth() - (tooltipElements.tooltipContentArrow.width() / 2)) * -1) + cornerRadiusBalancing + 'px';
                }
            }

            // overlap top boundaries
            offset.top = tooltipIndicatorInner.top - contentPlusArrowHeight;
            if (tooltipIndicatorInner.top - contentPlusArrowHeight <= 0) {
                tooltipElements.tooltipContentArrow.addClass('n');
                offset.top = tooltipIndicatorInner.top + tooltipIndicatorInner.height + tooltipContentArrowRect.height;
            }

            this.css(offset);

            var newStyle = {
                'borderRadius': borderRadius + 'px',
                'transform': 'translate(' + translate + ')'
            };
            tooltipElements.tooltipContent.css(newStyle);
        };
        brease.bodyEl.append(tooltipElements.tooltipContentOutterWrapper);
        setOffset.call(tooltipElements.tooltipContentOutterWrapper);
    }

    // detach tooltip content from the dom
    function _detachTooltipContent() {
        if (this.tooltipContentAttached) {
            this.tooltipContentOutterWrapper.detach();
            this.tooltipContentAttached = false;
        }
    }

    function _setZoom($el) {
        var page = brease.pageController.getCurrentPage('appContainer');
        var visuId = brease.pageController.getVisu4Page(page);

        var visu = brease.pageController.getVisuById(visuId),
            factor = 1;

        if (visu && visu.containerId) {
            var currentPage = brease.pageController.getPageById(brease.pageController.getCurrentPage(visu.containerId));
            if (currentPage) {
                var layoutDiv = document.querySelector('[data-brease-layoutid="' + currentPage.layout + '"][data-brease-pageId="' + currentPage.id + '"]');
                factor = Utils.getScaleFactor(layoutDiv);
            }
        }

        $el.css({ 'transform': 'scale(' + factor + ',' + factor + ')', 'transform-origin': '0 0' });

        return factor;
    }

    return instance;
});
