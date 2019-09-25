define(['brease/enum/Enum', 'brease/settings', 'brease/core/Utils', 'brease/events/BreaseEvent', 'brease/model/VisuModel', 'brease/core/Utils', 'brease/controller/WidgetController', 'brease/controller/ContentManager', 'brease/controller/objects/ContentStatus', 'brease/controller/objects/AssignTypes'], function (Enum, settings, CoreUtils, BreaseEvent, visuModel, Utils, widgetController, contentManager, ContentStatus, AssignTypes) {

    'use strict';

    var Preloader = function (PageController, loaderPool, splashScreenEl, bootProgressBar) {
            this.pageController = PageController;
            this.rootContainer = PageController.rootContainer;
            this._visuModel = visuModel;
            this._loaderPool = loaderPool;
            this.splashScreenEl = splashScreenEl || $('#splashscreen');
            this.embeddedVisus = [];
            this.visuData = (this._visuModel !== undefined && typeof this._visuModel.getVisuData === 'function') ? this._visuModel.getVisuData() : undefined;
            this.contentsToPreload = (this.visuData !== undefined) ? this.getContentsToPreload($.extend({}, this.visuData.contents)) : false;
            this.contentsToPreloadLength = 0;
            this.rejectedContents = [];
            this.bootProgressBar = bootProgressBar;
            this.readyDef = $.Deferred();
        },
        defaults = {
            maxAllowedLoadingTime: 10000,
            showContentLoadedMessage: 2000,
            preloadingContainerId: 'preloadingContainer',
            progressBarInitialWidth: 100,
            progressbarSteps: 0,
            progressBarWrapperClass: 'system_brease_StartupProgressBar_style_default startupProgressBarWrapper',
            progressBarClass: 'startupProgressBar',
            progressBarEl: undefined,
            preloadingInfoWrapperClass: 'preLoadingInfoWrapper',
            preloadingInfoClass: 'preLoadingInfo',
            preloadingInfo: undefined,
            preloadingInfoSpan: undefined,
            preloadingInfoInner: undefined,
            attemptsToTryMakingANewContentLoader: 5
        },
        tmpQueue = [],
        //resetCounterAfterNAttempts = new Map(),
        preLoadingState = { 'WORK_IN_PROGRESS': 0.5, 'CONTENTLOADER_INITIALIZED': 1, 'FINISHED': 2 },
        p = Preloader.prototype;

    p.init = function () {
        var deferred = new $.Deferred(),
            self = this;
        // has to be !== undefined in LoaderPool
        this._loaderPool.contentsToLoad = [];

        // calculate the size of the steps that the preloader should move
        this.contentsToPreloadLength = Object.keys(this.contentsToPreload).length;
        defaults.progressbarSteps = 100 / (this.contentsToPreloadLength - 1);

        // copy splashscreen and add a progressBar
        _setPreloadingInfoScreen.call(this);

        // append a hidden preloadingContainer
        this.preloadingContainer = $('<div id="' + defaults.preloadingContainerId + '"></div>');
        this.preloadingContainer.appendTo('body');

        _addContentsToPreloadToStack.call(this);

        // activate embedded visu, so that contents can be loaded and cached
        var deferredEmbeddedVisusFlatList = [];
        this.embeddedVisus.map(function (visu) {
            var activateDeferred = _activateVisu.call(self, visu.id);
            activateDeferred.promise();
            deferredEmbeddedVisusFlatList.push(activateDeferred);
        });
        $.when.apply($, deferredEmbeddedVisusFlatList).then(function () {
            deferred.resolve();
        });

        return deferred;
    };

    p.startProcessingContentsToPreloadFromStack = function () {
        var deferred = $.Deferred(),
            self = this,
            contentToPreload = tmpQueue.shift();

        if (contentToPreload) {
            this.contentsToPreload[contentToPreload.id].preLoadingState = preLoadingState.WORK_IN_PROGRESS;

            // create new contentLoader widget via loaderPool
            // deferred resolved in _initializedHandler in LoaderPool
            this._loaderPool.createNew(this.preloadingContainer.get(0), contentToPreload, deferred, false);

            $.when(deferred).done(function (loaderId, sucess) {
                if (sucess) {
                    var _contentLoader;
                    try {
                        _contentLoader = widgetController.callWidget(loaderId, 'widget');
                    } catch (e) {
                        CoreUtils.logError(e);
                    }

                    var widgetsReadylistener = function (e) {
                        // setting preCache to false prevents contentLoader from firing BreaseEvent.FRAGMENT_SHOW again if preCache flag is set to true in contentLoader creation
                        _contentLoader.settings.preCache = false;

                        // there are widgets that fire the ready event to quickly, so they are allready fired and so we can not listen to it
                        // only listen to those, that are not ready and due to this will fire the ready event
                        var filteredArr = widgetController.getWidgetsOfContent(_contentLoader.settings.contentId, 0).filter(function (id) {
                            return widgetController.getState(id) !== 2;
                        });

                        var allWidgetsReady = function () {
                            _addToLoaderPool.call(self, _contentLoader);
                        };

                        var notAllWidgetsReady = function (contentId) {
                            self.rejectedContents.push(contentId);
                            allWidgetsReady();
                        };

                        //handle situation if all widgets were ready
                        if (filteredArr.length === 0) {
                            allWidgetsReady();
                        } else {
                            //add eventListener
                            _addWidgetReadyEventListener.call(self, filteredArr, _contentLoader)
                                .done(function () { allWidgetsReady(); })
                                .fail(function (contentId, aUnprocessedWidgets) { notAllWidgetsReady(contentId, aUnprocessedWidgets); });
                        }
                    };

                    // listen to content activated event
                    // and then check if widgets are ready
                    if (_contentLoader) {
                        contentActivatedListener.call(self, _contentLoader.settings.contentId)
                            .done(function () { widgetsReadylistener(); });

                        self.contentsToPreload[_contentLoader.settings.contentId].preLoadingState = preLoadingState.CONTENTLOADER_INITIALIZED;
                    }
                } else {
                    // console.log('creation of contentLoader widget failed');
                    // try again to create a contentLoader widget
                    tmpQueue.push(contentToPreload);
                }
            });
        } else {
            //console.log('preloaderItem stack is empty');
        }

        return this.readyDef.promise();
    };

    function contentActivatedListener(contentId) {
        var deferred = new $.Deferred();
        var eventListener = function (e) {
            if (e.detail.contentId === contentId) {
                document.body.removeEventListener(BreaseEvent.CONTENT_ACTIVATED, eventListener);
                clearTimeout(failureTimeout);
                deferred.resolve();
            }
        };

        var failureTimeout = setTimeout(function () {
            document.body.removeEventListener(BreaseEvent.CONTENT_ACTIVATED, eventListener);
            deferred.resolve();
        }, defaults.maxAllowedLoadingTime);

        document.body.addEventListener(BreaseEvent.CONTENT_ACTIVATED, eventListener);
        return deferred;
    }

    // strip out contents that have no preloading flag
    // integrate contents of the startpage at the beginning
    p.getContentsToPreload = function (visuDataContents) {
        var startPage = this._visuModel.getPageById(this.visuData.startPageId),
            startPageContents = this.pageController.getContentsOfPage(startPage.id, startPage.type),
            filteredContents = [],
            filteredContentsObject = {},
            self = this;

        this.embeddedVisus = getEmbeddedvisus(this._visuModel, this.visuData);

        // strip out every content that has not a preCache flag in the configurations
        // FYI: beware if in .vis file content caching is turned on for all contents, every content gets the flag from AS
        for (var contentId in visuDataContents) {
            if (visuDataContents[contentId] !== undefined) {
                if (visuDataContents[contentId].configurations === undefined || visuDataContents[contentId].configurations.hasOwnProperty('preCache') === false || visuDataContents[contentId].configurations.preCache === false) {
                    delete visuDataContents[contentId];
                }
            }
        }

        // return an ordered contentList, where the contents of the startPage come first
        // -> so they get preloaded first
        startPageContents.map(function (id) {
            var content = visuDataContents[id];
            if (content !== undefined) {
                filteredContents.unshift(content);
            }
        });

        //add contents of embedded visus on the startPage
        if (this.embeddedVisus.length > 0) {
            var contentsInVisuEmbeddedOnStartpage = [];
            this.embeddedVisus.map(function (visu) {
                // Todo: assure the order and priorize contents from a visu embedded in the startpage
                if (visu.embeddedOnStartPage === true) {
                    var contentsInVisu = [];
                    var contents = self._visuModel.getVisuData().contents;
                    for (contentId in contents) {
                        var content = contents[contentId];
                        if (content.configurations && content.configurations.hasOwnProperty('preCache') === true) {
                            if ((content.visuId === visu.id) && (content.configurations.preCache === true)) {
                                contentsInVisu.push(content);
                            }
                        }

                    }
                    contentsInVisuEmbeddedOnStartpage = contentsInVisuEmbeddedOnStartpage.concat(contentsInVisu);
                }
            });

            filteredContents = filteredContents.concat(contentsInVisuEmbeddedOnStartpage);
        }

        // add other contents to my filteredContents, with startPageContents stripped out
        Object.keys(visuDataContents).filter(function (contentId) {
            return !startPageContents.includes(contentId);
        }).map(function (id) {
            var content = visuDataContents[id];
            filteredContents.push(content);
        });

        if (filteredContents.length > this._loaderPool.maxSlots) {
            //CoreUtils.logError('more contents than the maximum size of the contentslots should be cached');
            brease.loggerService.log(Enum.EventLoggerId.CLIENT_PRECACHING_CONTENT_SLOTS_EXCEEDED, Enum.EventLoggerCustomer.BUR, Enum.EventLoggerVerboseLevel.OFF, Enum.EventLoggerSeverity.WARNING, []);
            // limit array/object of contents that should get cached to the limit of the slots
            filteredContents = filteredContents.slice(0, this._loaderPool.maxSlots - 1);
        }

        // Todo: leave it as an array --> so that no extra transformation is needed
        // transform into an object
        filteredContents.map(function (content) {
            contentManager.setActiveState(content.id, ContentStatus.preCached);
            if (content) {
                filteredContentsObject[content.id] = content;
            }
        });

        return filteredContentsObject;
    };

    p.getTmpQueue = function () {
        return tmpQueue;
    };

    function _addWidgetReadyEventListener(arr, _contentLoader) {
        var deferred = new $.Deferred();
        var eventListenerContainer = [];

        arr.map(function (widgetId) {
            var widgetElem = document.getElementById(widgetId);

            var eventListener = function (e) {
                if (e.target.id === widgetElem.id) {
                    widgetElem.removeEventListener(BreaseEvent.WIDGET_READY, eventListener);
                    arr.splice(arr.indexOf(e.target.id), 1);
                    if (arr.length <= 0) {
                        // wait a tick
                        setTimeout(function () {
                            clearTimeout(loadingTimeExceededTimer);
                            deferred.resolve();
                        }, 0);
                    } else {
                        // watch arr decrease :-)
                        //console.log(arr.length);
                    }
                }
            };

            if (widgetElem) {
                widgetElem.addEventListener(BreaseEvent.WIDGET_READY, eventListener);
                eventListenerContainer.push({ widget: { elem: widgetElem }, eventListener: eventListener });
            }

        });

        // content has 10 seconds (see defaults.maxAllowedLoadingTime) to load all widgets
        // workaround if a widget does not fire the ready event, wait for n seconds then reject and claim all widgets of content have finished
        var loadingTimeExceededTimer = setTimeout(function () {
            eventListenerContainer.map(function (item) {
                if (item !== undefined && item.widget !== null) {
                    item.widget.elem.removeEventListener(BreaseEvent.WIDGET_READY, item.eventListener);
                }
            });
            deferred.reject(_contentLoader.settings.contentId, eventListenerContainer);
        }, defaults.maxAllowedLoadingTime); //10000

        return deferred;
    }

    function _addToLoaderPool(_contentLoader) {
        // adds contentLoader to locker documentFragment of loaderPool
        // tagMode must be on
        this._loaderPool.tagMode = true;
        this._loaderPool.suspendLoader(_contentLoader.elem);
        this._loaderPool.pool[_contentLoader.elem.id].inUse = false;
        this._loaderPool.tagMode = false;
        // suspend contentLoader so it gets a suspendedState that indicates allPreviouslyReady
        try {
            widgetController.callWidget(_contentLoader.elem.id, 'suspend');
        } catch (e) {
            CoreUtils.logError(e);
        }

        _updatePreloadingCount.call(this, tmpQueue.length, _contentLoader.settings.contentId);

        if (tmpQueue.length !== 0) {
            this.contentsToPreload[_contentLoader.settings.contentId].preLoadingState = preLoadingState.FINISHED;
            // iterate until stack is empty
            this.startProcessingContentsToPreloadFromStack();
        }
    }

    function _addContentsToPreloadToStack() {
        for (var contentId in this.contentsToPreload) {
            tmpQueue.push(this.contentsToPreload[contentId]);
        }

        // add only one Content to preload for testing purpose
        /*
        tmpQueue = [];
        tmpQueue.push(this.contentsToPreload['ContentMainPage']); //ContentNavigation //ContentRightsRoles
        */
    }

    function _setPreloadingInfoScreen() {
        // set splashscreen again to mask startPage
        // not needed if precaching is handled before loading of startPage in PageController
        $(this.rootContainer).append(this.splashScreenEl);

        if (this.bootProgressBar) {
            var preloadingInfoWrapperEl = $('<div class="' + defaults.preloadingInfoWrapperClass + '"></div>');
            defaults.preloadingInfo = $('<div class="' + defaults.preloadingInfoClass + '"><span>' + this.contentsToPreloadLength + '</span> contents to preload: <div style="display: inline-block" class="' + defaults.preloadingInfoClass + '_inner"></div></div>');
            preloadingInfoWrapperEl.append(defaults.preloadingInfo);

            defaults.preloadingInfoSpan = $('span', defaults.preloadingInfo).eq(0);
            defaults.preloadingInfoInner = $('.' + defaults.preloadingInfoClass + '_inner', defaults.preloadingInfo).eq(0);

            // add a progressbar
            _initProgressBar.call(this, preloadingInfoWrapperEl);
        }
    }

    function _initProgressBar(preloadingInfoWrapperEl) {
        var startupProgressBarWrapperEl = $('<div id="' + defaults.progressBarWrapperId + '" class="' + defaults.progressBarWrapperClass + '"></div>');
        defaults.startupProgressBarEl = $('<div id="' + defaults.progressBarId + '" class="' + defaults.progressBarClass + '"></div>');

        startupProgressBarWrapperEl.prepend(preloadingInfoWrapperEl);
        startupProgressBarWrapperEl.append(defaults.startupProgressBarEl);

        this.splashScreenEl.prepend(startupProgressBarWrapperEl);
    }

    function _updatePreloadingCount(count, contentId) {
        var self = this;

        if (self.bootProgressBar) {
            defaults.preloadingInfoSpan.html(count);
            if (contentId !== undefined) {
                defaults.preloadingInfoInner.html(contentId);
            }
            _moveProgressBar();
        }

        if (count === 0) {
            delete self.rejectedContents;
            if (self.bootProgressBar) {
                // var seconds = self.preCacheProcessingTime / 1000; // round to 2 decimal places
                defaults.preloadingInfo.html('All contents have been precached'); //in ' + (+(Math.round(seconds + 'e+2') + 'e-2')) + ' seconds'
                defaults.startupProgressBarEl.slideUp('slow');
            }
            /*
            self.readyDef.resolve();
            $('#' + defaults.preloadingContainerId).remove();
            $('#splashscreen').remove();
            */
            // just a helper timer. The user should be able to see and recognize the info message, that everything is ready
            setTimeout(function () {
                self.readyDef.resolve();
                $('#' + defaults.preloadingContainerId).remove();
                $('#splashscreen').remove();
            }, defaults.showContentLoadedMessage);
        }
    }

    function _moveProgressBar() {
        defaults.progressBarInitialWidth -= defaults.progressbarSteps;
        defaults.startupProgressBarEl.width(defaults.progressBarInitialWidth + '%');
    }

    function findEmbeddedVisus(page, visuData, startPage) {
        var embeddedVisus = [];

        for (var assignmentId in page.assignments) {
            var assignment = page.assignments[assignmentId];
            if (assignment.type === AssignTypes.VISU && visuData.visus[assignment.contentId] !== undefined) {
                var visuId = assignment.contentId = Utils.ensureVisuId(assignment.contentId);
                var visu = visuModel.getVisuById(visuId);
                var myVisuObj = $.extend({}, visu, { page: page, assignment: assignment });

                if (startPage) {
                    myVisuObj.embeddedOnStartPage = true;
                    embeddedVisus.unshift(myVisuObj);
                } else {
                    embeddedVisus.push(myVisuObj);
                }
            }
        }

        return embeddedVisus;
    }

    function removeDuplicates(myArr, prop) {
        return myArr.filter(function (obj, pos, arr) {
            return arr.map(function (mapObj) {
                return mapObj[prop];
            }).indexOf(obj[prop]) === pos;
        });
    }

    function getEmbeddedvisus(visuModel, visuData) {
        // Todo: fetch embedded visus in dialogs
        var embeddedVisus = [];

        // iterate through pages and search for embedded visus
        for (var pageId in visuData.pages) {
            var startPage = (pageId === visuData.startPageId);
            var page = visuData.pages[pageId];
            var embeddedVisusInPages = findEmbeddedVisus(page, visuData, startPage);
            embeddedVisus = embeddedVisus.concat(embeddedVisusInPages);
        }
        // iterate through dialogs and search for embedded visus
        for (var dialogId in visuData.dialogs) {
            var dialog = visuData.dialogs[dialogId];
            var embeddedVisusInDialogs = findEmbeddedVisus(dialog, visuData, startPage);
            embeddedVisus = embeddedVisus.concat(embeddedVisusInDialogs);
        }

        embeddedVisus = removeDuplicates(embeddedVisus, 'id');
        return embeddedVisus;
    }

    function _activateVisu(visuId) {
        var deferred = $.Deferred();
        var _activateEmbeddedVisuSuccess = function (callbackInfo) {
            deferred.resolve();
        };

        var _activateEmbeddedVisuFailed = function (visuStatus, code, callbackInfo) {
            deferred.reject();
        };

        $.when(this._visuModel.activateVisu(visuId, {
            visuId: visuId
            //area: area,
            //assignment: assignment
        })).then(_activateEmbeddedVisuSuccess, _activateEmbeddedVisuFailed);

        return deferred;
    }

    return Preloader;
});
