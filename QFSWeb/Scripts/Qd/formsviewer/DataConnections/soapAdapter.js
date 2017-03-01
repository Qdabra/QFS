var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.DataConnections = Qd.FormsViewer.DataConnections || {};

(function (qd, dc) {
    "use strict";

    /** Creates a new SOAP adapter 
     * @param {definition} definition - The data source definition object
     * @param {api} api - an instance of the FormsViewer web API
     * @Returns {soapAdapter}
     */
    function soapAdapter(definition, template, api, xpathEngine, dataSources) {
        var url = dc.utils.combinePath(template.getBasePath(), definition.serviceUrl),
            methodName = definition.methodName,
            soapAction = definition.soapAction;

        // DataSource, DomNode -> void
        function setQueryResult(dataSource, node) {
            var dom = dataSource.getDom(),
                dataFieldsNode = dc.utils.getDataFieldsNode(dom);

            if (dataFieldsNode) {
                $(dataFieldsNode).empty()
                                 .append($(node).children());
            }
        }

        /**
         * Retrieves the initial source for this data adapter
         * @returns - Promise for a DOMNode
         */
        function getWebServiceSourceAsync() {
            return template.getTemplateFileAsync(definition.input.source)
            .then($.parseXML);
        }

        /**
         * Retrieves the DOM to use for submitting
         * if dataSource is specified, returns the dataSource's DOM, 
         * or otherwise a DOM for the adapter's template file
         */
        function getDomAsync(dataSource) {
            if (dataSource) {
                return Q(dataSource.getDom());
            }

            return getWebServiceSourceAsync();
        }

        // WebServiceInputFragment -> Array[DOMNode]
        function getFragmentValues(fragmentDefinition) {
            var dataSource = dataSources.getDom(fragmentDefinition.dataObject);

            var contextNode = dataSource.selectSingle(fragmentDefinition.replaceWith);

            if (contextNode) {
                if (fragmentDefinition.filter) {
                    return contextNode.selectNodes(fragmentDefinition.filter).map(function (n) {
                        return n.getNode();
                    });
                } else {
                    return Array.prototype.slice.call(contextNode.getNode().childNodes);
                }
            }

            return [];
        }

        function setWebServiceSubmitDestNode(destNode, fragmentValues, asString) {
            function getStringValue(node) {
                if (node.nodeType === DOM_DOCUMENT_NODE) {
                    return FVUtil.xmlToString2(node);
                }

                return FVUtil.xmlToString(node);
            }

            if (asString) {
                $(destNode).text(fragmentValues.map(getStringValue).join(""));
            } else {
                $(destNode).append($(fragmentValues));
            }
        }

        function prepareSubmitInput(dom) {
            var fragments = definition.input.fragments;

            if (fragments) {
                fragments.forEach(function (fragment) {
                    var fragmentValues = getFragmentValues(fragment),
                        destNode = xpathEngine.evaluateXPath(fragment.match, { context: dom }).first();

                    if (destNode) {
                        setWebServiceSubmitDestNode(destNode, fragmentValues, fragment.sendAsString)
                    }
                });
            }

            return dom;
        }

        function getRequestBody(dom, isQuery) {
            return isQuery
                ? dc.utils.getQueryXml(dom)
                : dc.utils.getDataFieldsContent(dom);
        }

        function executeDirectAsync(dataSource) {
            var responseXml;

            return getDomAsync(dataSource)
            .then(function (dom) {
                var body;

                if (!dom) {
                    throw new Error("Unable to prepare the request XML for data source " + definition.name);
                }

                dom = dom.cloneNode(true);

                prepareSubmitInput(dom);

                dom = getRequestBody(dom, true);

                if (typeof XMLSerializer !== "undefined") {
                    body = new window.XMLSerializer().serializeToString(dom);
                } else {
                    body = dom.xml;
                }

                return api.queryDirectSoapAsync({
                    url: definition.serviceUrl,
                    method: definition.methodName,
                    appendMethodToURL: false,
                    xhrFields: {
                        withCredentials: true
                    },
                    crossDomain: true,
                    SOAPAction: definition.soapAction,
                    soap12: false,
                    async: true,

                    data: body,
                    context: this,

                    HTTPHeaders: "",
                    envAttributes: "",
                    SOAPHeader: "",

                    noPrefix: true,

                    enableLogging: true,

                    success: function (SOAPResponse) {
                        responseXml = SOAPResponse.toXML();
                    },
                    error: function (SOAPResponse) {
                        throw new Error(SOAPResponse.toString());
                    },
                    statusCode: {
                        404: function () {
                            var error = "404";
                        },
                        200: function () {
                            var error = "200";
                        }
                    }
                });
            })
            .then(function (data) {

                var dataDom = data.documentElement.firstChild;

                if (dataSource) {
                    setQueryResult(dataSource, dataDom);
                }

                return dataDom;

            });
        }

        function executeAsync(dataSource) {
            /* 
				If url is in the proxy bypass list, then do not use the proxy methods
			*/
            // JIM: TODO - make setting dynamic to environment
            if (dc.IsInByPassProxyList(definition.serviceUrl)) {
                return executeDirectAsync(dataSource);
            }
            return getDomAsync(dataSource)
            .then(function (dom) {
                var body;

                if (!dom) {
                    throw new Error("Unable to prepare the request XML for data source " + definition.name);
                }

                dom = dom.cloneNode(true);

                prepareSubmitInput(dom);

                body = getRequestBody(dom, !!dataSource);

                return api.querySoapAsync(url, methodName, soapAction, qd.util.xmlToString(body))
            })
            .then(function (data) {
                if (data.success) {
                    var dataDom = $.parseXML(data.resultBody);

                    if (dataSource) {
                        setQueryResult(dataSource, dataDom);
                    }

                    return dataDom;
                }

                throw new Error(data.message);
            });
        }

        function initAsync(dataSource) {
            if (dataSource) {
                return getWebServiceSourceAsync()
                .then(function (dom) {
                    dataSource.setDom(dom)
                });
            }

            return Q.Promise.resolve();
        }

        function setUrl(serviceUrl) {
            url = serviceUrl;
        }

        function getUrl() {
            return url;
        }

        return {
            /** Executes this data connection and updates the specified data 
             *  source with the new data
             * @param {dataSource} dataSource - The data source
             * @returns {Promise}
             */
            executeAsync: executeAsync,
            initAsync: initAsync,
            setUrl: setUrl,
            getUrl: getUrl
        };
    }

    dc.soapAdapter = soapAdapter;
})(Qd, Qd.FormsViewer.DataConnections);