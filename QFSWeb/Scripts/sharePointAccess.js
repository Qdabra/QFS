var Qd = Qd || {};
var SharePointAccess = (function (qd, qdNew) {
    "use strict";

    var scriptLoader = qdNew.shpScriptLoader;

    var appOnly = qd.util.getParameterByName("AppOnly"),
        isAppOnlyMode = (appOnly === "true"),
        uiLoader = qd.FormsViewer.UI.uiLoader();

    var hostweburl = FVUtil.getParameterByName("SPHostUrl");
    var appweburl = FVUtil.getParameterByName("SPAppWebUrl").toLowerCase();

    var NamespaceIPData = "http://schemas.microsoft.com/office/infopath/2009/WSSList/dataFields";
    var NamespaceDFS = "http://schemas.microsoft.com/office/infopath/2003/dataFormSolution";
    var NamespacePartnerControls = "http://schemas.microsoft.com/office/infopath/2007/PartnerControls";
    var DataFieldsElement = "<dfs:dataFields xmlns:dfs='" + NamespaceDFS + "' xmlns:d='" + NamespaceIPData + "' />";

    function spApiFunc(func) {
        return function () {
            var args = arguments;

            return scriptLoader.loadedAsync()
                .then(function () {
                    return func.apply(null, args);
                });
        };
    }

    var unspecifiedErrorMessage = 'Unspecified SharePoint error';

    function getErrorFromExecutorResponse(xhr) {
        var body = xhr.body;

        if (!body) {
            return unspecifiedErrorMessage;
        }

        try {
            var parsed = JSON.parse(body);
            var error = parsed && parsed.error;
            var message = error && error.message;
            var messageValue = message && message.value;

            return messageValue;
        } catch (e) {
            return unspecifiedErrorMessage;
        }
    }

    // =========================================================================
    // Query execution - Converting context/requestExecutor requests to promises
    // =========================================================================

    // Executes a request executor request and returns a promise for the result
    function executeRequestWithPromise(executor, params) {
        var executePromise = new Q.Promise(function (resolve, reject) {
            params.success = resolve;
            params.error = function (xhr) {
                var e = new Error(getErrorFromExecutorResponse(xhr));
                e.xhr = xhr;
                reject(e);
            };

            executor.executeAsync(params);
        });

        return uiLoader.showWaitScreen(executePromise, 'Executing');
    };

    // Executes a query and returns a promise for the result
    function executeQueryWithPromise(context) {
        var executePromise = new Q.Promise(function (resolve, reject) {
            function handleError(req, error) {
                var e = Error("SharePoint error.");
                e.shpError = error;
                reject(e);
            }

            context.executeQueryAsync(resolve, handleError);
        });

        return uiLoader.showWaitScreen(executePromise, 'Executing');
    };

    function convertDate(date) {
        return FVUtil.getXmlDate(date) + " " + FVUtil.getXmlTime(date);;
    }

    function appendUserOrLookup(parent, userValue, dom, elementNodeName, displayNodeName, idNodeName, typeNodeName, type) {
        var person, ch;

        person = dom.createElementNS(NamespacePartnerControls, elementNodeName);

        //ch = dom.createElementNS(NamespacePartnerControls, displayNodeName);
        //ch.textContent = userValue.LookupValue || userValue.get_lookupValue();
        //person.appendChild(ch);

        ch = dom.createElementNS(NamespacePartnerControls, idNodeName);
        if (userValue) {
            ch.textContent = userValue.LookupId || userValue.get_lookupId();
        }
        person.appendChild(ch);

        //ch = dom.createElementNS(NamespacePartnerControls, typeNodeName);
        //ch.textContent = type;
        //person.appendChild(ch);

        parent.appendChild(person);
    }

    function addUserValue(parent, userValue, dom) {
        appendUserOrLookup(parent, userValue, dom, "pc:Person", "pc:DisplayName", "pc:AccountId", "pc:AccountType", "User");
    };

    function addLookupValue(parent, userValue, dom) {
        appendUserOrLookup(parent, userValue, dom, "pc:Lookup", "pc:DisplayName", "pc:Id", "pc:Type", "Lookup");
    }

    function getIdNode(fieldArray, node) {
        var filteredColumn = fieldArray.filter(function (item) {
            return item.isId;
        });

        if (filteredColumn && filteredColumn.length > 0) {
            return node.selectSingle(filteredColumn[0].xPath);
        }
        return null;
    }

    function createFilter(viewXml, fieldItem) {
        var eq = viewXml.createElement("Eq"),
            fieldRef = eq.appendChild(viewXml.createElement("FieldRef")),
            valueNode = eq.appendChild(viewXml.createElement("Value"));

        $(fieldRef).attr("Name", fieldItem.field.internalName);
        $(valueNode).attr("Type", fieldItem.field.type)
            .text(fieldItem.value);

        return eq;
    }

    function addFilter(viewXml, filterFields) {
        var viewElement = viewXml.documentElement,
            query = viewElement.appendChild(viewXml.createElement("Query")),
            where = query.appendChild(viewXml.createElement("Where"));

        var fieldItem = filterFields[0],
            rootEq = createFilter(viewXml, fieldItem);

        for (var i = 1; i < filterFields.length; i++) {
            fieldItem = filterFields[i];
            var and = viewXml.createElement("And");
            and.appendChild(rootEq);
            and.appendChild(createFilter(viewXml, fieldItem));
            rootEq = and;
        }

        where.appendChild(rootEq);
    }

    function addOrderBy(viewXml, sortBy, sortAsc) {
        var viewElement = viewXml.documentElement,
            query = viewXml.documentElement.querySelector('Query') || viewElement.appendChild(viewXml.createElement('Query')),
            orderBy = query.appendChild(viewXml.createElement("OrderBy")),
            fieldRef = orderBy.appendChild(viewXml.createElement("FieldRef"));

        $(fieldRef).attr('Name', sortBy)
            .attr('Ascending', sortAsc.toString().toUpperCase());
    }

    // adds a queryOptions element 
    function addQueryOptions(viewXml) {
        var viewElement = viewXml.documentElement;

        var queryOptions = $.parseXML('<QueryOptions><IncludeAttachmentUrls>true</IncludeAttachmentUrls><ExpandUserField>true</ExpandUserField><ViewAttributes Scope="RecursiveAll" /></QueryOptions>');

        viewElement.appendChild(queryOptions.documentElement);
    }


    function stringToBase64ByteArray(strValue) {
        var b64 = new SP.Base64EncodedByteArray();
        var u8 = utf8.encode(strValue);

        for (var i = 0; i < u8.length; i += 1) {
            b64.append(u8.charCodeAt(i));
        }

        return b64;
    }


    // ========================
    // String processing
    // ========================

    function getServerRelativePath(fullPath) {
        return fullPath.replace(/^https?:\/\/[^\/]+/, "");
    }

    function ensureSharePointFilename(strName) {
        return strName.replace(/[~%:?/&#*|,]/g, "_");
    }

    // Returns the portion of the URL from the beginning up to the domain name (e.g. http://www.blah.com)
    function getDomainFromUrl(url) {
        if (!url) {
            return null;
        }
        var protocol = url.substr(0, url.indexOf('//') + 2),
            urlWithoutProtocol = url.replace(protocol, ''),
            slashIndex = urlWithoutProtocol.indexOf('/'),
            sitePath = slashIndex >= 0 ? urlWithoutProtocol.substr(0, slashIndex) : urlWithoutProtocol,
            siteUrl = protocol + sitePath;

        return siteUrl;
    }

    function urlsHaveSameDomain(url1, url2) {
        var d1 = getDomainFromUrl(url1);
        var d2 = getDomainFromUrl(url2);

        var areSame = d1 && d2 && d1.toLowerCase() === d2.toLowerCase();

        return !!areSame;
    }

    // Case 38821
    function escapeRestParam(value) {
        return encodeURIComponent(value.replace(/'/g, "''"));
    }

    function getExecutorPath(request, basePath) {
        var basePathEscaped = escapeRestParam(basePath || hostweburl);

        return appweburl + "/_api/SP.AppContextSite(@target)/web/" + request + "?@target='" + basePathEscaped + "'";
    }

    function setExecutor(clientContext) {
        var factory = new SP.ProxyWebRequestExecutorFactory(appweburl);
        clientContext.set_webRequestExecutorFactory(factory);
    }

    function getExecutor(domain) {
        domain = domain || appweburl;
        return new SP.RequestExecutor(domain);
    };

    function getHostWebContext(context, url) {
        return new SP.AppContextSite(context, url || hostweburl);
    };

    // SpContext[, siteUrl] -> SpWeb
    function getWeb(context, url) {
        var hostContext = getHostWebContext(context, url);

        return hostContext.get_web();
    }

    function getContext() {
        var context = new SP.ClientContext(appweburl);
        setExecutor(context);
        return context;
    }

    // requires ShP scripts
    function prepareFile(name, strContent, isBase64) {
        var fileContent, fileCreateInfo;

        fileContent = isBase64
            ? strContent
            : stringToBase64ByteArray(strContent);

        fileCreateInfo = new SP.FileCreationInformation();
        fileCreateInfo.set_url(name);
        fileCreateInfo.set_content(fileContent);
        // TODO: Allow passing this in as a parameter
        fileCreateInfo.set_overwrite(true);

        return fileCreateInfo;
    }

    // requires ShP scripts
    function submitFileWithClientContextAsync(folderUrl, fileName, strXml, isBase64) {
        var clientContext = getContext(),
            siteUrl = folderUrl.replace(/[^/]+\/?$/, ""),
            hostWebContext = getWeb(clientContext, siteUrl),
            fileCreateInfo = prepareFile(fileName, strXml, isBase64),
            newFile = hostWebContext.getFolderByServerRelativeUrl(getServerRelativePath(folderUrl)).get_files().add(fileCreateInfo);

        clientContext.load(newFile);

        return executeQueryWithPromise(clientContext)
            .catch(function (error) {
                throw new Error(error.shpError.get_message());
            });
    }

    function getDigestAsync() {
        var context = getContext();

        return Q()
            .then(function () {
                // this will throw an error if the digest info is not yet cached.
                // so we catch and retry after executing a query if it throws
                return context.get_formDigestInfo();
            })
            .catch(function () {
                return executeQueryWithPromise(context)
                    .then(function () {
                        return context.get_formDigestInfo();
                    });
            });
    }

    // returns the portion of url up to the last slash
    function getBasePath(url) {
        // SP.AppContextSite() requires the scheme and domain
        return /^https?:\/\//.test(url)
            ? url.substring(0, url.lastIndexOf('/'))
            : null;
    }

    function submitFileWithRequestExecutorAsync(folderUrl, fileName, fileContent, isBase64) {
        var executor = getExecutor();
        var relFolderUrl = getServerRelativePath(folderUrl);
        var baseUrl = getBasePath(folderUrl);
        var requestPath = "GetFolderByServerRelativeUrl('" + escapeRestParam(relFolderUrl) + "')/Files/add(url='" + escapeRestParam(fileName) + "',overwrite=true)";
        var fullRequestPath = getExecutorPath(requestPath, baseUrl);

        return getDigestAsync()
            .then(function (digest) {
                return executeRequestWithPromise(executor, {
                    url: fullRequestPath,
                    method: "POST",
                    // body expects a "binary string" when saving binary values
                    body: isBase64 ? atob(fileContent) : fileContent,
                    binaryStringRequestBody: isBase64,
                    headers: {
                        "accept": "application/json;odata=verbose",
                        "X-RequestDigest": digest.get_digestValue()
                    }
                });
            });

    }

    function SharePointAccess() {
        var userInfoCache = {};

        function submitFormAsync(folderUrl, fileName, fileContent, isBase64) {
            return submitFileWithRequestExecutorAsync(folderUrl, fileName, fileContent, isBase64)
                .catch(function () {
                    // include old approach as a fallback
                    return submitFileWithClientContextAsync(folderUrl, fileName, fileContent, isBase64);
                });

        }

        function isInHostWebDomain(url) {
            return urlsHaveSameDomain(url, hostweburl);
        }

        function getFileRequestPath(serverRelativeUrl, baseUrl) {
            return getExecutorPath("GetFileByServerRelativeUrl('" + escapeRestParam(serverRelativeUrl) + "')/$value", baseUrl);
        }

        function getDocumentAsync(url) {
            var servRelPath = getServerRelativePath(url);
            // SP.AppContextSite() requires the scheme and domain
            var basePath = getBasePath(url);

            var executor = getExecutor();
            var requestPath = getFileRequestPath(servRelPath, basePath);

            return executeRequestWithPromise(executor, {
                url: requestPath,
                type: "GET"
            })
            .then(function (data) {
                return data.body.toString();
            });
        }

        function getFile(url) {
            url = getServerRelativePath(url);

            var executor = getExecutor();
            var requestPath = getFileRequestPath(url);

            return executeRequestWithPromise(executor, {
                url: requestPath,
                type: "GET",
                binaryStringResponseBody: true
            })
                .catch(function (e) {
                    alert(e.xhr.status + ": " + e.xhr.statusText);
                });
        }

        function queryListInnerAsync(listId, columns, filterFields, siteUrl, sortBy, sortAsc) {
            var context = getContext(),
                web = getWeb(context, siteUrl),
                camlQuery = new SP.CamlQuery(),
                viewXml = $.parseXML("<View />"),
                list = web.get_lists().getById(listId);

            if (filterFields.length) {
                addFilter(viewXml, filterFields);
            }

            if (sortBy) {
                addOrderBy(viewXml, sortBy, sortAsc);
            }

            addQueryOptions(viewXml);

            // Use And only if multiple filters
            camlQuery.set_viewXml(FVUtil.xmlToString(viewXml));
            var items = list.getItems(camlQuery);

            var columnStr = "Include(" + columns.join(",") + ")";
            context.load(items, columnStr);

            var listFields = list.get_fields();
            context.load(listFields);

            return executeQueryWithPromise(context)
                .then(function () { return { items: items, fields: listFields }; });
        }

        function queryListXmlAsync(listId, columns, filterFields, siteUrl, sortBy, sortAsc) {
            //Move the functionality to parse returned xml to custom object in sharePointListAdapter.js  --  11/07/16
            return queryListInnerAsync(listId, columns, filterFields, siteUrl, sortBy, sortAsc);
        }

        function getUser(userName) {
            return userInfoCache[userName || ''];
        }

        function loadUserAsync(userName) {
            if (isAppOnlyMode) {
                return Q();
            }

            return scriptLoader.loadedAsync()
                .then(function () {
                    var userNameNormalized = (userName || '').toLowerCase();

                    var existingUser = getUser(userNameNormalized);

                    if (existingUser) {
                        return Q(existingUser);
                    }

                    var context = getContext();
                    var web = getWeb(context);
                    var user = userNameNormalized
                        ? web.ensureUser(userNameNormalized)
                        : web.get_currentUser();

                    context.load(user);

                    return executeQueryWithPromise(context)
                        .then(function () {
                            userInfoCache[userNameNormalized] = user;
                            userInfoCache[user.get_loginName()] = user;
                            return user;
                        });
                });
        }

        function submitToListAsync(submitItem) {
            var siteUrl = submitItem.siteUrl,
                listId = submitItem.listId,
                listName = submitItem.listName,
                itemArray = submitItem.itemArray,
                context = getContext(),
                web = getWeb(context, siteUrl),
                spList = submitItem.useName
                    ? web.get_lists().getByTitle(listName)
                    : web.get_lists().getById(listId);

            itemArray.forEach(function (item) {
                var fieldArray = item.fieldArray,
                    idNode = getIdNode(fieldArray, item.node.node),
                    itemId = idNode ? idNode.value() : '',
                    listItem = itemId
                        ? spList.getItemById(itemId)
                        : spList.addItem(new SP.ListItemCreationInformation());

                fieldArray.forEach(function (fieldItem) {
                    if (fieldItem && fieldItem.internalName) {
                        listItem.set_item(fieldItem.internalName, fieldItem.value);
                    }
                });

                item.listItem = listItem;

                listItem.update();
                context.load(listItem);
            });

            return executeQueryWithPromise(context);
        }

        function fileExistsAsync(fileUrl) {
            var context = getContext(),
                siteUrl = getDomainFromUrl(fileUrl),
                web = getWeb(context, fileUrl);

            if (!isInHostWebDomain(fileUrl)) {
                return Q(false);
            }

            fileUrl = fileUrl.replace(siteUrl, '');
            if (fileUrl[0] !== '/') {
                fileUrl = '/' + fileUrl;
            }

            var spFile = web.getFileByServerRelativeUrl(fileUrl);

            context.load(spFile);

            return executeQueryWithPromise(context)
                .then(function () {
                    return true;
                }).catch(function () {
                    return false;
                });
        }

        function deleteFileAsync(fileUrl) {
            var context = getContext(),
                siteUrl = getDomainFromUrl(fileUrl),
                web = getWeb(context, fileUrl);

            if (!isInHostWebDomain(fileUrl)) {
                return Q(false);
            }

            fileUrl = fileUrl.replace(siteUrl, '');
            if (fileUrl[0] !== '/') {
                fileUrl = '/' + fileUrl;
            }

            var fileToDelete = web.getFileByServerRelativeUrl(fileUrl);

            context.load(fileToDelete);

            return executeQueryWithPromise(context)
                .then(function () {
                    fileToDelete.deleteObject();

                    return executeQueryWithPromise(context);
                }).then(function () {
                    return true;
                }).catch(function () {
                    return false;
                });
        }

        function getListItemAsync(siteUrl, list, itemId) {
            var context = getContext(),
                web = getWeb(context, siteUrl),
                spLists = web.get_lists(),
                spList = list.useName
                    ? spLists.getByTitle(list.name)
                    : spLists.getById(list.id),
                spListItem = spList.getItemById(itemId);

            context.load(spListItem);

            return executeQueryWithPromise(context)
                .then(function () {
                    return spListItem;
                }, function () {
                    return null;
                });
        }

        function getListIdByNameAsync(siteUrl, listName) {
            var context = getContext(),
                web = getWeb(context, siteUrl),
                spLists = web.get_lists(),
                spList = spLists.getByTitle(listName);

            context.load(spList);

            return executeQueryWithPromise(context)
                .then(function () {
                    return spList.get_id().toString();
                })
                .fail(function (e) {
                    throw e;
                });
        }

        function loadRootSiteUrlAsync() {
            if (isAppOnlyMode) {
                return Q();
            }

            return scriptLoader.loadedAsync()
                .then(function () {
                    var context = getContext(),
                        spSite = getHostWebContext(context, hostweburl).get_site();

                    context.load(spSite);
                    return executeQueryWithPromise(context)
                        .then(function () {
                            SharePointAccess.hostRootSiteUrl = spSite.get_url();
                        })
                        .catch(function () {
                            console.error('Cannot intialize root site url');
                        });
                });
        }

        // instance methods
        var me = {
            getUser: getUser,
            submitFormAsync: submitFormAsync,
            getDocumentAsync: getDocumentAsync,
            queryListXmlAsync: queryListXmlAsync,
            loadUserAsync: loadUserAsync,
            submitToListAsync: submitToListAsync,
            fileExistsAsync: fileExistsAsync,
            deleteFileAsync: deleteFileAsync,
            getListItemAsync: getListItemAsync,
            getListIdByNameAsync: getListIdByNameAsync,
            // TODO: May not be needed anymore. remove?
            getFile: getFile,
            isInHostWebDomain: isInHostWebDomain,
            loadRootSiteUrlAsync: loadRootSiteUrlAsync
        };

        var nonApiMethods = ['loadRootSiteUrlAsync', 'loadUserAsync', 'getUser', 'isInHostWebDomain'];

        // wrap instance methods in the spApiFunc wrapper then return them all
        return Object.keys(me).reduce(function (obj, next) {
            obj[next] = nonApiMethods.indexOf(next) === -1
                ? spApiFunc(me[next])
                : me[next];

            return obj;
        }, {});
    }


    // "public static" members
    SharePointAccess.hostweburl = hostweburl;
    SharePointAccess.ensureSharePointFilename = ensureSharePointFilename;
    SharePointAccess.isAppOnlyMode = isAppOnlyMode;
    SharePointAccess.NamespaceIPData = NamespaceIPData;
    SharePointAccess.DataFieldsElement = DataFieldsElement;
    SharePointAccess.addUserValue = addUserValue;
    SharePointAccess.addLookupValue = addLookupValue;
    SharePointAccess.convertDate = convertDate;
    SharePointAccess.hostRootSiteUrl = '';

    return SharePointAccess;
})(Qd, qd);