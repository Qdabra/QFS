var Qd = Qd || {};

Qd.qfsAccess = (function (qd) {
    "use strict";

    var serviceUrl = "/",
        uiLoader = qd.FormsViewer.UI.uiLoader();

    function mapParameter(key, value) {
        return key + "=" + encodeURIComponent(value);
    }

    // Object -> String
    // Returns a URL parameter list containing the key/value pairs in the provided object
    // or an empty string if no object is provided
    function mapParameters(params) {
        if (params) {
            return qd.util.mapObject(params, mapParameter).join("&");
        } else {
            return "";
        }
    }

    function queryDirectSoapAsync(ajaxParams) {
        return uiLoader.showWaitScreen(Q.when($.soap(ajaxParams)), 'Querying');
    }

    function queryAjaxAsync(url, ajaxParams) {
        return uiLoader.showWaitScreen(Q.when($.ajax(url, ajaxParams)), 'Querying');
    }

    function getTemplateQueryParam(accessType) {
        switch (accessType) {
            case "library":
                return "libraryUrl";
            case "templateName":
                return "templateName";
            default:
                return "xsnUrl";
        }
    }

    function getSharePointProps() {
        var keys = ['SPHostUrl', 'SPLanguage', 'SPClientTag', 'SPProductNumber', 'SPAppWebUrl', 'AppOnly'];
        
        var props = {};

        keys.forEach(function(key) {
            var val = qd.util.getParameterByName(key);

            if (val) {
                props[key] = val;
            }
        });

        return props;
    }

    function buildUrl(base, params) {
        var paramPart = mapParameters(mergeObjects(params, getSharePointProps()));

        return base + (paramPart ? "?" + paramPart : "");
    };

    // String -> Promise[Any]
    // Makes a JSON-P request to the specified URL and returns a promise for the data returned by that URL
    function makeGetRequestAsync(targetUrl, params, cache) {
        var fullUrl = buildUrl(targetUrl, params);

        return queryAjaxAsync(fullUrl, {
            type: "GET",
            dataType: "json",
            contentType: "application/json",
            cache: !!cache
        });
    }

    function makePostRequestAsync(targetUrl, params) {
        var fullUrl = buildUrl(targetUrl, {});

        return queryAjaxAsync(fullUrl, {
            type: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(params)
        });
    }

    function qfsAccess(accessType, location) {
        var xsnQueryParam = getTemplateQueryParam(accessType),
            templateQueryParams = {};

        templateQueryParams[xsnQueryParam] = location;

        function setAccessType(at, newLocation) {
            delete templateQueryParams[xsnQueryParam];

            accessType = at;
            xsnQueryParam = getTemplateQueryParam(at);

            templateQueryParams[xsnQueryParam] = newLocation;
        }

        // String, Object -> Promise[Any]
        // Makes a request to the specified QFS method with the indicated parameter values,
        // and returns a promise for the returned data
        function makeServiceGetRequestAsync(method, params, cache) {
            var url = serviceUrl + method,
                allParams = mergeObjects(templateQueryParams, params || {});

            return makeGetRequestAsync(url, allParams, cache);
        }

        function makeServicePostRequestAsync(method, params) {
            var targetUrl = serviceUrl + method;

            return makePostRequestAsync(targetUrl, params || {});
        }

        // void -> Promise[Any]
        function getManifestAsync() {
            return makeServiceGetRequestAsync("Forms/ManifestWithProperties");
        }

        // String -> Promise[Any]
        // Makes a request for the specified template file and returns a promise for
        // the data object returned
        function getTemplateFileAsync(file, instanceId) {
            var params = { fileName: file },
                cache = !!instanceId;

            if (instanceId) {
                params.instanceId = instanceId;
            }

            return makeServiceGetRequestAsync("Forms/FormFileContents", params, cache);
        }

        // void -> String
        // Returns the string to be sent to preprocessed view requests to provide the image url prefix for
        // rendering images
        function getImagePrefix(instanceId) {
            var targetUrl = serviceUrl + "Forms/TemplateFile",
                params = instanceId
                    ? $.extend({}, templateQueryParams, { instanceId: instanceId })
                    : templateQueryParams;

            return buildUrl(targetUrl, params) + "&fileName=";
        }

        // String -> Promise[Any]
        // Makes a PreprocessedView request for the indicated view and returns a promise for the returned data
        function requestViewAsync(view, instanceId) {
            var params = { viewFileName: view, paramNames: "ImagePrefix", paramValues: getImagePrefix(instanceId) },
                cache = !!instanceId;

            if (instanceId) {
                params.instanceId = instanceId;
            }

            return makeServiceGetRequestAsync("Forms/PreprocessedView", params, cache);
        }

        function querySoapAsync(serviceUri, methodName, soapAction, strBody, overrideAction, useCookie) {
            return makeServicePostRequestAsync("WebProxy/CallSoapService", {
                url: serviceUri,
                soapServiceAction: soapAction,
                data: strBody,
                overrideAction: !!overrideAction,
                useCookie: !!useCookie,
                Credentials: {
                    User: "",
                    Password: "",
                    Domain: ""
                }
            });
        }

        function queryRestAsync(serviceUri) {
            return makeServicePostRequestAsync("WebProxy/CallRestService", {
                url: serviceUri
            });
        }

        ///Method to create new guid.
        function newGuidAsync(format) {
            return makeGetRequestAsync('NewGuid', {
                format: format
            });
        }

        function submitToLibraryAsync(location, fileName, file, overwrite, isBase64) {
            return makeServicePostRequestAsync("WebProxy/SubmitToLibrary",
                {
                    location: location,
                    fileName: fileName,
                    file: file,
                    overwrite: overwrite,
                    isBase64: isBase64
                })
            .then(function (data) {
                var errMsg = "There was an error while submitting to library.";

                if (!data) {
                    throw new Error(errMsg);
                }

                if (!data.success) {
                    if (data.message) {
                        errMsg = data.message;
                    }

                    throw new Error(errMsg);
                }

                return data;
            });
        }

        function getAccessType() {
            return accessType;
        }

        function getTemplateLocation() {
            return templateQueryParams[xsnQueryParam];
        }

        function callCrossDomainRequestAsync(request) {
            return makeServicePostRequestAsync("WebProxy/CallCrossDomain", request);
        }

        function querySpListAsync(query) {
            return makeServicePostRequestAsync('WebProxy/QueryList', query);
        }

        function submitToListAsync(container) {
            return makeServicePostRequestAsync('WebProxy/SubmitToList', container);
        }

        function formatNumber(settings) {
            return makeGetRequestAsync('FormatNumber', settings);
        }

        function getUdcxContents(udcxPath) {
            return makeServicePostRequestAsync("WebProxy/GetUdcxContents", {
                udcxPath: udcxPath
            });
        }

        function getTemplateDefinitionAsync(getTemplateXml, instanceId) {
            var params = { includeTemplateXml: getTemplateXml },
                idExists = !!instanceId;

            if (idExists) {
                params['instanceId'] = instanceId;
            }

            return makeServiceGetRequestAsync("Forms/TemplateDefinition", params, idExists);
        }

        function encrypt(settings) {
            return makePostRequestAsync('Encrypt', settings);
        }

        function decrypt(settings) {
            return makePostRequestAsync('Decrypt', settings);
        }

        function executeAdoAdapterAsync(connectionString, commandText) {
            return makeServicePostRequestAsync("WebProxy/ExecuteAdoAdapter", {
                connectionString: connectionString,
                commandText: commandText
            });
        }

        function getTemplateInfoAsync() {
            return makeServicePostRequestAsync("Forms/GetTemplateInfo", {
                templateName: getTemplateLocation()
            });
        }

        function createFolderAsync(siteUrl, libraryName, folderName) {
            return makeServicePostRequestAsync("WebProxy/CreateSharePointFolder", {
                siteUrl: siteUrl,
                libraryName: libraryName,
                folderName: folderName
            });
        }

        // interface
        return {
            getManifestAsync: getManifestAsync,
            getTemplateFileAsync: getTemplateFileAsync,
            requestView: requestViewAsync,
            querySoapAsync: querySoapAsync,
            queryDirectSoapAsync: queryDirectSoapAsync,
            queryRestAsync: queryRestAsync,
            newGuidAsync: newGuidAsync,
            submitToLibraryAsync: submitToLibraryAsync,
            getAccessType: getAccessType,
            setAccessType: setAccessType,
            getTemplateLocation: getTemplateLocation,
            callCrossDomainRequestAsync: callCrossDomainRequestAsync,
            querySpListAsync: querySpListAsync,
            submitToListAsync: submitToListAsync,
            getImagePrefix: getImagePrefix,
            formatNumber: formatNumber,
            getUdcxContents: getUdcxContents,
            getTemplateDefinitionAsync: getTemplateDefinitionAsync,
            encrypt: encrypt,
            decrypt: decrypt,
            executeAdoAdapterAsync: executeAdoAdapterAsync,
            getTemplateInfoAsync: getTemplateInfoAsync,
            createFolderAsync: createFolderAsync
        };
    }

    qfsAccess.getSharePointFileAsync = function (path) {
        var params = { path: path },
            cache = false;

        return makeGetRequestAsync(serviceUrl + 'WebProxy/SharePointFile', params, cache);
    };

    qfsAccess.loadRootSiteUrlAsync = function () {
        return makeGetRequestAsync('/WebProxy/GetRootSiteUrl')
            .then(function (data) {
                if (!!data.Success) {
                    qfsAccess.hostRootSiteUrl = data.Url;
                }
            });
    };

    qfsAccess.hostRootSiteUrl = '';

    return qfsAccess;
})(Qd);

