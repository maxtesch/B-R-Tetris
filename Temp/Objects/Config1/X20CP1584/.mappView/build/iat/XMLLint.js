/*global require,module,grunt,__dirname*/
(function () {
    /*jshint sub:true, white:false */
    "use strict";

    var child_process = require('child_process');


    var XMLLint = {

        check: function (grunt, schemaPath, xmlPath) {
            console.log("Check File", xmlPath);
            var xmlint = grunt.config('basePath') + '/bin/xmllint.exe',
                args = [
                    '--noout',
                    '--schema',
                    schemaPath,
                    xmlPath
                ],
                params = [];

            var child = child_process.spawnSync(xmlint, args),
                errmessage;
            if (child.status === 0) {
                console.log(child.stderr.toString().trim());
            }
            else if (child.status > 0 && child.status < 12) {
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

    };

    module.exports = XMLLint;

})();