/*global require,module,grunt,__dirname*/
(function () {
    /*jshint sub:true, white:false */
    "use strict";

    var child_process = require('child_process');


    var XSLTTransformation = {

        transform: function (grunt, destPath, transPath, srcPath, parameter, useMS) {

            var xsltproc,
                args,
                params = [];

            if (useMS === true) {
                xsltproc = grunt.config('basePath') + '/bin/msxsl.exe';
                args = [srcPath, transPath, '-o', destPath];


                if (typeof parameter === "object" && parameter.length > 0) {
                    for (var i in parameter) {
                        args = args.concat(parameter[i].name + '=\'' + parameter[i].value + '\'')

                    }
                }

            } else {
                xsltproc = grunt.config('basePath') + '/bin/xsltproc.exe';
                args = [
                     '--output',
                     destPath,
                ];

                if (typeof parameter === "object" && parameter.length > 0) {
                    for (var i in parameter) {
                        var t = [
                            '--stringparam',
                            parameter[i].name,
                            parameter[i].value
                        ];
                        params = params.concat(t);
                    }
                    args = args.concat(params)

                }
                args = args.concat([transPath, srcPath]);
            }

            var child = child_process.spawnSync(xsltproc, args),
                errmessage;
            if (child.status === 0) {
                //grunt.log.writeln('style transformation success:' + destPath);
            }
            else if (child.status > 0 && child.status < 12) {
                switch (child.status) {
                    case 1:
                        errmessage = "no argument";
                        break;
                    case 2:
                        errmessage = "to many parameters";
                        break;
                    case 3:
                        errmessage = "unknown option";
                        break;
                    case 4:
                        errmessage = "failed to parse the stylesheet";
                        break;
                    case 5:
                        errmessage = "error in the stylesheet";
                        break;
                    case 6:
                        errmessage = "error in one of the documents";
                        break;
                    case 7:
                        errmessage = "unsupported xsl:output method";
                        break;
                    case 8:
                        errmessage = "string parameter contains both quote and double-quotes";
                        break;
                    case 9:
                        errmessage = "internal processing error";
                        break;
                    case 10:
                        errmessage = "processing was stopped by a terminating message";
                        break;
                    case 11:
                        errmessage = "could not write the result to the output file";
                        break;
                }
                grunt.log.writeln(child.stderr.toString());
                grunt.fail.warn("Error Transforming File (Code " + child.status + "): " + errmessage + " arguments:" + args);
            }
            else {
                grunt.log.writeln(child);
                grunt.fail.warn("Error Transforming File (Code " + child.status + ") UnknownError ");

            }
        }

    };

    module.exports = XSLTTransformation;

})();