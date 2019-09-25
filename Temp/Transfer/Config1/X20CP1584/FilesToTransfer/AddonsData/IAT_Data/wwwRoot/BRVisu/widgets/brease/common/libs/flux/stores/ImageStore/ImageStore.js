define(['widgets/brease/common/libs/flux/stores/ImageStore/ImageActionTypes',
    'widgets/brease/common/libs/flux/stores/ImageStore/ImageTypes',
    'widgets/brease/common/libs/wfUtils/UtilsImage',
    'brease/enum/Enum',
    'brease/core/Utils'],
    function (ImageActionTypes, ImageTypes, UtilsImage, Enum, Utils) {

        'use strict';

        var ImageStore = function ImageStore(dispatcher, initState) {
            dispatcher.registerStore(this);
            var defaultState = _getDefaultState();
            this.state = _mergeInitWithDefaultState(initState, defaultState);
            this.suscribedViews = [];
            this.state.promise = Promise.resolve();
        };

        ImageStore.prototype.newAction = function newAction(action) {

            var store = this;

            switch (action.type) {

                case ImageActionTypes.INIT_IMAGE:
                    _addPrefixToImageList(store);
                    _setActualSelectedImage(store);
                    store._proccessImage(store);
                    break;

                case ImageActionTypes.INIT_IMAGE_AFTER_PRELOAD:
                    store.state.preloading = false;
                    store.state.promise = Promise.resolve();
                    break;

                case ImageActionTypes.SET_IMAGE_LIST:
                    if (Array.isArray(action.data)) {
                        store.state.imageList = action.data;
                    } else {
                        store.state.imageList = [''];
                    }
                    _addPrefixToImageList(store);
                    _setActualSelectedImage(store);
                    store._proccessImage(store);
                    break;

                case ImageActionTypes.SET_IMAGE_FROM_INDEX:
                    if (Utils.isNumeric(action.data.index) === false) { return; }
                    var imageToSet = Utils.isString(action.data.image) ? action.data.image : '';
                    store.state.imageList[action.data.index] = imageToSet;
                    _addPrefixToImageList(store);
                    _setActualSelectedImage(store);
                    store._proccessImage(store);
                    break;

                case ImageActionTypes.SET_IMAGE_INDEX:
                    store.state.imageIndex = Utils.isNumeric(action.data) ? action.data : undefined;
                    _setActualSelectedImage(store);
                    store._proccessImage(store);
                    break;

                case ImageActionTypes.SET_PATH_PREFIX:
                    var pathPrefix = Utils.isString(action.data) ? action.data : '';
                    store.state.pathPrefix = pathPrefix;
                    _addPrefixToImageList(store);
                    _setActualSelectedImage(store);
                    store._proccessImage(store);
                    break;

                case ImageActionTypes.SET_SIZE_MODE:
                    store.state.sizeMode = action.data;
                    store.state.promise = Promise.resolve();
                    break;

                case ImageActionTypes.SET_BACKGROUND_ALIGNMENT:
                    store.state.backgroundAlignment = action.data.split(" ");
                    store.state.promise = Promise.resolve();
                    break;

                case ImageActionTypes.SET_WIDTH:
                    store.state.width = action.data;
                    store.state.promise = Promise.resolve();
                    break;

                case ImageActionTypes.SET_HEIGHT:
                    store.state.height = action.data;
                    store.state.promise = Promise.resolve();
                    break;

                case ImageActionTypes.SET_VISIBLE:
                    store.state.visible = action.data;
                    store.state.promise = Promise.resolve();
                    break;

                case ImageActionTypes.SET_USE_SVG_STYLING:
                    store.state.useSVGStyling = action.data;
                    store._proccessImage(store);
                    break;

            }

            store.state.promise.then(store.dispatchAction.bind(store)).catch(function () { });
        };

        ImageStore.prototype.dispatchAction = function dispatchAction() {
            var store = this;
            store.suscribedViews.forEach(function (view) {
                view.update();
            });
        };

        ImageStore.prototype.getImageType = function getImageType() {
            return this.state.type;
        };

        ImageStore.prototype.getImagePath = function getImagePath() {
            return this.state.actualImage;
        };

        ImageStore.prototype.getSvgInline = function getSvgInline() {
            return this.state.svgInline;
        };

        ImageStore.prototype.getImageSizeMode = function getImageSizeMode() {
            return this.state.sizeMode;
        };

        ImageStore.prototype.getBackgroundAlignment = function getBackgroundAlignment() {
            return this.state.backgroundAlignment;
        };

        ImageStore.prototype.getHeight = function getHeight() {
            return this.state.height;
        };

        ImageStore.prototype.getWidth = function getWidth() {
            return this.state.width;
        };

        ImageStore.prototype.getVisible = function getVisible() {
            return this.state.visible;
        };

        ImageStore.prototype.getUseSVGStyling = function getUseSVGStyling() {
            return this.state.useSVGStyling;
        };

        ImageStore.prototype.getPreloading = function getPreloading() {
            return this.state.preloading;
        };

        ImageStore.prototype.registerView = function registerView(view) {
            this.suscribedViews.push(view);
        };

        ImageStore.prototype._proccessImage = function(store) {
            if (store.state.actualImage === undefined || store.state.actualImage === '') {
                store.state.type = ImageTypes.INVALID;
                store.state.promise = Promise.resolve();
            } else if (UtilsImage.isStylable(store.state.actualImage) && store.state.useSVGStyling) {
                store.state.type = ImageTypes.SVG;

                if (store.state.promise !== undefined) {
                    if (store.state.promiseFinished === false) {
                        store.state.rejectPromise();
                    }
                }
                store.state.promiseFinished = false;
                store.state.promise = new Promise(function (resolve, reject) {
                    store.state.rejectPromise = reject;
                    UtilsImage.getInlineSvg(store.state.actualImage).then(function (svgElement) {
                        store.state.svgInline = svgElement;
                        store.state.promiseFinished = true;
                        resolve();
                    })
                });

            } else {
                //Possible improvement: add a function to check if the image is present, if not, set type to INVALID
                store.state.type = ImageTypes.OTHER;
                store.state.promise = Promise.resolve();
            }
            return store.state.promise;
        }

        //Private methods
        function _addPrefixToImageList(store) {
            if (store.state.pathPrefix !== undefined && store.state.pathPrefix !== '') {
                store.state.imageListWithPrefix = store.state.imageList.map(function (image) {
                    if (image !== undefined && image !== '') {
                        return store.state.pathPrefix + image;
                    } else {
                        return '';
                    }
                });
            } else {
                store.state.imageListWithPrefix = store.state.imageList;
            }
        }

        function _setActualSelectedImage(store) {
            var actualSelectedImage = store.state.imageListWithPrefix[store.state.imageIndex];
            store.state.actualImage = actualSelectedImage === undefined ? '' : actualSelectedImage;
        }

        function _getDefaultState() {
            return {
                imageList: [''],
                imageListWithPrefix: [''],
                imageIndex: 0,
                pathPrefix: '',
                sizeMode: Enum.SizeMode.CONTAIN,
                backgroundAlignment: ['left', 'top'],
                type: ImageTypes.INVALID,
                svgInline: $('<svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 1 1"></svg>'),
                actualImage: '',
                height: 'auto',
                width: 'auto',
                visible: true,
                useSVGStyling: true,
                preloading: false
            };
        }

        function _mergeInitWithDefaultState(initState, defaultState) {
            if (initState === undefined || Utils.isObject(initState) === false) {
                return defaultState;
            } else {
                //Duplicate object to avoid reference from other store
                initState = JSON.parse(JSON.stringify(initState));
                return {
                    imageList: initState.imageList !== undefined ? initState.imageList : defaultState.imageList,
                    imageListWithPrefix: defaultState.imageListWithPrefix,
                    imageIndex: initState.imageIndex !== undefined ? initState.imageIndex : defaultState.imageIndex,
                    pathPrefix: initState.pathPrefix !== undefined ? initState.pathPrefix : defaultState.pathPrefix,
                    sizeMode: initState.sizeMode !== undefined ? initState.sizeMode : defaultState.sizeMode,
                    backgroundAlignment: initState.backgroundAlignment !== undefined ? initState.backgroundAlignment.split(" ") : defaultState.backgroundAlignment,
                    type: defaultState.type,
                    svgInline: defaultState.svgInline,
                    actualImage: defaultState.actualImage,
                    height: initState.height !== undefined ? initState.height : defaultState.height,
                    width: initState.width !== undefined ? initState.width : defaultState.width,
                    visible: initState.visible !== undefined ? initState.visible : defaultState.visible,
                    useSVGStyling: initState.useSVGStyling !== undefined ? initState.useSVGStyling : defaultState.useSVGStyling,
                    preloading: initState.preloading !== undefined ? initState.preloading : defaultState.preloading
                };
            }
        }

        return ImageStore;

    });
