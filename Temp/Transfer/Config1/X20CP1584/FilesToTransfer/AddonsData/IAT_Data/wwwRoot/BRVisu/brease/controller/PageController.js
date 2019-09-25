define(['brease/events/BreaseEvent', 'brease/enum/Enum', 'brease/core/Utils', 'brease/controller/libs/Utils', 'brease/core/libs/Deferred', 'brease/model/VisuModel', 'brease/controller/libs/LoaderPool', 'brease/controller/libs/PageLogger', 'brease/controller/libs/LoadCycle', 'brease/controller/libs/ScrollManager', 'brease/controller/ZoomManager', 'brease/controller/libs/Areas', 'brease/controller/libs/Containers', 'brease/controller/libs/Themes', 'brease/controller/libs/LogCode', 'brease/controller/objects/Client', 'brease/controller/objects/PageTypes', 'brease/controller/objects/AssignTypes', 'brease/controller/objects/VisuStatus', 'brease/datatype/ZoomType', 'brease/objects/AreaInfo', 'brease/controller/Preloader'],
    function (BreaseEvent, Enum, CoreUtils, Utils, Deferred, VisuModel, LoaderPool, PageLogger, LoadCycle, ScrollManager, zoomManager, Areas, containers, Themes, LogCode, Client, PageTypes, AssignTypes, VisuStatus, ZoomType, AreaInfo, Preloader) {

        'use strict';

        /**
        * @class brease.controller.PageController
        * @extends Object
        * controls pages
        * @singleton
        */
        var PageController = {

                init: function init(runtimeService, config, ScrollManagerHelper) {
                    if (this.logger === undefined) {
                        brease.appElem.addEventListener(BreaseEvent.PAGE_CHANGE, _pageChangeRequest.bind(this));
                        this.logger = new PageLogger(this, config);
                    }

                    _visuModel = VisuModel.init(runtimeService, this.logger);
                    _loadCycle = new LoadCycle();
                    if (ScrollManagerHelper !== undefined) {
                        ScrollManager = ScrollManagerHelper;
                    }
                },

                reset: function () {
                    if (_loaderPool) { _loaderPool.dispose(); }
                },

                start: function start(visuId, rootContainer, cachingConfig) {
                    this.reset();
                    visuId = CoreUtils.ensureVisuId(visuId);
                    _loaderPool = new LoaderPool((cachingConfig) ? cachingConfig.cachingSlots : undefined);
                    document.body.removeEventListener(BreaseEvent.VISU_ACTIVATED, _visuActivatedListener);
                    Areas.injectDependencies(ScrollManager, rootContainer.id);
                    $.when(
                        _visuModel.activateVisu(visuId, { visuId: visuId, rootContainer: rootContainer, loaderPool: _loaderPool, splashScreenEl: $('#splashscreen').eq(0) })
                    ).then(_activateStartVisuSuccess, _activateStartVisuFailed);
                },

                swipeNavigation: function swipeNavigation(dir) {
                    var currentPageId = containers.getCurrentPage(this.rootContainer.id),
                        nav = _visuModel.findNav4page(currentPageId);

                    if (nav && nav.swipes && nav.swipes[currentPageId] && nav.swipes[currentPageId][dir]) {
                        PageController.loadPage(nav.swipes[currentPageId][dir], this.rootContainer);
                        return true;
                    } else {
                        return false;
                    }
                },

                /**
            * @method loadPage
            * load page in area
            * @param {String} pageId
            * @param {HTMLElement} container
            * @return {Object}
            * @return {Boolean} return.success
            * @return {String} return.code
            */
                loadPage: function loadPage(pageId, container) {
                    var response;
                    if (!container) {
                        response = { success: false, code: LogCode.CONTAINER_NOT_FOUND };
                        this.logger.log(response.code, { pageId: pageId, isStartPage: (_visuModel.startPageId === pageId) });
                    } else {
                    //console.log('%cPageController.loadPage(' + pageId + ',' + container.id + ')', 'color:#00cccc;');
                        var page = _visuModel.getPageById(pageId);
                        if (page !== undefined) {
                            containers.setLatestRequest(container.id, pageId);
                            response = _loadPage.call(this, page, container);
                        } else {
                            response = { success: false, code: LogCode.PAGE_NOT_FOUND };
                            this.logger.log(response.code, { pageId: pageId, isStartPage: (_visuModel.startPageId === pageId) });
                        }
                    }
                    return response;
                },

                /**
            * @method loadDialog
            * load dialog in area
            * @param {String} dialogId
            * @param {HTMLElement} container
            */
                loadDialog: function loadDialog(dialogId, container) {
                //console.log("loadDialog:", dialogId, (container) ? container.id : 'undefined', _visuModel);
                    var dialog = _visuModel.getDialogById(dialogId);
                    if (dialog !== undefined) {
                        containers.setLatestRequest(container.id, dialogId);
                        _loadPage.call(this, dialog, container);
                        return dialog;
                    } else {
                        this.logger.log(LogCode.DIALOG_NOT_FOUND, { dialogId: dialogId });
                    }
                },

                /**
            * @method loadContentInArea
            * load content in area
            * @param {String} contentId
            * @param {String} areaId
            * @param {String} pageId
            * @return {Object}
            * @return {Boolean} return.success
            * @return {String} return.code
            */
                loadContentInArea: function loadContentInArea(contentId, areaId, pageId, callbackInfo, force) {
                //console.log('%cPageController.loadContentInArea:contentId=' + contentId + ',areaId=' + areaId + ',pageId=' + pageId, 'color:#00dddd');
                    var instance = this,
                        def = new Deferred('singleShot', [callbackInfo]),
                        response = _getTargetForContent({ contentId: contentId, areaId: areaId, pageId: pageId, pageType: PageTypes.PAGE }, force);

                    if (response.success) {
                        _loadContent(response.data.area, response.data.assignment).done(function _loadContentSuccess(loaderId, contentChange, area, assignment) {
                            if (area.info) {
                                var content = _visuModel.getContentById(assignment.contentId);
                                if (content) {
                                    var zoomFactor = _zoomBaseContent(loaderId, {
                                        width: content.width, height: content.height
                                    }, {
                                        width: area.info.width, height: area.info.height
                                    }, assignment.zoomMode);

                                    area.setProperties({ width: content.width, height: content.height }, assignment, zoomFactor, contentChange);
                                }
                                _resolve.call(instance, def, true);
                            }

                        }).fail(function _loadContentFail() {

                            _resolve.call(instance, def, false);
                        });

                    } else {
                        _resolve.call(instance, def, response.success, response.statusCode, response.data);
                    }

                    return def;
                },

                /**
           * @method loadContentInDialogArea
           * load content in area of a dialog
           * @param {String} contentId
           * @param {String} areaId
           * @param {String} dialogId
           * @return {Object}
           * @return {Boolean} return.success
           * @return {String} return.code
           */
                loadContentInDialogArea: function loadContentInDialogArea(contentId, areaId, dialogId) {
                //console.log('%cPageController.loadContentInDialogArea:contentId=' + contentId + ',areaId=' + areaId + ',dialogId=' + dialogId, 'color:#00dddd');
                    var instance = this,
                        def = new Deferred('singleShot'),
                        response = _getTargetForContent({ contentId: contentId, areaId: areaId, pageId: dialogId, pageType: PageTypes.DIALOG });

                    if (response.success) {
                        _loadContent(response.data.area, response.data.assignment).done(function _loadContentSuccess(loaderId, contentChange, area, assignment) {
                        //console.log('_loadContent.done:', loaderId, contentChange, area, assignment);
                            var content = _visuModel.getContentById(assignment.contentId);
                            if (content) {
                                var zoomFactor = _zoomBaseContent(loaderId, {
                                    width: content.width, height: content.height
                                }, {
                                    width: area.info.width, height: area.info.height
                                }, assignment.zoomMode);
                                area.setProperties({ width: content.width, height: content.height }, assignment, zoomFactor, contentChange);
                            }
                            _resolve.call(instance, def, true);

                        }).fail(function _loadContentFail() {

                            _resolve.call(instance, def, false);
                        });

                    } else {
                        _resolve.call(instance, def, response.success, response.statusCode, response.data);
                    }

                    return def;
                },

                loadContentInWidget: function loadContentInWidget(widgetId, contentId, parentContentId, zoomMode, size, $LayoutArea, force) {

                    var areaId = 'A0',
                        layoutId = widgetId,
                        pageId = 'virtualPage_' + widgetId,
                        areaInfo = new AreaInfo(areaId, { width: size.realWidth, cssWidth: size.cssWidth, height: size.realHeight, cssHeight: size.cssHeight, top: 0, left: 0 }),
                        parentContent = _visuModel.getContentById(parentContentId),
                        areaObj;

                    if ($LayoutArea.length === 0) {
                        _visuModel.addLayout(layoutId, { id: layoutId, areas: {} });
                        _visuModel.addArea(layoutId, areaInfo);
                        _visuModel.addPage(pageId, { id: pageId, layout: layoutId, type: 'Page', visuId: (parentContent) ? parentContent.visuId : _visuModel.startVisuId, assignments: {} });
                        _visuModel.addAssignment(areaId, pageId, { areaId: areaId, contentId: contentId, type: 'Content', zoomMode: zoomMode });
                        containers.addContainer(widgetId, { currentPage: pageId });

                        areaObj = Areas.add(widgetId, layoutId, areaInfo, 'Page');
                        document.getElementById(widgetId).appendChild(areaObj.div);
                    } else {
                        areaObj = Areas.getArea(widgetId, layoutId, areaId, 'Page');
                        areaObj.$div = $LayoutArea;
                        areaObj.div = $LayoutArea[0];
                        areaObj.$innerBox = $LayoutArea.find(' > .ScrollBox');
                        areaObj.innerBox = areaObj.$innerBox[0];
                        areaObj.info = areaInfo;
                    }

                    var def = new Deferred('singleShot', (areaObj) ? [areaObj.id] : undefined);

                    if (_loadCycle.inProgress) {
                        _loadContentInAreaQueue.add(contentId, areaId, pageId, def);
                        _loadCycle.addEventListener('CycleFinished', _loadContentInAreaQueue.process.bind(_loadContentInAreaQueue));
                    } else {
                        PageController.loadContentInArea(contentId, areaId, pageId, null, force).done(function (success) {
                            def.resolve(success);
                        });
                    }

                    return def;
                },

                disposeContentInWidget: function (widgetId) {
                    var areaId = 'A0',
                        layoutId = widgetId,
                        pageId = 'virtualPage_' + widgetId,
                        areaObj = Areas.getArea(widgetId, layoutId, areaId, 'Page');

                    if (areaObj) {
                        if (areaObj.div) {
                            brease.pageController.emptyContainer(areaObj.div);
                        }
                        Areas.remove(areaObj.id);
                    }
                    _visuModel.removeLayout(layoutId);
                    _visuModel.removePage(pageId);
                    containers.removeContainer(widgetId);

                },

                /**
            * @method getContentScrollOffset
            * get scrollOffset of a content
            * @param {ContentReference} contentId
            * @return {Object}
            * @return {Integer} return.x offset of content scroll box in horizontal direction (negative value <= 0)
            * @return {Integer} return.y offset of content scroll box in vertical direction (negative value <= 0)
            */
                getContentScrollOffset: function (contentId) {
                    var areaDiv = $('[data-brease-contentid="' + contentId + '"]').closest('.LayoutArea');
                    if (areaDiv.length > 0) {
                        return Areas.scrollManager.getScrollPosition(areaDiv[0]);
                    } else {
                        console.iatWarn('getContentScrollOffset: no layout found for content ' + contentId);
                        return undefined;
                    }
                },

                /**
            * @method getContentsOfPage
            * get contents of a certain page
            * @param {string} pageId
            * @param {string} pageType
            * @return {Content[]}
            */
                getContentsOfPage: function (pageId, pageType) {
                    return _contentsToLoad(pageId, pageType);
                },

                /**
            * @method setTheme
            * set Theme for Visualisation
            * @param {String} themeId
            */
                setTheme: function setTheme(themeId) {
                    if (themeId !== undefined) {
                        if (_visuModel.getThemes().indexOf(themeId) === -1) {
                            this.logger.log(LogCode.THEME_NOT_FOUND, { themeId: themeId });
                            return;
                        }
                        Themes.setTheme(themeId);
                    }
                },

                themeId2Url: function themeId2Url(themeId) {
                    return Themes.themeId2Url(themeId);
                },

                /**
            * @method getCurrentTheme
            * @return {String} themeId
            */
                getCurrentTheme: function getCurrentTheme() {
                    return Themes.getCurrentTheme();
                },

                getThemes: function getThemes() {
                    return _visuModel.getThemes();
                },

                emptyContainer: function emptyContainer(container) {
                //console.log('emptyContainer:', container);
                    if (container && container.childNodes && container.id) {
                        _emptyContainer.call(this, container);
                        containers.resetCurrentPage(container.id);
                    }
                },
                /**
            * @method getNavById
            * @param {String} id id of navigation
            * @return {Object} navigation navigation object
            */
                getNavById: function getNavById(id) {
                    return _visuModel.getNavById(id);
                },
                /**
            * @method getPageById
            * @param {String} id id of page
            * @return {Object}
            */
                getPageById: function getPageById(pageId) {
                    return _visuModel.getPageById(pageId);
                },
                getLayoutById: function getLayoutById(id) {
                    return CoreUtils.deepCopy(_visuModel.getLayoutById(id));
                },
                /**
            * @method getDialogById
            * @param {String} id id of dialog
            * @return {Object}
            */
                getDialogById: function getDialogById(id) {
                    return _visuModel.getDialogById(id);
                },
                getVisuById: function getVisuById(id) {
                    return _visuModel.getVisuById(id);
                },
                /**
            * @method getCurrentPage
            * @param {String} containerId id of area
            * @return {String} pageId id of page
            */
                getCurrentPage: function getCurrentPage(containerId) {
                    return containers.getCurrentPage(containerId);
                },
                /**
            * @method getVisu4Page
            * @param {String} pageId id of page
            * @return {String} visuId id of page
            */
                getVisu4Page: function getVisu4Page(pageId) {
                    if (_visuModel.getPageById(pageId) !== undefined) {
                        return _visuModel.getPageById(pageId).visuId;
                    } else if (_visuModel.getDialogById(pageId) !== undefined) {
                        return _visuModel.getDialogById(pageId).visuId;
                    } else {
                        return undefined;
                    }
                },
                /**
            * @method getContentUrlById
            * @param {String} contentId id of content
            * @return {String} url url of content
            */
                getContentUrlById: function getContentUrlById(contentId) {
                    var url,
                        content = _visuModel.getContentById(contentId);
                    if (content) {
                        url = content.path;
                    }
                    return url;
                },

                /**
            * @method getLoaderForElement
            * get closest ContentLoader for an HTMLElement
            * @param {HTMLElement/Selector} elem
            */
                getLoaderForElement: function getLoaderForElement(elem) {

                    return $(elem).closest('.systemContentLoader')[0];
                },

                /**
            * @method getContentId
            * get contentId for an HTMLElement
            * @param {HTMLElement/Selector} elem
            */
                getContentId: function getContentId(elem) {
                    var contentId,
                        loaderElem = this.getLoaderForElement(elem);
                    if (loaderElem !== undefined) {
                        contentId = loaderElem.getAttribute('data-brease-contentid');
                    }
                    return contentId;
                },

                getLayoutDivId: function getLayoutDivId(containerId, layoutId) {
                    return 'Layout_' + ((this.rootContainer.id === containerId) ? '' : containerId + '_') + layoutId;
                },

                getAreaDivId: function getAreaDivId(containerId, layoutId, areaId, pageType) {
                    return Areas.getAreaDivId(containerId, layoutId, areaId, pageType);
                },

                loadHTML: function loadHTML(url, loopParams) {
                    var def = new Deferred('singleShot', loopParams);

                    require(['text!' + url], function loadHTMLSuccess(html) {
                        def.resolve(html);
                    }, function loadHTMLFail(error) {
                        def.reject(error);
                    });

                    return def;
                },

                getRootZoom: function getRootZoom() {
                    return zoomManager.getAppZoom();
                },

                parseVisuData: function parseVisuData(visuData, visuId) {

                    return _visuModel.parseVisuData(visuData, visuId);
                },

                removeScroller: function (id) {
                    ScrollManager.remove(id);
                },

                refreshArea: function (id) {
                    var area = Areas.get(id);
                    if (area) {
                        area.refresh();
                    }
                },

                scrollContent: function (contentId, position, duration) {
                    var scrollDeferred = $.Deferred(),
                        $content = $('[data-brease-contentid="' + contentId + '"]');
                    if ($content.length === 1 && Enum.ScrollPosition.hasMember(position)) {
                        var $area = $content.closest('[data-brease-areaid]');
                        _activateScroll($area, position, $content, duration);
                        scrollDeferred.resolve(true);
                    } else if ($content.length === 0) {
                        console.iatWarn('Content Id ' + contentId + ' is not defined!');
                        scrollDeferred.resolve(false);
                    } else if (!Enum.ScrollPosition.hasMember(position)) {
                        console.iatWarn('Position value ' + position + ' is not allowed!');
                        scrollDeferred.resolve(false);
                    }
                    return scrollDeferred.promise();
                }
            },

            _loadCycle, _loaderPool, _visuModel,
            _internalCall;

        function _activateScroll($area, position, $content, duration) {
            if (duration === undefined || isNaN(duration)) {
                duration = 0;
            } else {
                duration = parseInt(duration, 10);
            }

            var areaelem = $area[0],
                scrollPos = ScrollManager.getScrollPosition(areaelem),
                offsettop = $area.height() - $content.height(),
                offsetleft = $area.width() - $content.width(),
                offsetHoriz,
                offsetVert;

            if (Enum.ScrollPosition.TOP === position || Enum.ScrollPosition.BOTTOM === position) {
                offsetHoriz = scrollPos.x;
                if (Enum.ScrollPosition.TOP === position) {
                    offsetVert = 0;
                } else if (Enum.ScrollPosition.BOTTOM === position) {
                    offsetVert = offsettop;
                }
            } else if (Enum.ScrollPosition.LEFT === position || Enum.ScrollPosition.RIGHT === position) {
                offsetVert = scrollPos.y;
                if (Enum.ScrollPosition.LEFT === position) {
                    offsetHoriz = 0;
                } else if (Enum.ScrollPosition.RIGHT === position) {
                    offsetHoriz = offsetleft;
                }
            }
            ScrollManager.scrollToContent(areaelem.id, offsetHoriz, offsetVert, duration);

        }

        function _activateStartVisuSuccess(callbackInfo) {
            var rootContainer = callbackInfo.rootContainer;
            PageController.rootContainer = rootContainer;
            PageController.$rootContainer = $(rootContainer);
            PageController.setTheme(_visuModel.startThemeId);

            var _preloader = new Preloader(PageController, callbackInfo.loaderPool, callbackInfo.splashScreenEl, brease.config.visu.bootProgressBar);

            if (_preloader.contentsToPreload !== false && Object.keys(_preloader.contentsToPreload).length !== 0) {
                brease.config.preLoadingState = true;
                _preloader.init().then(function () {
                    _preloader.startProcessingContentsToPreloadFromStack().done(function () {
                        brease.config.preLoadingState = false;
                        PageController.loadPage(_visuModel.startPageId, rootContainer);
                    });
                });
            } else {
                PageController.loadPage(_visuModel.startPageId, rootContainer);
            }
        }

        function _activateStartVisuFailed(visuStatus, code, callbackInfo) {
            var data = {
                visuId: callbackInfo.visuId, container: callbackInfo.rootContainer
            };
            if (code !== undefined) {
                data.code = code;
            }
            PageController.logger.log('VISU_' + visuStatus, data);
        }

        function _loadPage(page, container) {

            if (_loadCycle.inProgress === false || _internalCall === true) {
                //console.log('%c' + 'loadPage:' + page.id + ',' + container.id, 'color:#00cccc');
                _internalCall = false;
                var currentPageId = containers.getCurrentPage(container.id),
                    currentPage = _visuModel.getPageById(currentPageId),
                    response;

                if (currentPage === undefined || currentPageId !== page.id) {

                    if (_visuModel.getLayoutById(page.layout) !== undefined) {
                        var contentsToLoad = _contentsToLoad(page.id, page.type),
                            layoutChange = false;

                        _loaderPool.startTagMode(contentsToLoad);
                        if (currentPage === undefined || page.layout !== currentPage.layout) {
                            _emptyContainer.call(this, container);
                            layoutChange = true;
                        }
                        var layoutDiv = _createLayout.call(this, page.layout, container, page.type);
                        _setPageProps(layoutDiv, page);
                        containers.setCurrentPage(container.id, page.id);

                        _loadCycle.start(_cycleCallback, contentsToLoad, {
                            pageId: page.id, containerId: container.id, contentsToLoad: contentsToLoad
                        });
                        if (!layoutChange) {
                            _removeChangingAssignments.call(this, currentPage, page, container);
                        }
                        _loadAssignments.call(this, page, container, layoutChange);
                        Utils.setPageStyle((page.style || 'default'), layoutDiv, page.type);

                        if (currentPage !== undefined && page.layout !== currentPage.layout && container.id !== this.rootContainer.id) {
                            _prepareZoom.call(this, page, container);
                        }
                        response = {
                            success: true
                        };
                    } else {
                        response = {
                            success: false, code: LogCode.LAYOUT_NOT_FOUND
                        };
                        this.logger.log(response.code, {
                            pageId: page.id, layoutId: page.layout, isStartPage: (_visuModel.startPageId === page.id)
                        });
                    }

                } else {
                    response = {
                        success: false, code: LogCode.PAGE_IS_CURRENT
                    };
                    this.logger.log(response.code, {
                        pageId: page.id
                    });

                    var contentsOfPage = _contentsToLoad(page.id, page.type);
                    for (var i = 0; i < contentsOfPage.length; i += 1) {
                        _loadCycle.remove(contentsOfPage[i]);
                    }

                }
                return response;
            }
        }

        function _contentsToLoad(pageId, pageType) {
            var contents = [],
                page = (pageType === PageTypes.DIALOG) ? _visuModel.getDialogById(pageId) : _visuModel.getPageById(pageId);

            for (var aid in page.assignments) {

                var assignment = page.assignments[aid];

                switch (assignment.type) {
                    case AssignTypes.CONTENT:
                        if (_visuModel.isValidContent(assignment.contentId)) {
                            contents.push(assignment.contentId);
                        }
                        break;

                    case AssignTypes.PAGE:
                        contents.push.apply(contents, _contentsToLoad(assignment.contentId));
                        break;

                    case AssignTypes.VISU:

                        var embededVisuId = assignment.contentId,
                            visu = _visuModel.getVisuById(embededVisuId);

                        if (visu && visu.status === VisuStatus.LOADED) {
                            contents.push.apply(contents, _contentsToLoad(visu.startPage));
                        }

                        break;
                }
            }
            return contents;
        }

        function _resolve(deferred, success, code, data) {
            if (code) {
                this.logger.log(code, data);
                deferred.resolve(success, code);
            } else {
                deferred.resolve(success);
            }
        }

        function _reinstateContentControls() {
            $('.breaseContentControl').each(function () {
                var previousState = brease.callWidget(this.id, 'getPreviousState');
                if (previousState && previousState.loadedContentId) {
                    brease.callWidget(this.id, 'loadContent', previousState.loadedContentId, true);
                    brease.callWidget(this.id, 'updateVisibility');
                }
            });
        }

        function _cycleCallback(callbackInfo) {
            //console.always('_cycleCallback:', callbackInfo.pageId, _visuModel.startPageId);
            _reinstateContentControls();
            if (callbackInfo.pageId === _visuModel.startPageId) {
                _validateClient();
            }
            _loaderPool.endTagMode();
            containers.initPageLoadEvent(callbackInfo.containerId, callbackInfo.pageId, callbackInfo.contentsToLoad, callbackInfo.embedded);
        }

        function _validateClient() {
            var allAcivated = _visuModel.allActivated();

            //console.always('_validateClient,allAcivated:' + allAcivated);
            if (allAcivated) {
                Client.setValid(true);
            } else {
                document.body.addEventListener(BreaseEvent.VISU_ACTIVATED, _visuActivatedListener);
            }
        }

        function _visuActivatedListener() {
            var allAcivated = _visuModel.allActivated();

            //console.always('_visuActivatedListener,allAcivated:' + allAcivated);
            if (allAcivated) {
                document.body.removeEventListener(BreaseEvent.VISU_ACTIVATED, _visuActivatedListener);
                Client.setValid(true);
            }
        }

        function _prepareZoom(page, container) {

            var areaDiv, areaDivId, areaId, area, layoutId, parentPage, pageId, assignment, layoutDiv;

            areaDiv = $(container).closest('div[data-brease-areaId]')[0];
            if (areaDiv) {
                areaDivId = areaDiv.id;
                areaId = areaDiv.getAttribute('data-brease-areaId');
            }

            layoutDiv = $(container).closest('div[data-brease-layoutId]')[0];
            if (layoutDiv) {
                layoutId = layoutDiv.getAttribute('data-brease-layoutId');
            }

            if (areaId && layoutId) {
                area = _visuModel.getLayoutById(layoutId).areas[areaId];
            }

            parentPage = $(container).closest('div[data-brease-pageId]')[0];

            if (parentPage) {
                pageId = parentPage.getAttribute('data-brease-pageId');
                assignment = _visuModel.getPageById(pageId).assignments[areaId];
            }

            if (page && areaDivId && areaDiv && area && assignment) {
                _zoomAndStyle.call(this, page, Areas.get(areaDivId), assignment);
            }
        }

        function _setPageProps(layoutDiv, page) {
            layoutDiv.setAttribute('data-brease-pageId', page.id);
            var css = {
                'background-image': '',
                'background-color': (page.backColor) ? page.backColor : ''
            };

            if (page.backGround || page.backGroundGradient) {
                css['background-image'] = '';
                if (page.backGroundGradient) {
                    css['background-image'] += page.backGroundGradient;
                }
                if (page.backGround) {
                    css['background-image'] += ((css['background-image'] !== '') ? ', ' : '') + 'url(' + page.backGround + ')';
                    css['background-repeat'] = 'no-repeat';
                }
            }

            if (page.sizeMode) {
                css['background-size'] = Enum.SizeMode.convertToCSS(page.sizeMode);
            }
            $(layoutDiv).css(css);
        }

        function _createLayout(layoutId, container, pageType) {
            //console.log("_createLayout:", layoutId, container.id, pageType);
            var containerId = container.id;
            if (container.id !== this.rootContainer.id && pageType !== PageTypes.DIALOG) {
                container = Areas.get(container.id).contentContainer;
            }

            var layoutDivId = this.getLayoutDivId(container.id, layoutId),
                layoutDiv = $('#' + container.id).find('#' + layoutDivId)[0];

            if (!layoutDiv) {
                var layoutObj = _visuModel.getLayoutById(layoutId);
                layoutObj.id = layoutId;
                layoutDiv = document.createElement('div');
                layoutDiv.setAttribute('style', 'width:' + layoutObj.width + 'px;height:' + layoutObj.height + 'px;display:block;position:absolute;z-index:0;');
                layoutDiv.setAttribute('id', layoutDivId);
                layoutDiv.setAttribute('class', 'breaseLayout');
                layoutDiv.setAttribute('data-brease-layoutId', layoutId);

                for (var areaId in layoutObj.areas) {
                    layoutDiv.appendChild(Areas.add(containerId, layoutId, layoutObj.areas[areaId], pageType).div);
                }
                ScrollManager.remove(containerId);
                CoreUtils.prependChild(container, layoutDiv);

                if (containerId === this.rootContainer.id) {
                    var appZoom = brease.config.visu !== undefined && brease.config.visu.zoom === true;
                    zoomManager.setAppZoom(appZoom, layoutDiv, layoutObj, this.$rootContainer);
                    zoomManager.iosBodyFix();
                }
            }
            return layoutDiv;
        }

        function _findAssignment(page, areaId) {
            var foundAssignment;
            for (var aId in page.assignments) {
                var assignment = page.assignments[aId];
                if (assignment.areaId === areaId) {
                    foundAssignment = assignment;
                    break;
                }
            }
            return foundAssignment;
        }

        // check which assignments are to be changed and remove loaders of these ares
        function _removeChangingAssignments(currentPage, page, container) {
            if (!currentPage) {
                return; //nothing to do
            }
            var layout = _visuModel.getLayoutById(page.layout),
                omittedAreas = Object.keys(layout.areas);

            for (var areaId in page.assignments) {
                var assignment = page.assignments[areaId],
                    areaObj = layout.areas[areaId];
                if (areaObj !== undefined) {
                    var actAssignment = _findAssignment(currentPage, assignment.areaId);
                    if (assignment && actAssignment && (actAssignment.contentId !== assignment.contentId || actAssignment.type !== assignment.type)) {
                        var area = Areas.getArea(container.id, currentPage.layout, areaId, currentPage.type);
                        _emptyContainer.call(this, area.div);
                    }
                    omittedAreas.splice(omittedAreas.indexOf(areaId), 1);
                }
            }
            // if there are areas in the assigned layout, which have no assignment
            if (omittedAreas.length > 0) {
                _removeOmittedAreas.call(this, omittedAreas, container, page);
            }
        }

        function _removeOmittedAreas(omittedAreas, container, page) {
            for (var i = 0; i < omittedAreas.length; i += 1) {
                var omittedArea = Areas.getArea(container.id, page.layout, omittedAreas[i], page.type);
                omittedArea.hide();
                _emptyContainer.call(this, omittedArea.div);
            }
        }

        function _loadAssignments(page, container, layoutChange) {

            var layout = _visuModel.getLayoutById(page.layout),
                omittedAreas = Object.keys(layout.areas);
            for (var areaId in page.assignments) {
                var assignment = page.assignments[areaId],
                    areaObj = layout.areas[areaId];

                if (areaObj !== undefined) {
                    var area = Areas.getArea(container.id, page.layout, assignment.areaId, page.type);
                    _loadBaseContent.call(this, assignment, area);
                    area.setStyle((assignment.style || 'default'));
                    area.show();
                    omittedAreas.splice(omittedAreas.indexOf(areaId), 1);
                } else {
                    if (assignment.type === AssignTypes.CONTENT) {
                        _loadCycle.remove(assignment.contentId);
                    }
                    this.logger.log(LogCode.AREA_NOT_FOUND, {
                        contentId: assignment.contentId, layoutId: page.layout, pageId: page.id, areaId: assignment.areaId, isStartPage: (_visuModel.startPageId === page.id)
                    });
                }
            }
            // if there are areas in the assigned layout, which have no assignment
            if (layoutChange && omittedAreas.length > 0) {
                _removeOmittedAreas.call(this, omittedAreas, container, page);
            }
        }

        function _showMessage(messageArea, text) {
            $(messageArea).html(text);
        }

        function _loadBaseContent(assignment, area) {

            var controller = this;

            switch (assignment.type) {
                case AssignTypes.CONTENT:

                    window.performanceMonitor.profile('loadContent - ' + assignment.contentId + '', 0);
                    _loadContent(area, assignment).done(function _loadContentSuccess(loaderId, contentChange, area, assignment) {
                        //console.log('_loadContent.done:', loaderId, contentChange, area, assignment);

                        _loadCycle.remove(assignment.contentId);
                        var content = _visuModel.getContentById(assignment.contentId);

                        if (content) {
                            var zoomFactor = _zoomBaseContent(loaderId, {
                                width: content.width, height: content.height
                            }, {
                                width: area.info.width, height: area.info.height
                            }, assignment.zoomMode);
                            area.setProperties({ width: content.width, height: content.height }, assignment, zoomFactor, contentChange);
                        }

                    }).fail(function _loadContentFail(code, messageArea, area, assignment) {

                        if (code === LogCode.CONTENT_NOT_FOUND) {
                            controller.logger.log(code, {
                                contentId: assignment.contentId
                            });

                            if (messageArea) {
                                controller.logger.message('brease.error.CONTENT_NOT_FOUND', [assignment.contentId], _showMessage.bind(null, messageArea));
                            }
                        }
                    });
                    break;

                case AssignTypes.PAGE:
                    var pageId = assignment.contentId;
                    _internalPageLoad.call(this, pageId, area.div);
                    _zoomAndStyle.call(this, _visuModel.getPageById(pageId), area, assignment);
                    _updateZoomFactor(_visuModel.getVisuByStartpage(pageId));
                    break;

                case AssignTypes.VISU:

                    var visuId = assignment.contentId;
                    $.when(_visuModel.activateVisu(visuId, {
                        visuId: visuId,
                        area: area,
                        assignment: assignment
                    })).then(_activateEmbeddedVisuSuccess, _activateEmbeddedVisuFailed);
                    break;
            }
        }

        function _activateEmbeddedVisuSuccess(callbackInfo) {
            var visu = _visuModel.getVisuById(callbackInfo.visuId);
            $.when(
                _loadVisu.call(PageController, callbackInfo.area, callbackInfo.assignment)
            ).then(function _loadVisuSuccess(pageId) {
                _zoomAndStyle.call(PageController, _visuModel.getPageById(pageId), callbackInfo.area, callbackInfo.assignment);
                _updateZoomFactor(visu);
            }, function _loadVisuFail(code, pageId) {
                if (code === LogCode.PAGE_IS_CURRENT) {
                    _zoomAndStyle.call(PageController, _visuModel.getPageById(pageId), callbackInfo.area, callbackInfo.assignment);
                    _updateZoomFactor(visu);
                }
            });

        }

        function _activateEmbeddedVisuFailed(visuStatus, code, callbackInfo) {
            if (visuStatus === VisuStatus.ACTIVATE_FAILED) {
                var contentsToLoad = _contentsToLoad(_visuModel.getVisuById(callbackInfo.visuId).startPage);
                for (var i = 0; i < contentsToLoad.length; i += 1) {
                    _loadCycle.remove(contentsToLoad[i], true);
                }
            }
            var data = {
                visuId: callbackInfo.visuId
            };
            if (code !== undefined) {
                data.code = code;
            }
            _showVisuError.call(PageController, 'VISU_' + visuStatus, data, callbackInfo.area.div);
        }

        function _zoomAndStyle(page, area, assignment) {
            if (page !== undefined) {
                var layoutId = page.layout,
                    layoutObj = _visuModel.getLayoutById(layoutId),
                    layoutDivId = this.getLayoutDivId(area.contentContainer.id, layoutId),
                    zoomFactor = _zoomBaseContent(layoutDivId, {
                        width: layoutObj.width, height: layoutObj.height
                    }, {
                        width: area.info.width, height: area.info.height
                    }, assignment.zoomMode);

                area.setProperties({ width: layoutObj.width, height: layoutObj.height }, assignment, zoomFactor, true);
            }
        }

        function _zoomBaseContent(containerId, baseContentSize, areaSize, zoomMode) {

            var wF = areaSize.width / baseContentSize.width,
                hF = areaSize.height / baseContentSize.height,
                factor = 1,
                css = {};

            if (zoomMode === ZoomType.contain) {
                factor = Math.min(wF, hF);
            } else if (zoomMode === ZoomType.cover) {
                factor = Math.max(wF, hF);
            }
            css['width'] = baseContentSize.width;
            css['height'] = baseContentSize.height;
            css['transform'] = 'scale(' + factor + ',' + factor + ')';
            css['transform-origin'] = '0 0';
            $('#' + containerId).css(css);

            //console.log("_zoomBaseContent:", containerId, baseContentSize, areaSize, zoomMode + ' --> ' + factor.toFixed(2));
            return factor;
        }

        function _loadVisu(area, assignment) {

            var deferred = $.Deferred(),
                visuId = assignment.contentId,
                pageLoad,
                visu = _visuModel.getVisuById(visuId);

            if (visu.status === VisuStatus.LOADED) {

                //set StartTheme if no theme was applied before
                if (Themes.getCurrentTheme() === undefined) {
                    this.setTheme(_visuModel.startThemeId);
                }

                pageLoad = _internalPageLoad.call(this, visu.startPage, area.div);
                if (pageLoad.success) {
                    _visuModel.getVisuById(visuId).containerId = area.div.id;
                    deferred.resolve(visu.startPage);
                } else {
                    deferred.reject(pageLoad.code, visu.startPage);
                }

            } else {
                _showVisuError.call(this, 'VISU_' + visu.status, { visuId: visuId }, area.div);
                deferred.reject('VISU_' + visu.status);
            }

            return deferred.promise();
        }

        function _showVisuError(messageKey, data, areaDiv) {

            _emptyContainer.call(this, areaDiv);
            data.container = $(areaDiv).find('.ScrollBox')[0];
            this.logger.log(messageKey, data);
        }

        function _updateZoomFactor(visu) {
            if (visu && visu.containerId) {
                var factor = 1,
                    layoutDiv = $('#' + visu.containerId).find('.breaseLayout');

                if (layoutDiv.length > 0) {
                    factor = layoutDiv[0].getBoundingClientRect().width / layoutDiv.outerWidth();
                }

                visu.zoomFactor = factor;
            }
        }

        function _loadContent(area, assignment) {
            var deferred = new Deferred('singleShot', [area, assignment]),
                content = _visuModel.getContentById(assignment.contentId);

            containers.resetCurrentPages(area.div.id);

            _loaderPool.loadContent(content, area.$contentContainer, deferred);

            return deferred;
        }

        function _getTargetForContent(data, force) {
            var containerId,
                page,
                response = (force) ? {
                    success: true,
                    statusCode: 0,
                    data: { contentId: data.contentId }
                } : _validateContent(data.contentId);
            if (!response.success) {
                return response;
            }

            response = _validatePage(data.pageId, data.pageType);
            if (!response.success) {
                return response;
            } else {
                page = response.data.page;
                containerId = response.data.containerId;
            }

            if (_visuModel.pageHasArea(data.areaId, page) === false) {
                response.success = false;
                response.statusCode = LogCode.AREA_NOT_FOUND;
                response.data = { areaId: data.areaId, pageId: data.pageId, layoutId: page.layout };
                return response;
            }
            var area = Areas.getArea(containerId, page.layout, data.areaId, page.type);
            if (!area) {
                response.success = false;
                response.statusCode = LogCode.AREA_NOT_FOUND;
                response.data = { areaId: data.areaId, pageId: data.pageId, layoutId: page.layout };
                return response;
            }
            var assignment = {},
                originalAssignment = _visuModel.findAssignment(page, data.areaId);
            if (originalAssignment) {
                assignment = CoreUtils.deepCopy(originalAssignment);
            }
            assignment.contentId = data.contentId;
            if (response.success === true) {
                response.data = {
                    area: area,
                    assignment: assignment
                };
            }

            return response;
        }

        function _validateContent(contentId) {
            var response = {
                    success: true,
                    statusCode: 0,
                    data: {}
                },
                content = _visuModel.getContentById(contentId);

            if (content === undefined || content.virtual === true) {
                response.success = false;
                response.statusCode = LogCode.CONTENT_NOT_FOUND;
                response.data = { contentId: contentId };
            } else if (_loaderPool.isContentLoaded(contentId) === true) {
                response.success = false;
                response.statusCode = LogCode.CONTENT_IS_ACTIVE;
                response.data = { contentId: contentId };
            }

            return response;
        }

        function _validatePage(pageId, pageType) {
            var response = {
                success: true,
                statusCode: 0,
                data: {}
            };

            if (pageType === 'Page') {
                response.data.page = _visuModel.getPageById(pageId);
                if (!response.data.page) {
                    response.success = false;
                    response.statusCode = LogCode.PAGE_NOT_FOUND;
                    response.data = {
                        pageId: pageId,
                        isStartPage: false
                    };
                    return response;
                }
            } else if (pageType === 'Dialog') {
                response.data.page = _visuModel.getDialogById(pageId);
                if (!response.data.page) {
                    response.success = false;
                    response.statusCode = LogCode.DIALOG_NOT_FOUND;
                    response.data = {
                        dialogId: pageId
                    };
                    return response;
                }
            }
            response.data.containerId = containers.getContainerForPage(pageId);
            if (response.data.containerId === undefined) {
                response.success = false;
                response.statusCode = LogCode.PAGE_NOT_CURRENT;
                response.data = {
                    pageId: pageId
                };

            }
            return response;
        }

        function _internalPageLoad(pageId, container) {
            _internalCall = true;
            return this.loadPage(pageId, container);
        }

        function _pageChangeRequest(e) {
            var container = document.getElementById(e.detail.containerId);
            if (container !== null) {
                this.loadPage(e.detail.pageId, document.getElementById(e.detail.containerId));
            }
        }

        function _emptyContainer(container) {

            if (container.childNodes.length > 0) {

                var i, l, collection,
                    $container = $(container);

                collection = $container.find('.LayoutArea');
                for (i = 0, l = collection.length; i < l; i += 1) {
                    Areas.get(collection[i].id).dispose();
                    containers.dispose(collection[i].id);
                }

                Utils.resetContentControls($container[0]);
                collection = Utils.findLoaders($container[0]);
                for (i = 0, l = collection.length; i < l; i += 1) {
                    _loaderPool.removeLoader(collection[i]);
                    containers.dispose(collection[i].id);
                }
                containers.resetCurrentPages(container.id);
                if (container !== this.rootContainer) {
                    brease.uiController.dispose(container);
                } else {
                    containers.resetCurrentPage(container.id);
                }

                $container.children().not('.iScrollLoneScrollbar,.iScrollBothScrollbars,.ScrollBox').remove();
                $container.children('.ScrollBox').empty();
            }
        }

        var _loadContentInAreaQueue = {
            pool: [],
            add: function (contentId, areaId, pageId, def) {
                this.pool.push({ contentId: contentId, areaId: areaId, pageId: pageId, def: def });
            },
            process: function () {
                for (var i = 0; i < this.pool.length; i += 1) {
                    var item = this.pool[i];
                    PageController.loadContentInArea(item.contentId, item.areaId, item.pageId, item).done(function (success, returnItem) {
                        if (returnItem.def) {
                            returnItem.def.resolve(success);
                        }
                    });
                }
                this.pool.length = 0;
            }
        };

        return PageController;

    });
