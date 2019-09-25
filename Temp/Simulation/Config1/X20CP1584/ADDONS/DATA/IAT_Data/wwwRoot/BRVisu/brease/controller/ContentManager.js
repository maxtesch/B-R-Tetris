define(['brease/events/BreaseEvent', 'brease/events/ServerEvent', 'brease/core/Utils', 'brease/model/VisuModel', 'brease/objects/Content', 'brease/controller/objects/ContentStatus'],
    function (BreaseEvent, ServerEvent, Utils, visuModel, Content, ContentStatus) {

        'use strict';

        /**
    * @class brease.controller.ContentManager
    * @extends Object
    * @singleton
    */

        var controller = {

            init: function (runtimeService) {

                runtimeService.addEventListener(ServerEvent.CONTENT_ACTIVATED, _contentActivatedHandler);
                runtimeService.addEventListener(ServerEvent.CONTENT_DEACTIVATED, _contentDeactivatedHandler);
            },

            getContent: function (contentId) {
                return _getContentById(contentId);
            },

            setBindingLoadState: function (contentId, flag) {
                _getContentById(contentId).bindingsLoaded = flag;
            },

            isBindingLoaded: function (contentId) {
                var content = _getContentById(contentId);
                return (content !== undefined && content.bindingsLoaded === true);
            },

            setActiveState: function (contentId, state) {
                var content = _getContentById(contentId);
                if (content) {
                    content.state = state;
                }
            },

            getActiveState: function (contentId) {
                var content = _getContentById(contentId);
                if (content) {
                    return _getContentById(contentId).state;
                } else {
                    return ContentStatus.notExistent;
                }
            },

            isContentActive: function (contentId) {
                var content = _getContentById(contentId);
                return (content !== undefined && content.state === ContentStatus.active);
            },

            allActive: function (contents) {
                var active = true;
                for (var i = 0; i < contents.length; i += 1) {
                    active = active && this.isContentActive(contents[i]);
                }
                return active;
            },

            setLatestRequest: function (contentId, request) {
                var content = _getContentById(contentId);
                if (content) {

                    if (request === 'activate') {
                        content.count += 1;
                    }
                    content.latestRequest = contentId + '[' + content.count + ']' + request;
                }
                return content;
            },

            getLatestRequest: function (contentId) {
                var content = _getContentById(contentId);
                if (content) {
                    return _getContentById(contentId).latestRequest;
                } else {
                    return undefined;
                }
            },

            setActivateDeferred: function (contentId, deferred) {
                _getContentById(contentId).activateDeferred = deferred;
            },

            setDeactivateDeferred: function (contentId, deferred) {
                _getContentById(contentId).deactivateDeferred = deferred;
            },

            addVirtualContent: function (contentId, visuId) {
                if (_getContentById(contentId) === undefined) {
                    var content = new Content(contentId, visuId, { virtual: true });
                    _initializeContent(content);
                    visuModel.addContent(contentId, content);
                }
            }
        };

        function _contentActivatedHandler(e) {
        //console.log('%c' + '_contentActivatedHandler:' + e.detail.contentId, 'color:#cc00cc');
            var content = _getContentByServerId(e.detail.contentId, e.detail.visuId);
            if (content && content.state > ContentStatus.initialized) {
                controller.setActiveState(e.detail.contentId, ContentStatus.active);
                if (content.activateDeferred !== undefined) {
                    content.activateDeferred.resolve(content.id);
                    content.activateDeferred = undefined;
                }
                document.body.dispatchEvent(new CustomEvent(BreaseEvent.INITIAL_VALUE_CHANGE_FINISHED, { detail: { contentId: content.id } }));
                document.body.dispatchEvent(new CustomEvent(BreaseEvent.CONTENT_ACTIVATED, { detail: { contentId: content.id } }));
            }
        }

        function _contentDeactivatedHandler(e) {
        //console.log('%c' + '_contentDeactivatedHandler:' + e.detail.contentId, 'color:#cc00cc');
            var content = _getContentByServerId(e.detail.contentId, e.detail.visuId);
            if (content && content.state < ContentStatus.initialized) {
                if (content.deactivateDeferred !== undefined) {
                    content.deactivateDeferred.resolve(content.id);
                    content.deactivateDeferred = undefined;
                }
                document.body.dispatchEvent(new CustomEvent(BreaseEvent.CONTENT_DEACTIVATED, { detail: { contentId: content.id } }));
            }
        }

        function _getContentById(contentId) {
            var content = visuModel.getContentById(contentId);
            if (content !== undefined && content.state === undefined) {
                _initializeContent(content);
            }
            return content;
        }

        function _getContentByServerId(contentId, visuId) {
            var content = visuModel.getContentById(contentId);
            if (content !== undefined && content.state === undefined) {
                _initializeContent(content);
            }
            return content;
        }

        function _initializeContent(content) {
            content.state = ContentStatus.initialized;
            content.count = 0;
        }

        return controller;
    });
