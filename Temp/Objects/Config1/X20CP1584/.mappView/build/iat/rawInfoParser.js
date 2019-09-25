/*global module,__dirname*/
(function () {
    
    'use strict';

    var path = require('path'),
        utils = require(path.resolve(__dirname, './utils')),
        DataTypes = require(path.resolve(__dirname, './DataTypes')),
        compiler = {

            runCore: function (rawInfo, type, grunt) {
                return compiler.run(rawInfo, type, grunt, false, true);
            },

            run: function (rawInfo, type, grunt, newDepFormat, allowArrays) {

                var widgetName = rawInfo.name; // name wie in @class vergeben, also zB widgets.company.CustomWidget

                if (widgetName === undefined) {
                    grunt.fail.warn('compile failed:'.red + ' widget name undefined (use @class)');
                }
                var widgetInfo = {
                        name: String(widgetName),
                        type: type,
                        meta: {
                            superClass: rawInfo.extends,
                            requires: [],
                            mixins: [],
                            parents: [],
                            children: [],
                            inheritance: rawInfo.inheritance
                        },
                        methods: [],
                        events: [],
                        properties: [],
                        dependencies: {
                            files: [],
                            widgets: []
                        },
                        categories: {},
                        descriptions: {}
                    }, member, args;

                var i, j, info, tag1, tag2, value, values, dep, path, index;

                if (rawInfo.iatMeta) {
                    for (i = 0; i < rawInfo.iatMeta.length; i += 1) {
                        info = rawInfo.iatMeta[i].name.split(':');
                        if (info.length === 1) {
                            grunt.fail.warn('compile failed:'.red + ' iatMeta name has to contain a colon');
                        }
                        tag1 = info[0];
                        tag2 = info[1];
                        value = rawInfo.iatMeta[i].doc;
                        switch (tag1) {
                            case 'category':
                                values = value.split(',');
                                for (j = 0; j < values.length; j += 1) {
                                    if (widgetInfo['categories'][tag2] === undefined) {
                                        widgetInfo['categories'][tag2] = [];
                                    }
                                    widgetInfo['categories'][tag2].push(values[j]);
                                }
                                break;
                            case 'description':
                                widgetInfo['descriptions'][tag2] = value;
                                break;
                            case 'studio':
                                if (['requires', 'mixins', 'parents', 'children', 'superClass', 'inheritance'].indexOf(tag2) === -1) {
                                    widgetInfo['meta'][tag2] = value;
                                } else {
                                    grunt.log.writeln(('compile warning: iatMeta tag has not allowed name (' + tag2 + ') after studio:').yellow);
                                }
                                break;
                            default:
                                grunt.log.writeln(('compile warning: iatMeta tag has unknown name before colon').yellow);
                                break;
                        }

                    }
                }

                if (rawInfo.files && rawInfo.files.length > 0) {
                    var filename = rawInfo.files[0].filename;
                    widgetInfo['meta'].filePath = filename.substring(filename.indexOf('widgets/'));
                }

                if (rawInfo.mixins && rawInfo.mixins.length > 0) {
                    widgetInfo['meta'].mixins = widgetInfo['meta'].mixins.concat(rawInfo.mixins);
                }
                if (newDepFormat === true) {
                    if (rawInfo.dependencies) {
                        widgetInfo.dependencies.widgets = rawInfo.dependencies.widgets.slice(0);
                        widgetInfo.dependencies.files = rawInfo.dependencies.files.slice(0);
                    }
                } else {
                    if (rawInfo.dependencies && rawInfo.dependencies.length > 0) {

                        for (i = 0; i < rawInfo.dependencies.length; i += 1) {
                            dep = rawInfo.dependencies[i];

                            if (dep.indexOf('widgets/') === 0 && dep.indexOf('libs/') === -1) {
                                widgetInfo.dependencies.widgets.push(dep + '.js');
                            } else {
                                widgetInfo.dependencies.files.push(dep + '.js');
                            }

                        }
                    }
                }

                if (rawInfo.requires && rawInfo.requires.length > 0) {
                    widgetInfo['meta'].requires = widgetInfo['meta'].requires.concat(rawInfo.requires);

                    for (i = 0; i < rawInfo.requires.length; i += 1) {
                        dep = rawInfo.requires[i];
                        if (isWidget(dep)) {
                            path = utils.className2Path(dep, true);
                            index = widgetInfo.dependencies.widgets.indexOf(path);
                            if (index === -1) {
                                widgetInfo.dependencies.widgets.push(path);
                            }
                        }

                    }
                }

                if (rawInfo.members && rawInfo.members.length > 0) {
                    for (j = 0; j < rawInfo.members.length; j += 1) {
                        member = rawInfo.members[j];
                        if (member.tagname === 'method') { // @method -> widget methods
                            if (member.owner !== 'brease.core.Class' && member.static !== true && (member.iatStudioExposed === true || member.name.toLowerCase().indexOf('set') === 0)) {
                                
                                if (member.name === undefined) {
                                    grunt.fail.warn('compile failed:'.red + ' method name undefined');
                                }
                                info = {
                                    'name': member.name,
                                    'originalName': member.name,
                                    'read': (member.name.toLowerCase().indexOf('get') === 0), // currently methods which start with 'get' are read actions
                                    'description': member.doc || '',
                                    'iatStudioExposed': (member.iatStudioExposed === true)
                                };
                                if (Array.isArray(member.params)) {
                                    args = _parseArguments(member.params, 'method', allowArrays, grunt);
                                    if (args.length > 0) {
                                        info['parameter'] = args;
                                    }
                                }
                                widgetInfo['methods'].push(info);
                            }
                        } else if (member.tagname === 'event') { // @event -> widget events

                            if (member.iatStudioExposed === true) {
                                if (member.name === undefined) {
                                    grunt.fail.warn('compile failed:'.red + ' event name undefined');
                                }
                                info = {
                                    'name': member.name,
                                    'description': member.doc || ''
                                };
                                if (Array.isArray(member.params)) {
                                    args = _parseArguments(member.params, 'event', allowArrays, grunt);
                                    if (args.length > 0) {
                                        info['parameter'] = args;
                                    } 
                                }
                                widgetInfo['events'].push(info);
                            }
                        } else if (member.tagname === 'cfg') { // @cfg -> widget properties
                            if (member.iatStudioExposed === true) {
                                widgetInfo['properties'].push(_parseConfig(member));
                            }
                        } else if (member.tagname === 'property') { // @property -> widget meta info like parents or children

                            if (member.name === 'parents') {
                                widgetInfo['meta'].parents = _parseWidgetList(member, widgetInfo.name, grunt);
                            } else if (member.name === 'children') {
                                widgetInfo['meta'].children = _parseWidgetList(member, widgetInfo.name, grunt);
                            } else if (member.iatStudioExposed === true) { // not used for widgets
                                widgetInfo['properties'].push(_parseProperty(member));
                            }
                        }

                    } 
                }
                return widgetInfo;

            }
        };

    // PRIVATE functions

    function isWidget(filename) {
        var isInWidgets = (filename && filename.indexOf('widgets.') !== -1),
            level = (filename.match(/\./g) || []).length;
            
        return isInWidgets && level === 2;
    }

    function _parseArguments(params, nodeType, allowArrays, grunt) {
        var args = [];
        for (var i = 0; i < params.length; i += 1) {
            args.push({
                'name': params[i].name,
                'type': _normalizeType(params[i].type),
                'index': i,
                'description': params[i].doc || '',
                'optional': (params[i].optional === true)
            });

            if (params[i].name === undefined) {
                grunt.fail.warn('compile failed:'.red + ' ' + nodeType + ' argument name undefined');
            }
            if (params[i].type === undefined) {
                grunt.fail.warn('compile failed:'.red + ' ' + nodeType + ' argument type undefined');
            }
            if (!_isAllowedType(params[i].type, allowArrays)) {
                grunt.fail.warn('compile failed:'.red + ' ' + nodeType + ' argument type "' + params[i].type + '" not allowed');
            }
        }
        return args;
    }

    function _parseConfig(cfg) {
        //console.log("cfg:",cfg);
        var info = {
            'name': cfg.name,
            'type': _normalizeType(cfg.type),
            'initOnly': (cfg.bindable !== undefined) ? !cfg.bindable : true,
            'localizable': (cfg.localizable !== undefined) ? cfg.localizable : false,
            'editableBinding': (cfg.editableBinding !== undefined) ? cfg.editableBinding : false,
            'readOnly': (cfg.readonly !== undefined) ? cfg.readonly : false,
            'required': (cfg.required !== undefined) ? cfg.required : false,
            'owner': cfg.owner,
            'projectable': (cfg.not_projectable !== true),
            'description': _parseDoc(cfg.doc)
        };
        if (cfg.deprecated) {
            info.deprecated = true;
        }
        if (Array.isArray(cfg.groupRefId)) {
            info.groupRefId = '' + cfg.groupRefId[0];
        }

        if (cfg.groupOrder !== undefined) {
            info.groupOrder = parseInt(cfg.groupOrder[0], 10);
        }

        if (cfg.nodeRefId !== undefined) {
            info.nodeRefId = cfg.nodeRefId;
        }
        if (Array.isArray(cfg.iatCategory) === true) {
            info['category'] = (cfg.iatCategory[0] + '').trim();
        }
        if (Array.isArray(cfg.typeRefId) === true) {
            info['typeRefId'] = (cfg.typeRefId[0] + '').trim();
        }

        if (cfg.default !== null && cfg.default !== undefined && cfg.default !== 'undefined') {
            if (cfg.default.indexOf("'") === 0 && cfg.default.lastIndexOf("'") === (cfg.default.length - 1)) {
                cfg.default = cfg.default.slice(1, -1);
            }

            info['defaultValue'] = cfg.default.replace(/&/gm, '&amp;')
                .replace(/</gm, '&lt;')
                .replace(/>/gm, '&gt;')
                .replace(/"/gm, '&quot;')
                .replace(/'/gm, '&apos;');
        }
        return info;
    }

    function _parseDoc(doc) {
        var ret = '',
            override = '<p><strong>Defined in override';
        if (doc) {
            var index = doc.indexOf(override);
            if (index !== -1) {
                ret = doc.substring(0, index - 2);
            } else {
                ret = doc;
            }
            ret = ret.replace(/<p>/g, '');
            ret = ret.replace(/<\/p>/g, '');
        }
        return ret;
    }

    function _parseProperty(prop) {
        var info = {
            'name': prop.name
        };
        if (prop.type) {
            info['type'] = prop.type;
        }
        if (prop.default) {
            info['defaultValue'] = prop.default;
        }
        if (prop.properties !== null && prop.properties !== undefined) {
            info.values = [];
            for (var i = 0; i < prop.properties.length; i += 1) {
                info.values.push(_parseProperty(prop.properties[i]));
            }
        }
        return info;
    }

    function _parseWidgetList(prop, widgetName, grunt) {
        var result;
        try {
            result = JSON.parse(prop.default);
        } catch (e) {

        }
        if (!Array.isArray(result)) {
            grunt.fail.warn('compile failed:'.red + ', property "' + prop.name + '" on ' + widgetName + ' has invalid value!');
        }
        return result;
    }

    function _normalizeType(type) {

        if (type === undefined || type === '') {
            type = 'undefined';
        }
        return type;
    }
    function _isAllowedType(type, allowArrays) {
        if (type.lastIndexOf('[]') === type.length - 2) {
            var pureType = type.substring(0, type.length - 2);
            return allowArrays && DataTypes.baseType(pureType) !== undefined;
        } else {
            return DataTypes.baseType(type) !== undefined; 
        }
    }

    module.exports = compiler;

})();
