/*global require,module*/
(function () {
    'use strict';

    var xmlPrepare = {

        run: function (widgetInfo) {
            var obj = {
                '@name': 'Widget',
                '@attr': {
                    name: widgetInfo.name
                },
                ASEngineeringInfo: {
                    IsProjectable: widgetInfo.meta.visible || true
                },
                Dependencies: {
                    Files: {
                        arr: _depConvert(widgetInfo.dependencies.files, 'File')
                    },
                    Widgets: {
                        arr: _depConvert(widgetInfo.dependencies.widgets, 'Widget')
                    }
                },
                Categories: { arr: _catConvert(widgetInfo.categories) },
                Descriptions: { arr: _descConvert(widgetInfo.descriptions) }
            };
            if (widgetInfo.meta.isCompound) {
                obj.ASEngineeringInfo.IsCompound = true;
            }
            if (widgetInfo.meta.isDerived) {
                obj.ASEngineeringInfo.IsDerived = true;
            }

            if (widgetInfo.meta.inheritance && widgetInfo.meta.inheritance.length > 0) {
                obj.Inheritance = {
                    arr: _inhConvert(widgetInfo.meta.inheritance)
                };
            }

            if (widgetInfo.meta.parents) {
                obj.Parents = {
                    arr: _arrConvert(widgetInfo.meta.parents, 'Parent')
                };
            }

            if (widgetInfo.meta.children) {
                obj.Children = {
                    arr: _arrConvert(widgetInfo.meta.children, 'Child')
                };
            }

            if (widgetInfo.methods && widgetInfo.methods.length > 0) {
                obj.Methods = {
                    arr: _memberConvert(widgetInfo.methods, 'Method', widgetInfo.meta)
                };
            }
            if (widgetInfo.events && widgetInfo.events.length > 0) {
                obj.Events = {
                    arr: _memberConvert(widgetInfo.events, 'Event', widgetInfo.meta)
                };
            }
            if (widgetInfo.properties && widgetInfo.properties.length > 0) {
                obj.Properties = {
                    arr: _memberConvert(widgetInfo.properties, 'Property', widgetInfo.meta)
                };
            }

            return obj;
        }

    };

    function _depConvert(arIn, tag) {
        return arIn.map(function (item) {
            return {
                '@name': tag,
                '@content': item
            };
        });
    }

    function _arrConvert(arIn, tag) {
        return arIn.map(function (item) {
            return {
                '@name': tag,
                '@content': item
            };
        });
    }

    function _descConvert(obj) {
        var ar = [];
        for (var attr in obj) {
            ar.push({
                '@name': 'Description',
                '@attr': {
                    'name': attr
                },
                '@content': obj[attr]
            });
        }
        return ar;
    }

    function _inhConvert(arIn) {
        return arIn.map(function (item, index) {
            return {
                '@name': 'Class',
                '@content': item,
                '@attr': {
                    'level': index
                }
            };
        });
    }

    function _catConvert(obj) {
        var arRet = [], ar;
        for (var attr in obj) {
            ar = obj[attr];
            for (var i = 0; i < ar.length; i += 1) {
                arRet.push({
                    '@name': 'Category',
                    '@attr': {
                        'name': attr
                    },
                    '@content': ar[i]
                });
            }
        }
        return arRet;
    }

    function _mappingsConvert(mappings) {

        var arRet = [];
        for (var i = 0; i < mappings.length; i += 1) {
            var obj = {
                '@name': 'Mapping',
                '@attr': mappings[i]['$']
            };
            if (Array.isArray(mappings[i]['Arguments'])) {
                obj.Arguments = { arr: _argMappingConvert(mappings[i]['Arguments']) };
            }
            arRet.push(obj);
        }
        return arRet;
    }

    function _argMappingConvert(arrArguments) {
        var args = arrArguments[0]['Argument'],
            arRet = [];
        for (var i = 0; i < args.length; i += 1) {
            arRet.push({
                '@name': 'Argument',
                '@attr': args[i]['$']
            });
        }
        return arRet;
    }

    function _memberConvert(arIn, tag, meta) {
        var filtered = arIn.filter(function (item) {
            return (tag !== 'Method' || item.iatStudioExposed === true);
        });
        return filtered.map(function (item) {

            if (tag === 'Method' && !meta.isCompound) {
                item.name = item.name.replace(/^[a-z]/g, function (item) {
                    return item.toUpperCase();
                });
            }
            var obj = {
                    '@name': tag,
                    '@attr': {
                        'name': item.name
                    }
                }, 
                ar, param, info, i;
                
            if (item.description && item.description !== '' && item.description !== '\n') {
                obj['Description'] = _strip(item.description);
            }
            if (item.mappings) {
                obj['Mappings'] = { arr: _mappingsConvert(item.mappings) };
            }
            for (var attr in item) {
                if (attr !== 'public' && attr !== 'getterFor' && attr !== 'setterFor' && attr !== 'name' && attr !== 'description' && attr !== 'owner' && attr !== 'parameter' && attr !== 'originalName' && attr !== 'iatStudioExposed' && attr !== 'mappings') {
                    obj['@attr'][attr] = item[attr];
                }
            }
            if (item.parameter && item.parameter.length > 0) {
                ar = [];
                for (i = 0; i < item.parameter.length; i += 1) {
                    param = item.parameter[i];
                    info = {
                        '@name': 'Argument',
                        '@attr': {
                            'name': param.name,
                            'type': param.type,
                            'index': param.index
                        }
                    };
                    if (param.description && param.description !== '' && param.description !== '\n') {
                        info['Description'] = _strip(param.description);
                    }
                    ar.push(info);
                }
                obj.Arguments = {
                    'Arguments': ar
                };
            }
            if (item.events && item.events.length > 0) {
                ar = [];
                for (i = 0; i < item.events.length; i += 1) {
                    param = item.events[i];
                    info = {
                        '@name': 'Event',
                        '@attr': {
                            'name': param.name
                        }
                    };
                    ar.push(info);
                }
                obj.Arguments = {
                    'Events': ar
                };
            }
            return obj;
        });
    }

    var _templRegEx = new RegExp('<template>.*</template>', 'g');

    function _strip(str) {

        str = str.trim();
        if (str.indexOf('<') === 0) {
            str = str.substring(3);
        }
        if (str.lastIndexOf('<') === str.length - 4) {
            str = str.substring(0, str.length - 4);
        }

        return str.replace(_templRegEx, '');
    }

    module.exports = xmlPrepare;

})();
