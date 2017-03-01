var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.SaveToSharePoint = (function (qd) {
    'use strict';

    var constants = Qd.FormsViewer.qRules.Constants,
        requiredParameters = [
            {
                name: constants.paramUrl,
                description: 'SharePoint Library URL'
            },
            {
                name: constants.paramXPath,
                description: 'XPath to Picture(s) or Attachment(s)'
            }],
        optionalParameters = [
            {
                name: constants.paramDsName,
                description: 'Data Source Name'
            },
            {
                name: constants.paramName,
                description: 'Name for file (extension will be added by qRules)'
            },
            {
                name: constants.paramNameXPath,
                description: 'Relative XPath for name field -- not available for /async'
            },
            {
                name: constants.paramOverwrite,
                description: 'Overwrite existing file if name is specified (yes | no) -- default is no. Not available if /dsnamews is specified.'
            },
            {
                name: constants.paramAsync,
                description: 'Filler Only - upload asynchronously to prevent blocking user while filling out form (yes | no) -- default is no. Ignored if command is used in browser.'
            },
            {
                name: constants.paramDsNameProg,
                description: 'If uploading async, data source name for progress node - defaults to Main if not specified.'
            },
            {
                name: constants.paramXPathProg,
                description: 'If uploading async, xpath for node to report progress to. Main data source assumed if /dsnameprog not specified.'
            },
            {
                name: constants.paramDsNameWs,
                description: 'Data Connection Name for Copy web service.'
            },
            {
                name: constants.paramDsUrl,
                description: 'Site URL for Copy web service data connection. Use only if the data connection should have its url changed.'
            },
            {
                name: constants.paramClear,
                description: '(yes | no)- indicates whether to clear the attachment field on successful upload. Default is yes.'
            },
            {
                name: constants.paramUniqueName,
                description: '(boolean, true by default) - Prepend date and time information to file names to provide unique names'
            }],
        errorMissingRequiredAttributes = "Error: The required attributes are missing: 'qRulesFilename' and 'qRulesLink'.",
        errorInvalidFilenameNode = "Invalid file name node XPath.",
        errorFailedToSave = "Failed to save to SharePoint. URL = '{0}'.",
        errorFailedToCopyUnknownError = "Failed to save to SharePoint. The copy web service failed for unknown reasons.",
        errorFailedToCopy = "Failed to save to SharePoint. The copy web service returned an error. Error code \"{0}\".  Error message \"{1}\".";

    function getTwoDigitDateFormat(value) {
        return value > 9
            ? value
            : '0' + value;
    }

    function getValidFileName(shpAccess, fileName, fileExtension) {
        //TODO: Is correct way?
        fileName = SharePointAccess.ensureSharePointFilename(fileName);

        if (fileName.indexOf('.') < 0) {
            fileName += fileExtension;
        }
        else {
            var fileNameExt = fileName.split('.').pop().toLowerCase(),
                originalExt = fileExtension.replace('.', '').toLowerCase();

            if (fileNameExt != originalExt) {
                fileName = fileName + '.' + originalExt;
            }
        }

        return fileName;
    }

    function generateFileName(cf, shpAccess, requestedFileName, fileNameXPath, fileName, fileExtension, fileNode, preserveName) {
        var toUse;

        //If filename or filename XPath is provided, use that.
        if (fileNameXPath) {
            var fileNameNode = cf.getValidNode(fileNode, fileNameXPath, errorInvalidFilenameNode);
            toUse = fileNameNode.value();
        }
        else if (requestedFileName) {
            toUse = requestedFileName;
        }
        else if (preserveName) {
            toUse = fileName;
        }
        else {
            var date = new Date(),
                year = date.getFullYear(),
                month = date.getMonth() + 1,
                dateValue = date.getDate(),
                hours = date.getHours(),
                minutes = date.getMinutes(),
                seconds = date.getSeconds(),
                milliseconds = date.getMilliseconds();//TODO: fffff format implementation

            toUse = String.format("{0}{1}{1}{3}{4}{5}{6}_{7}",
                year,
                getTwoDigitDateFormat(month),
                getTwoDigitDateFormat(dateValue),
                getTwoDigitDateFormat(hours),
                getTwoDigitDateFormat(minutes),
                getTwoDigitDateFormat(seconds),
                getTwoDigitDateFormat(milliseconds),
                fileName);
        }

        return getValidFileName(shpAccess, toUse, fileExtension);
    }

    function processResult(copyDs, fileUrl, fileName) {
        var error = copyDs.selectSingle('//@ErrorCode');
        if (!error) {
            throw new Error(errorFailedToCopyUnknownError);
        }

        var errorValue = error.value();
        if (errorValue === 'Success') {
            return {
                result: true,
                url: fileUrl + fileName
            };
        }

        var errorMsgNode = copyDs.selectSingle('//@ErrorMessage'),
            message = !errorMsgNode && !errorMsgNode.value()
            ? 'Not specified'
            : errorMsgNode.value();

        throw new Error(String.format(errorFailedToCopy, errorValue, message));
    }

    function clearFieldAndSetLink(cf, node, fileName, url, clear) {
        return Q()
            .then(function () {
                if (!clear) {
                    return;
                }

                return cf.setNil(node);
            })
            .then(function () {
                return node.selectSingle(constants.qdimageAttributeXpathQrulesFilename).setValueAsync(fileName);
            })
            .then(function () {
                return node.selectSingle(constants.qdimageAttributeXpathQruleslink).setValueAsync(url);
            });
    }

    function SaveToSharePoint(params) {

        function saveWithDataConnection(cf, fileUrl, fileName, base64, copyServiceName, copyServiceUrl) {
            cf.verifyDataConnectionExists(copyServiceName);

            var ds = params.dataSources,
                dc = params.dataConnections,
                copyDs = ds.getDom(copyServiceName),
                source = copyDs.selectSingle("//*[starts-with(local-name(), 'SourceUrl')]"),
                destination = copyDs.selectSingle("//*[starts-with(local-name(), 'string')]"),
                stream = copyDs.selectSingle("//*[starts-with(local-name(), 'Stream')]"),
                fields = copyDs.selectNodes("//*[starts-with(local-name(), 'FieldInformation')]");

            cf.deleteNodesCollection(fields);

            return source.setValueAsync(' ')
                .then(function () {
                    return destination.setValueAsync(fileUrl + fileName);
                })
                .then(function () {
                    return stream.setValueAsync(base64);
                })
                .then(function () {
                    var ws = dc.get(copyServiceName);

                    if (copyServiceUrl) {
                        if (!copyServiceUrl.endsWith('/')) {
                            copyServiceUrl += '/';
                        }

                        copyServiceUrl += '_vti_bin\Copy.asmx';

                        ws.setUrl(copyServiceUrl);
                    }

                    return ws.executeAsync();
                })
                .then(function (data) {
                    return processResult(copyDs, fileUrl, fileName);
                }).catch(function () {
                    return processResult(copyDs, fileUrl, fileName);
                });
        }

        function saveFile(cf, copyServiceName, fileUrl, fileName, fileNametoUse, base64, copyServiceUrl) {
            return Q()
                .then(function () {
                    if (copyServiceName) {
                        return saveWithDataConnection(cf, fileUrl, fileNametoUse, base64, copyServiceName, copyServiceUrl);
                    }

                    var overwrite = false,
                        isBase64 = true;

                    if (SharePointAccess.isAppOnlyMode) {
                        return params.qfsAccess.submitToLibraryAsync(fileUrl, fileNametoUse, base64, overwrite, isBase64);
                    } else {
                        return params.shpAccess.submitFormAsync(fileUrl, fileNametoUse, base64, isBase64);
                    }
                })
                .then(function (data) {
                    var success = SharePointAccess.isAppOnlyMode
                        ? data.success
                        : !!data;

                    return {
                        result: success,
                        url: fileUrl + fileNametoUse,
                        fileName: fileName,
                        message: data && data.message,
                        response: data && data.resultBody
                    };
                })
                .catch(function (data) {
                    return {
                        result: false,
                        url: fileUrl + fileNametoUse,
                        fileName: fileName
                    };
                });
        }

        function saveFileToSharePoint(cf, fileNode, fileUrl, requestedFileName, fileNameXPath, overwriteExisting, dsnameprog, xpathprog, copyServiceName, copyServiceUrl, preserveName) {

            var properties = cf.getBase64Values(fileNode),
                fileName = properties.fileName,
                fileExtension = properties.fileExtension,
                fileSize = properties.fileSize,
                shpAccess = params.shpAccess,
                //folderUrl = fileUrl, // Input is folder url, output is file url
                base64 = properties.base64,
                toUse = generateFileName(cf, shpAccess, requestedFileName, fileNameXPath, fileName, fileExtension, fileNode, preserveName);

            //Overwrite defaults to no. However, if user is not specifying file name, the file name will be unique and we don't need to check for existing.
            return Q()
                .then(function () {
                    if (!copyServiceName && !overwriteExisting && (requestedFileName || fileNameXPath)) {
                        var filePath = fileUrl + toUse;
                        return shpAccess.fileExistsAsync(filePath)
                            .then(function (data) {
                                if (!!data) {
                                    return {
                                        result: false,
                                        url: filePath,
                                        fileName: fileName
                                    };
                                }

                                return saveFile(cf, copyServiceName, fileUrl, fileName, toUse, base64, copyServiceUrl);
                            });
                    }

                    return saveFile(cf, copyServiceName, fileUrl, fileName, toUse, base64, copyServiceUrl);
                });
        }

        function saveToSharepoint(cf, url, domName, nodeXPath, fileName, fileNameXPath, overwriteExisting, async,
            dsnameprog, xpathprog, copyServiceName, copyServiceUrl, clear, preserveName) {
            var dom = cf.getDataSource(domName);
            // Ensure URL has trailing slash.
            if (!url.endsWith('/')) {
                url += '/';
            }

            var nodes = cf.getValidNodeSet(dom, nodeXPath),
                count = 0;

            //TODO: Implement async save.
            return qd.util.runPromiseSequence(nodes,
                function (lastResult, node) {
                    if (lastResult && lastResult.shouldStop) {
                        return lastResult;
                    }
                    else {
                        cf.verifyRequiredAttributesExist(node);

                        var base64Value = node.value();

                        if (!base64Value) {
                            return;
                        }

                        return saveFileToSharePoint(cf, node, url, fileName, fileNameXPath, overwriteExisting,
                            dsnameprog, xpathprog, copyServiceName, copyServiceUrl, preserveName)
                            .then(function (data) {
                                if (data.result) {
                                    return clearFieldAndSetLink(cf, node, data.fileName, data.url, clear)
                                        .then(function () {
                                            count++;
                                        });
                                }
                                else {
                                    throw new Error(String.format(errorFailedToSave, data.url));
                                }
                            });
                    }
                })
                .then(function () {
                    return {
                        Success: count > 0
                    };
                });
        }

        function executeAsync() {
            //TODO: IsRunningAsync implementation required ?
            var cf = params.commonFunction,
                url = cf.getParamValue(constants.paramUrl),
                dsname = cf.getParamValue(constants.paramDsName),
                xpath = cf.getParamValue(constants.paramXPath),
                name = cf.getParamValue(constants.paramName),
                overwrite = cf.getBoolParamValue(constants.paramOverwrite),
                async = cf.getBoolParamValue(constants.paramAsync),
                dsnameprog = cf.getParamValue(constants.paramDsNameProg),
                xpathprog = cf.getParamValue(constants.paramXPathProg),
                dsnamews = '',//cf.getParamValue(constants.paramDsNameWs),//TODO:Uncomment after fix for copy.asmx
                dsurl = cf.getParamValue(constants.paramDsUrl),
                namexpath = cf.getParamValue(constants.paramNameXPath),
                clear = cf.getBoolParamValue(constants.paramClear, true),
                preserveName = !cf.getBoolParamValue(constants.paramUniqueName, true);

            return saveToSharepoint(cf, url, dsname, xpath, name, namexpath, overwrite,
                async, dsnameprog, xpathprog, dsnamews, dsurl, clear, preserveName);
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    return SaveToSharePoint;
})(Qd);