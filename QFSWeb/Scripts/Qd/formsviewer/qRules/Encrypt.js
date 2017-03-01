var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.Encrypt = (function (qd, qdNew) {
    var encryptTextError = "Unable to encrypt the text.";
    var encryptErrorIncorrectPasswordXPath = "Cannot locate password. Please check command and retry.";
    var errorInvalidXPath = "Error: No nodes were found using the specified XPath.";
    var encryptedPrefix = "qdEncrypted";
    var encryptErrorNotValid = "Not valid for qRules encryption. Ensure field is not blank, is not already encrypted and that you have entered a password.";

    function Encrypt(params) {
        var constants = qd.FormsViewer.qRules.Constants,
            requiredParameters = [
                {
                    name: constants.paramXPath,
                    description: 'The text value to apply the encryption to'
                },
                {
                    name: constants.paramPass,
                    description: 'The desired password for the encryption'
                }
            ],
            optionalParameters = [
                {
                    name: constants.paramDsNamePass,
                    description: 'Data source name for the password field'
                },
                {
                    name: constants.paramClear,
                    description: 'Clear password after encryption/decryption.'
                },
                {
                    name: constants.paramPad,
                    description: ''
                }
            ];

        function getSettings(cf) {
            return {
                xPath: cf.getParamValue(constants.paramXPath),
                dsNamePass: cf.getParamValue(constants.paramDsNamePass),
                passwordXPath: cf.getParamValue(constants.paramPass),
                clear: cf.getBoolParamValue(constants.paramClear, true),
                pad: cf.getBoolParamValue(constants.paramPad)
            };
        }

        function validToEncrypt(value, password) {
            //should not start with ENCRYPTED_PREFIX (already qRules encrypted)
            //needs to have a password
            //can't be blank
            return password && value && !value.startsWith(encryptedPrefix);
        }

        function getApiData(targetValue, password, pad) {
            return {
                data: targetValue,
                password: password,
                pad: pad
            };
        }

        /**
         * Returns the value to encrypt (the starting node's inner XML) based on the starting node
         * @param node {dataSourceNode}
         */
        function getValueToEncrypt(node) {
            return node
                ? qdNew.xmlUtility.getChildNodes(node.getNode())
                      .map(qdNew.xmlUtility.xmlToString)
                      .join('')
                : null;
        }

        function executeAsync() {
            var cf = params.commonFunction,
                qfs = params.qfsAccess,
                settings = getSettings(cf),
                password = cf.getPassword(settings.dsNamePass, settings.passwordXPath, encryptErrorIncorrectPasswordXPath),
                dom = cf.getDataSource(),
                targets = cf.getValidNodeSet(dom, settings.xPath, errorInvalidXPath),
                result = '',
                errors = [],
                success = 0;
            var passwordValue = password && password.value();


            return Q()
                .then(function () {
                    return qd.util.runPromiseSequence(targets,
                        function (lastResult, target) {
                            var valueToEncrypt = getValueToEncrypt(target);

                            if (validToEncrypt(valueToEncrypt, passwordValue)) {
                                var apiData = getApiData(valueToEncrypt, passwordValue, settings.pad);

                                return qfs.encrypt(apiData)
                                    .then(function (data) {
                                        if (data && data.Success) {
                                            return target.setValueAsync(data.Data).then(function () {
                                                success += 1;
                                                result = data.Data;
                                            });
                                        }

                                        errors.push(data.Error || encryptTextError);
                                    });
                            }
                            else {
                                errors.push(encryptErrorNotValid);
                            }
                        });
                })
                .then(function () {
                    if (settings.clear) {
                        return password.setValueAsync('');
                    }
                })
                .then(function () {
                    if (targets.length === success) {
                        return {
                            Success: true
                        };
                    }
                    else {
                        return {
                            Error: errors.join('\n'),
                            Success: false
                        };
                    }
                });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    return Encrypt;

})(Qd, qd);