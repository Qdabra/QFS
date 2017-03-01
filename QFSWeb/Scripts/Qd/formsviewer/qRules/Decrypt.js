var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.Decrypt = (function (qd, qdNew) {
    var decryptTextError = "Unable to encrypt the text.";
    var decryptErrorFailedToDecrypt = "Failed to decrypt. Please check password, ensure field was encrypted by qRules and retry.";
    var decryptErrorIncorrectPasswordXPath = "Cannot locate password. Please check command and retry.";
    var decryptErrorNotValid = "Not valid for qRules encryption. Ensure field is not blank, is not already encrypted and that you have entered a password.";
    var errorInvalidXPath = "Error: No nodes were found using the specified XPath.";
    var encryptedPrefix = "qdEncrypted";
    var decryptedPrefix = "qdDecrypted";

    function Decrypt(params) {
        var constants = qd.FormsViewer.qRules.Constants,
            requiredParameters = [
                {
                    name: constants.paramXPath,
                    description: 'The text value to apply the decryption to'
                },
                {
                    name: constants.paramPass,
                    description: 'The desired password for the decryption'
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
                }
            ];

        function getSettings(cf) {
            return {
                xPath: cf.getParamValue(constants.paramXPath),
                dsNamePass: cf.getParamValue(constants.paramDsNamePass),
                passwordXPath: cf.getParamValue(constants.paramPass),
                clear: cf.getBoolParamValue(constants.paramClear, true)
            };
        }

        function validToDecrypt(target, password) {

            var valid = false;
            //should not start with ENCRYPTED_PREFIX (already qRules encrypted)
            //needs to have a password
            //can't be blank
            if (target != null && password) {
                valid = true;
            }

            return valid;
        }

        function decrypted(decryptedData) {

            var decrypted = false;

            if (decryptedData.startsWith(decryptedPrefix)) {
                decrypted = true;
            }

            return decrypted;
        }

        function removePrefix(data, encrypted) {
            if (encrypted && data.StartsWith(encryptedPrefix)) {
                data = data.Remove(0, encryptedPrefix.Length);
            }

            if (!encrypted && data.StartsWith(decryptedPrefix)) {
                data = data.Remove(0, decryptedPrefix.Length);
            }

            return data;
        }

        function getApiData(targetValue, password, pad) {
            return {
                data: targetValue,
                password: password,
                pad: pad
            };
        }

        /**
         * Sets the result of decryption to a target field.
         * @param dest {dataSourceNode}
         * @param value {string}
         */
        function setResultToTarget(dest, value) {
            var xml = $.parseXML('<n>' + value + '</n>');
            var nodesToAdd = qdNew.xmlUtility.getChildNodes(xml.documentElement);

            return dest.setContentAsync(nodesToAdd);
        }

        function executeAsync() {
            var cf = params.commonFunction,
                qfs = params.qfsAccess,
                settings = getSettings(cf),
                password = cf.getPassword(settings.dsNamePass, settings.passwordXPath, decryptErrorIncorrectPasswordXPath),
                dom = cf.getDataSource(),
                targets = cf.getValidNodeSet(dom, settings.xPath, errorInvalidXPath),
                result = '',
                errors = [],
                successCount = 0;

            return Q()
                .then(function () {
                    return qd.util.runPromiseSequence(targets,
                        function (lastResult, target) {
                            if (validToDecrypt(target, password.value())) {
                                var apiData = getApiData(target.value(), password.value(), settings.pad);

                                return qfs.decrypt(apiData)
                                    .then(function (data) {
                                        if (!data || !data.Success) {
                                            errors.push(data.Error || decryptTextError);
                                        }
                                        else {
                                            return setResultToTarget(target, data.Data).then(function () {
                                                successCount += 1;
                                                result = data.Data;
                                            });
                                        }
                                    });
                            }
                            else {
                                errors.push(decryptErrorNotValid);
                            }
                        });
                })
                .then(function () {
                    if (settings.clear) {
                        return password.setValueAsync('');
                    }
                })
                .then(function () {
                    return targets.length === successCount
                        ? { success: true }
                        : { error: errors.join('\n'), success: false };
                });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    return Decrypt;

})(Qd, qd);