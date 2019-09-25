/*global require,module,grunt,__dirname,console*/
(function () {
    /*jshint sub:true, white:false */
    "use strict";

    var child_process = require('child_process'),
		styleSchema,
		appPath, xmllint;

    var SchemaValidator = {
        setSchemaDir: function (dir) {
            try {
                styleSchema = dir + "schemes/style.xsd";
                xmllint = dir + "bin/xmllint.exe";
            } catch (e) {
                console.log("error loading Schemas");
            }
        },
        validatePath: function (xmlPath, extension, grunt) {

            var child, cmd, args, errmessage;
            if (extension === "style") {
                child = child_process.spawnSync(xmllint, ["--noout", "--schema", styleSchema, xmlPath]);
                if (child.status === 0) {
                    console.log(child.stderr.toString());
                }
                else if (child.status > 0 && child.status < 10) {
                    switch (child.status) {
                        case 1:
                            errmessage = "Unclassified";
                            break;
                        case 2:
                            errmessage = "Error in DTD";
                            break;
                        case 3:
                            errmessage = "Validation error";
                            break;
                        case 4:
                            errmessage = "Validation error";
                            break;
                        case 5:
                            errmessage = "Error in Schema compilation";
                            break;
                        case 6:
                            errmessage = "Error writing ouput";
                            break;
                        case 7:
                            errmessage = "Error in pattern";
                            break;
                        case 8:
                            errmessage = "Error in Reader Registration";
                            break;
                        case 9:
                            errmessage = "Outof memory Error";
                            break;
                    }
                    console.log(child.stderr.toString());
                    grunt.fail.warn("Error checking Schema (Code " + child.status + "): " + errmessage);
                }
                else {
                    console.log(child);
                    grunt.fail.warn("Error checking Schema: (Code " + child.status + ") UnknownError ");

                }
            }
        }
    };

    module.exports = SchemaValidator;

})();