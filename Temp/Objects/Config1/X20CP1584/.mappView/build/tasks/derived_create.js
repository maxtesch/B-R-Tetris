/*global module*/
module.exports = function (grunt) {

    'use strict';

    var _moduleRequire = require('a.require'),
        _modulePath = require('path'),
        _moduleXml2js = require('xml2js'),
        _xmlBuilder = new _moduleXml2js.Builder({ headless: true }),
        _xmlConvert = {
            xml2js: _moduleXml2js.parseString,
            js2xml: _xmlBuilder.buildObject.bind(_xmlBuilder)
        },
        DataTypes = _moduleRequire('iat/DataTypes'),
        Properties = _moduleRequire('iat/Properties'),
        libraryUtils = _moduleRequire('iat/libraryUtils'),
        debug = false;

    /**
    * @method derived_create
    * @param {String} srcFile path to derived widget xml (e.g. "C:/dev/examples/DegreeNumOut.derivedWidget")
    * @param {String} targetFolder directory to write to (directory where derived widget libraries are located) (e.g. "C:/projects/AS-4.3/Trunk/WidgetTests/Logical/mappView/Widgets")
    * @param {String} baseWidgets base directory of widgets we derive from (e.g. "C:/Program Files/BrAutomation/AS43/AS/TechnologyPackages/mappView/5.2.9000/Widgets") 
    * @param {String} corePath directory of brease core (e.g. "C:/Program Files/BrAutomation/AS43/AS/TechnologyPackages/mappView/5.2.9000/IATC/BRVisu") 
    * @param {String} libraryName name of library of derived widget
    */
    grunt.registerTask('derived_create', '', function (srcFile, targetFolder, baseWidgets, corePath, libraryName) {

        // iat modules
        var utils = _moduleRequire('iat/utils'),
            xsdPrepare = _moduleRequire('iat/xsdPrepare'),
            jsPrepare = _moduleRequire('iat/jsPrepare'),
            styleParser = _moduleRequire('iat/styleParser'),
            templateParser = _moduleRequire('iat/templateParser'),
            xsltTrans = _moduleRequire('iat/XSLTTransformation'),
            json2xml = _moduleRequire('iat/json2xml');

        targetFolder = targetFolder || grunt.config('wwwRoot') + '/BRVisu/widgets';
        baseWidgets = (baseWidgets) || grunt.config('wwwRoot') + '/BRVisu/widgets';
        
        if (debug) {
            grunt.log.writeln('srcFile:' + srcFile);
            grunt.log.writeln('targetFolder:' + targetFolder);
            grunt.log.writeln('baseWidgets:' + baseWidgets);
            grunt.log.writeln('corePath:' + corePath);
            grunt.log.writeln('libraryName:' + libraryName);
        }

        // read source file
        var srcXML = grunt.file.read(srcFile);

        // parse xml to a javascript object
        _xmlConvert.xml2js(srcXML, { trim: true }, function (errArg, xmlObj) {
            if (xmlObj) {

                var derivedWidget = _widgetObject(xmlObj['DerivedWidget'], targetFolder, libraryName),
                    ancestorWidget = _ancestorObject(derivedWidget, utils, baseWidgets);

                if (debug) {
               
                    _writeFile(_modulePath.resolve('/Temp/mvLog/derivedWidget.json'), JSON.stringify(derivedWidget));
                    _writeFile(_modulePath.resolve('/Temp/mvLog/ancestorWidget.json'), JSON.stringify(ancestorWidget));
                }
                var baseInfo = grunt.file.readJSON(ancestorWidget.dir + '/meta/' + ancestorWidget.name + '.json'),
                    widgetInfo = _patchInfo(baseInfo, derivedWidget);
                _writeFile(derivedWidget.metaClassPath + '.json', JSON.stringify(widgetInfo));

                // widget html file
                var templateHTML = grunt.file.read(ancestorWidget.dir + '/' + ancestorWidget.name + '.html'),
                    widgetHTML = _createWidgetHTML(templateHTML, ancestorWidget, derivedWidget);
                _writeFile(derivedWidget.dir + '/' + derivedWidget.name + '.html', widgetHTML);

                // widget js file
                var templateJS = grunt.file.read(grunt.config('basePath') + '/templates/WidgetTemplate.js'),
                    widgetJS = _createWidgetJS(templateJS, ancestorWidget, derivedWidget, widgetInfo);
                _writeFile(derivedWidget.dir + '/' + derivedWidget.name + '.js', widgetJS);

                // meta infos and class extension for designer
                var classInfo = jsPrepare.run(widgetInfo, derivedWidget.qualifiedName, ancestorWidget.type, false, { isDerived: true });
                _writeFile(derivedWidget.dir + '/designer/ClassInfo.js', classInfo);

                // widget xsd file
                // task 'xsdPrepare' is running in widget_compiler before properties with hide=true are removed
                // therefore we have to add them here to get a correct xsd, which restricts the BaseWidget.xsd
                _patchBaseProps(widgetInfo, derivedWidget);
                var widgetXsd = xsdPrepare.run(widgetInfo, {
                    prettify: true
                }, DataTypes, Properties);
                _writeFile(derivedWidget.metaClassPath + '.xsd', widgetXsd);

                // widget styles xsd file
                var stylesXsd = xsdPrepare.runWidgetStyleDefinition(widgetInfo, {
                    prettify: true
                });
                if (stylesXsd !== undefined && stylesXsd !== '') {
                    _writeFile(derivedWidget.metaClassPath + '_Styles.xsd', stylesXsd);
                } else {
                    _deleteFile(derivedWidget.metaClassPath + '_Styles.xsd');
                }

                // widget events/actions xsd file
                var eventActionXsd = xsdPrepare.runEventActionDefinition(widgetInfo, {
                    prettify: true
                }, DataTypes);
                if (eventActionXsd !== undefined && eventActionXsd !== '') {
                    _writeFile(derivedWidget.metaClassPath + '_EventsActions.xsd', eventActionXsd);
                } else {
                    _deleteFile(derivedWidget.metaClassPath + '_EventsActions.xsd');
                }

                // widget styles

                //styles of the ancestor widget as an JS object extracted from .widget file {styleProperties.StyleProperty:[],propertyGroups}                
                var superStyle = styleParser.parseFile(ancestorWidget.dir + '/meta/' + ancestorWidget.name + '.widget', grunt);

                // this method creates the style xml for the .widget file
                // and sets default values in superStyle if they exist in derivedWidget
                var styleXML = _createStyleXML(superStyle, derivedWidget);

                var styleFile = _createStyleFile(styleParser, ancestorWidget, derivedWidget, superStyle, widgetInfo);
                if (styleFile !== '') {
                    _writeFile(derivedWidget.metaClassPath + '.style', styleFile);
                }

                // copy binding templates
                var arBtpl = grunt.file.expand({ cwd: ancestorWidget.dir + '/meta/' }, '*.btpl');
                if (arBtpl.length > 0) {
                    for (var i = 0; i < arBtpl.length; i += 1) {
                        var xml = grunt.file.read(ancestorWidget.dir + '/meta/' + arBtpl[i]);
                        xml = xml.replace(ancestorWidget.qualifiedName, derivedWidget.qualifiedName);
                        grunt.file.write(derivedWidget.metaDir + '/' + arBtpl[i], xml);
                    }
                }

                // widget xml
                var widgetXMLFile = derivedWidget.metaClassPath + '.widget',
                    widgetXML = _createWidgetFile(widgetInfo, json2xml, templateParser, styleXML, superStyle.propertyGroups, derivedWidget.dir);

                _writeFile(widgetXMLFile, widgetXML);

                // base and default scss files
                xsltTrans.transform(grunt, derivedWidget.metaClassPath + '_default.scss', grunt.config('basePath') + '/transformation/' + 'DefaultStyleTransformation.xsl', widgetXMLFile, [{
                    name: 'fileType',
                    value: 'scss'
                }]);
                xsltTrans.transform(grunt, derivedWidget.metaClassPath + '_base.scss', grunt.config('basePath') + '/transformation/' + 'DefaultStyleTransformation.xsl', widgetXMLFile, [{
                    name: 'fileType',
                    value: 'scss'
                }, { name: 'createBase', value: true }]);

                // default css file
                var includePath = _modulePath.resolve(corePath + '/css/libs');
                grunt.config.set('sass.options.includePaths', [includePath]);
                grunt.config.set('sass.derivedWidget.cwd', derivedWidget.metaDir);
                grunt.config.set('sass.derivedWidget.src', derivedWidget.name + '_default.scss');
                grunt.config.set('sass.derivedWidget.dest', derivedWidget.metaDir);
                grunt.task.run(['sass:derivedWidget']);
            }
        });

    });

    function _writeFile(path, content) {

        if (debug) {
            grunt.log.writeln(('write ' + path).cyan);
        }
        grunt.file.write(path, content);
    }

    function _deleteFile(path) {
        if (grunt.file.exists(path)) {
            grunt.file.delete(path);
        }
    }
    function _widgetObject(DerivedWidget, ROOT, libraryName) {
        var obj = {
            name: DerivedWidget['$']['name'],
            library: libraryName,
            props: DerivedWidget['Widget'][0]['$']
        };
        obj.dir = ROOT + '/' + obj.library + '/' + obj.name; // <%ROOT%>/widgetLibrary/widgetName
        obj.metaDir = obj.dir + '/meta'; // <%ROOT%>/widgetLibrary/widgetName/meta
        obj.metaClassPath = obj.metaDir + '/' + obj.name; // <%ROOT%>/widgetLibrary/widgetName/meta/widgetName
        obj.qualifiedName = 'widgets/' + obj.library + '/' + obj.name; // widgets/widgetLibrary/widgetName
        obj.filePath = 'widgets/' + obj.library + '/' + obj.name + '/' + obj.name; // widgets/widgetLibrary/widgetName/widgetName
        obj.type = 'widgets.' + obj.library + '.' + obj.name; // widgets.widgetLibrary.widgetName
        return obj;
    }

    function _ancestorObject(derivedWidget, utils, ROOT) {
        var obj = {
            type: derivedWidget.props['xsi:type']
        };
        var info = obj.type.split('.');
        obj.library = info[1];
        obj.name = obj.type.substring(obj.type.lastIndexOf('.') + 1);
        obj.filePath = utils.className2Path(obj.type);
        obj.qualifiedName = utils.className2Path(obj.type, false, true);
        obj.dir = ROOT + '/' + obj.library + '/' + obj.name;
        return obj;
    }

    function _createWidgetHTML(templateHTML, ancestorWidget, derivedWidget) {

        return templateHTML.replace(ancestorWidget.qualifiedName, derivedWidget.qualifiedName);
    }

    function _createWidgetJS(templateJS, ancestorWidget, derivedWidget, widgetInfo) {

        var newJS = templateJS.replace('SUPER_CLASS_PATH', ancestorWidget.filePath);
        newJS = newJS.replace('SUPER_CLASS', ancestorWidget.type);
        newJS = newJS.replace('WIDGET_LIBRARY', derivedWidget.library);
        newJS = newJS.replace(/WIDGET_NAME/g, derivedWidget.name);

        var properties = widgetInfo.properties,
            settings = {};
        for (var i = 0; i < properties.length; i += 1) {
            var prop = properties[i],
                propName = prop['name'];
            if (derivedWidget.props[propName] !== undefined && prop.defaultValue !== undefined) {
                var parsedValue = _parseValue(derivedWidget.props[propName], prop['type']);
                if (DataTypes.isObject(prop['type']) === false) {
                    settings[propName] = parsedValue;
                } else if (typeof parsedValue === 'object') {
                    // write object data types only if parsing was successful
                    settings[propName] = parsedValue;
                }
            }
        }
        newJS = newJS.replace('DEFAULT_SETTINGS', JSON.stringify(settings, null, 8));
        return newJS;
    }

    function _baseStyles(template, derivedWidget, widgetInfo) {

        var properties = widgetInfo.properties,
            settings = {
                width: false,
                height: false,
                top: false,
                left: false
            };
        for (var i = 0; i < properties.length; i += 1) {
            var propName = properties[i]['name'];
            if (settings[propName] !== undefined) {
                settings[propName] = true;
            }
        }

        var baseStyles = template;
        if (derivedWidget.props['width'] !== undefined) {
            baseStyles = baseStyles.replace('DEFAULT_WIDTH', derivedWidget.props['width']);
        } else {
            baseStyles = baseStyles.replace('default="DEFAULT_WIDTH"', '');
        }
        if (settings['width'] === true) {
            baseStyles = baseStyles.replace('###HIDE_WIDTH###', '');
        } else {
            baseStyles = baseStyles.replace('###HIDE_WIDTH###', 'hide="true"');
        }
        if (derivedWidget.props['height'] !== undefined) {
            baseStyles = baseStyles.replace('DEFAULT_HEIGHT', derivedWidget.props['height']);
        } else {
            baseStyles = baseStyles.replace('default="DEFAULT_HEIGHT"', '');
        }
        if (settings['height'] === true) {
            baseStyles = baseStyles.replace('###HIDE_HEIGHT###', '');
        } else {
            baseStyles = baseStyles.replace('###HIDE_HEIGHT###', 'hide="true"');
        }

        return baseStyles;
    }

    function _mergeStyles(styleProperties, baseStyles) {
        var startTag = '<StyleProperties>';
        return startTag + '\n' + baseStyles + ((styleProperties === '<StyleProperties/>') ? '</StyleProperties>' : styleProperties.substring(startTag.length));
    }

    function _parseSTYLE(template, styleProperties, derivedWidget) {

        var newSTYLE = template.replace('WIDGET_LIBRARY', derivedWidget.library);
        newSTYLE = newSTYLE.replace(/WIDGET_NAME/g, derivedWidget.name);

        newSTYLE = newSTYLE.replace('###STYLE_PROPERTIES###', styleProperties);

        return newSTYLE;
    }

    function _createStyleFile(styleParser, ancestorWidget, derivedWidget, superStyle, widgetInfo) {

        // remove styleproperties without default value and styleproperties with hide=true
        for (var i = superStyle.styleProperties.StyleProperty.length - 1; i >= 0; i -= 1) {
            var prop = superStyle.styleProperties.StyleProperty[i]['$'];
            if (prop.hide === 'true' || prop.default === undefined) {
                superStyle.styleProperties.StyleProperty.splice(i, 1);
            }
        }

        if (superStyle.styleProperties.StyleProperty.length > 0 || widgetInfo.styleproperties.StyleProperty.length > 0) {
            var styleProperties = styleParser.merge(derivedWidget.type, superStyle.styleProperties, widgetInfo.styleproperties, ['width', 'height', 'top', 'left', 'zIndex']),
                purgedStyleProperties = _purgeStyleProperties(styleProperties, ancestorWidget, derivedWidget);

            var baseStyles = _baseStyles(grunt.file.read(grunt.config('basePath') + '/templates/BaseStyles.style'), derivedWidget, widgetInfo),
                mergedStyles = _mergeStyles(purgedStyleProperties, baseStyles);

            return _parseSTYLE(grunt.file.read(grunt.config('basePath') + '/templates/WidgetTemplate.style'), mergedStyles, derivedWidget);
        } else {
            return '';
        }
    }

    function _createStyleXML(superStyle, derivedWidget, xml2js) {
        // set default values if they exist in derivedWidget
        for (var i = 0; i < superStyle.styleProperties.StyleProperty.length; i += 1) {
            var prop = superStyle.styleProperties.StyleProperty[i]['$'],
                propName = prop['name'];
            if (derivedWidget.props[propName] !== undefined && ['top', 'left', 'zIndex'].indexOf(propName) === -1) {
                prop.default = derivedWidget.props[propName];
            }
        }
        // revert js object to xml
        var styleXML = _xmlConvert.js2xml({
            StyleProperties: superStyle.styleProperties
        });

        return styleXML;
    }

    function _patchInfo(widgetInfo, derivedWidget) {
        widgetInfo.meta.superClass = widgetInfo.name;
        widgetInfo.meta.isDerived = true;
        widgetInfo.name = derivedWidget.type;
        widgetInfo.meta.filePath = derivedWidget.filePath + '.js';
        widgetInfo.meta.inheritance.unshift(derivedWidget.type);
        widgetInfo.dependencies.widgets.unshift(derivedWidget.filePath + '.js');

        libraryUtils.patchLocalMediaPath(derivedWidget.props, widgetInfo.properties, derivedWidget.library, DataTypes);
        _overwriteDefaults(derivedWidget, 'props', widgetInfo.properties, 'defaultValue');
        _overwriteDefaults(derivedWidget, 'styleProps', widgetInfo.styleproperties.StyleProperty, 'default');

        return widgetInfo;
    }

    function _patchBaseProps(widgetInfo, derivedWidget) {
        var contains = {},
            baseProps = ['top', 'left', 'height', 'width'];
        for (var i = 0; i < widgetInfo.properties.length; i += 1) {
            contains[widgetInfo.properties[i].name] = true;
        }
        for (var j = 0; j < baseProps.length; j += 1) {
            if (contains[baseProps[j]] === undefined) {
                widgetInfo.properties.push({
                    name: baseProps[j],
                    type: (baseProps[j] === 'top' || baseProps[j] === 'left') ? 'Integer' : 'Size',
                    owner: derivedWidget.type,
                    hide: true
                });
            }
        }
    }

    /*
    * overwrite default values for all properties, if they exist in the derived widget xml, except of top,left,zIndex
    * top,left,zIndex do not need a default value; these properties are set, when a widget is added to a content
    * required properties are changed to optional, otherwise a default value would not be possible
    */
    function _overwriteDefaults(derivedWidget, type, properties, defaultAttr) {

        for (var i = 0; i < properties.length; i += 1) {
            var prop = _select(properties, i, type),
                propName = prop['name'];
            if (derivedWidget.props[propName] !== undefined && ['top', 'left', 'zIndex'].indexOf(propName) === -1) {
                prop[defaultAttr] = derivedWidget.props[propName];
                if (prop.required !== undefined) {
                    prop.required = false;
                }
            }
        }
    }

    function _select(properties, i, type) {
        if (type === 'props') {
            return properties[i];
        } else {
            return properties[i]['$'];
        }
    }

    function _parseValue(value, type) {
        var retVal;
        if (DataTypes.isInteger(type)) {
            retVal = parseInt(value, 10);
        } else if (DataTypes.isNumber(type) || (type === 'Size' && value.indexOf('%') === -1)) {
            retVal = parseFloat(value);
        } else if (DataTypes.isBoolean(type)) {
            retVal = (value.toLowerCase() === 'true');
        } else if (DataTypes.isObject(type)) {
            try {
                retVal = (value !== '') ? JSON.parse(value.trim().replace(/'/g, '"')) : '';
            } catch (e) {
                console.log('Warn: invalid value for object type ' + type + ', JSON.parse failed');
                retVal = value;
            }
        } else {
            retVal = value;
        }
        //console.log('in[' + value + ',' + type + ']->out[' + typeof retVal + ']:' + JSON.stringify(retVal))
        return retVal;
    }

    function _purgeStyleProperties(styleProperties, ancestorWidget, derivedWidget) {

        // REMOVE owner
        styleProperties = styleProperties.replace(/owner="brease.core.BaseWidget"/g, '');
        styleProperties = styleProperties.replace(new RegExp('owner="widgets\\.brease\\.' + ancestorWidget.name + '"', 'g'), '');
        styleProperties = styleProperties.replace(new RegExp('owner="widgets\\.' + derivedWidget.library + '\\.' + derivedWidget.name + '"', 'g'), '');

        // REMOVE attribute defaultStyle: allowed in .widget file only
        styleProperties = styleProperties.replace(/ defaultStyle="default"/, '');

        return styleProperties;
    }

    function _createWidgetFile(widgetInfo, json2xml, templateParser, stylablePropsXML, propertyGroupsObj, widgetDirectory) {
    
        // remove not_styleable properties from normal properties
        if (Array.isArray(widgetInfo.properties)) {
            for (var i = widgetInfo.properties.length - 1; i >= 0; i -= 1) {
                if (['width', 'height', 'top', 'left', 'zIndex'].indexOf(widgetInfo.properties[i].name) !== -1) {
                    widgetInfo.properties.splice(i, 1);
                }
            }
        }

        // generate xml from widgetInfo
        var xml = json2xml.convert(widgetInfo, {
            prettify: {
                enable: true
            }
        });

        // add binding templates to xml
        xml = templateParser.run(xml, widgetDirectory, grunt);

        // adding styleable properties and propertyGroups to xml
        var groupXml = _xmlConvert.js2xml({
            PropertyGroups: propertyGroupsObj
        });

        var insertIndex = xml.lastIndexOf('</Widget>');
        xml = xml.substring(0, insertIndex) + ((propertyGroupsObj) ? groupXml + '\n' : '') + stylablePropsXML + '\n' + xml.substring(insertIndex);

        return xml;

    }

};
