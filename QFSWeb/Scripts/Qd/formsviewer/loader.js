var Qd = Qd || {},
    qd = qd || {};

Qd.FormsViewer = Qd.FormsViewer || {};

(function (qd, qdNew, fv) {
    "use strict";

    var ui = qd.FormsViewer.UI;

    function getMessageForError(error) {
        var message = error && (error.message || error.toString());
        return message || "Unknown failure.";
    }

    function loader(renderTarget) {
        var shpAccess = new SharePointAccess();

        function processTemplateXml(data) {
            qd.util.perfMark('formsviewer_mainfile_loaded');
            qd.util.perfMeasure('formsviewer_mainfile', 'formsviewer_template_loaded', 'formsviewer_mainfile_loaded');
            return $.parseXML(data);
        }

        function getHrefUrl(templateUrl, accessType) {
            return templateUrl + (accessType === "library" ? "Forms/template.xsn" : "");
        };

        function performXmlToEditAction(targetNode, action, xmlToEdit) {
            // moved
            //.then(renderViewAsync)
            //.done();
        };

        function updateCheckValue(checkbox) {
            checkbox.value = checkbox.getAttribute(checkbox.checked ? FormAttributes.ON_VALUE : FormAttributes.OFF_VALUE);
        }

        function createDataSources(template, mainDom, xpathEngine) {
            var sources = template.listDataSources().map(fv.DataSources.dataSource),
                mainDataSource = fv.DataSources.dataSource({ name: "", initialDom: mainDom });

            mainDataSource.reassignIds();

            return fv.dataSourceCollection(sources.concat(mainDataSource), xpathEngine);
        }

        function createDataConnections(template, api, shpAccess, xpathEngine, dataSources) {
            var definitions = template.getDataConnectionDefinitions(),
                factory = fv.DataConnections.dataConnectionFactory(api, shpAccess, template, xpathEngine, dataSources),
                connections = Object.keys(definitions)
                    .map(function (key) {
                        return factory.makeDataConnection(key, definitions[key].type, definitions[key]);
                    });

            return fv.DataConnections.dataConnectionCollection(connections);
        }

        function setPiAttributes(pi, values) {
            var piDom = FVUtil.makePiDom(pi);

            Object.keys(values).forEach(function (key) {
                piDom.setAttribute(key, values[key]);
            });

            pi.nodeValue = Array.prototype.slice.call(piDom.attributes).map(FVUtil.xmlToString).join(" ");
        }

        function ensureProcessingInstruction(node, piName, values, addIfMissing) {
            var pi = FVUtil.getProcessingInstruction(node, piName);

            if (!pi) {
                if (addIfMissing) {
                    pi = FVUtil.addNewPi(node, piName);
                } else {
                    return;
                }
            }

            setPiAttributes(pi, values);
        }

        // DomNode, string -> DomNode
        function ensureProcessingInstructions(domDocument, template, href) {
            var solutionVersion = template.getSolutionVersion(),
                templateName = template.getTemplateName();

            if (href) {
                // TODO: add PI if missing?
                ensureProcessingInstruction(domDocument, "mso-infoPathSolution", {
                    solutionVersion: solutionVersion,
                    href: href
                }, false);
            }

            if (templateName) {
                ensureProcessingInstruction(domDocument, "QdabraFormsViewer",
                {
                    templateName: templateName
                }, true);
            }

            return domDocument;
        }

        function getCoreForTemplateAsync(templateLocator, accessType) {
            var api = qd.qfsAccess(accessType, templateLocator),
                pTemplate = fv.template.createAsync(api, true);

            var pTemplateXml = pTemplate.then(function (template) {
                return template.getTemplateFileAsync(template.getTemplateFileName());
            })
            .then(processTemplateXml);

            return Q.spread([pTemplate, pTemplateXml], function (template, mainXml) {
                ensureProcessingInstructions(mainXml, template, template.getHrefUrl());

                return {
                    api: api,
                    template: template,
                    xpathEngine: template.getXPathEngine(),
                    mainXml: mainXml
                };
            });
        }

        function getPiAttribute(ownerNode, piName, attributeName) {
            var pi = FVUtil.getProcessingInstruction(ownerNode, piName),
                piDom = pi && FVUtil.makePiDom(pi);

            return piDom && piDom.getAttribute(attributeName);
        }

        function determineTemplateLocation(dom) {
            var templateName = getPiAttribute(dom, "QdabraFormsViewer", "templateName"),
                href = getPiAttribute(dom, "mso-infoPathSolution", "href");

            if (!(templateName || href)) {
                throw new Error("Unable to determine the template for the loaded document.");
            }

            return {
                templateName: templateName,
                href: href
            };
        }

        function tryUpgradeDocumentAsync(document, template, api) {
            return UpgradeEngine.create(template).tryUpgradeAsync(document, api);
        }

        function getDocumentAnonAsync(documentUrl) {
            return qd.qfsAccess.getSharePointFileAsync(documentUrl)
                .then(function (result) {
                    if (!result) {
                        throw new Error("Could not retrieve document. No response received.");
                    }
                    if (!(result.Success && result.Data)) {
                        throw new Error(result.error);
                    }
                    return result.Data;
                });
        }

        function getDocumentClientAsync(documentUrl) {
            return shpAccess.getDocumentAsync(documentUrl);
        }

        function getDocumentAsync(documentUrl) {
            return SharePointAccess.isAppOnlyMode
                ? getDocumentAnonAsync(documentUrl)
                : getDocumentClientAsync(documentUrl);
        }

        function getCoreForFileAsync(documentUrl) {
            var pMainXml = getDocumentAsync(documentUrl)
                .catch(function (err) {
                    var errMsg = 'An error occurred trying to load the document at<br/>' + documentUrl;

                    if (err.message) {
                        errMsg += '<br/><br/>' + err.message;
                    }

                    err.userDisplayMessage = errMsg;
                    throw err;
                })
                .then($.parseXML.bind($));

            var pTemplateLocation = pMainXml.then(determineTemplateLocation);

            var pApi = pTemplateLocation.then(function (location) {
                if (location.templateName) {
                    return qd.qfsAccess("templateName", location.templateName);
                } else {
                    return qd.qfsAccess("template", location.href);
                }
            });

            var pTemplate = pApi.then(function (api) {
                return fv.template.createAsync(api, false);
            });

            var pMainXmlUpgraded = Q.spread([pMainXml, pTemplate, pApi], function (mainXml, template, api) {
                return tryUpgradeDocumentAsync(mainXml, template, api);
            });

            return Q.spread([pTemplate, pMainXmlUpgraded, pApi, pTemplateLocation], function (template, mainXml, api, location) {
                ensureProcessingInstructions(mainXml, template, location.href);

                return {
                    api: api,
                    template: template,
                    mainXml: mainXml,
                    xpathEngine: template.getXPathEngine()
                };
            });
        }

        function loadCoreAsync(loadParams) {
            return loadParams.template
                ? getCoreForTemplateAsync(loadParams.template, loadParams.accessType)
                : getCoreForFileAsync(loadParams.documentUrl);
        }

        function loadUserInfoAsync() {
            if (SharePointAccess.isAppOnlyMode) {
                return qd.qfsAccess.loadRootSiteUrlAsync();
            }

            return shpAccess.loadRootSiteUrlAsync()
                .then(function () {
                    return shpAccess.loadUserAsync();
                });
        }

        function getRuleSetExecutor(dataConnections, dataSources, viewManager, xpathEngine) {
            var rs = fv.Rules,
                actionExecutor = rs.actionExecutor.create(dataConnections, dataSources, viewManager, xpathEngine),
                ruleExecutor = rs.ruleExecutor.create(actionExecutor, xpathEngine),
                ruleSetExecutor = rs.ruleSetExecutor.create(ruleExecutor);

            return ruleSetExecutor;
        }

        function performFormInitAsync(core) {
            var template = core.template,
                mainXml = core.mainXml,
                xpathEngine = template.getXPathEngine(),
                dataSources = createDataSources(template, mainXml, xpathEngine),
                dataConnections = createDataConnections(core.template, core.api, shpAccess, xpathEngine, dataSources),
                viewManager = fv.viewManager(template, renderTarget, null, dataSources);

            var ruleSetExecutor = getRuleSetExecutor(dataConnections, dataSources, viewManager, xpathEngine);
            var functions = qdNew.formsViewer.xpathFunctions.fvFunctions(dataSources, shpAccess.getUser());
            xpathEngine.functions = functions;

            var engine = fv.engine(
                viewManager,
                mainXml,
                template,
                functions,
                renderTarget,
                shpAccess,
                xpathEngine,
                ruleSetExecutor,
                dataConnections,
                dataSources,
                core.api);

            return engine.initAsync();
        }

        function showLoadFailedMessage(err) {
            // intentionally not returning so that wait overlay can hide
            var isHtmlMsg = true;//Show message as HTML
            ui.showLoadFailedError(err, renderTarget, isHtmlMsg);
        }

        function load(loadParams) {
            qd.util.perfMark('formsviewer_start_load');

            return Q.Promise.all([loadCoreAsync(loadParams), loadUserInfoAsync()])
                .then(function (result) { return result[0]; })
                .finally(function () { qd.util.perfMark('formsviewer_core_loaded'); })
                .then(performFormInitAsync)
                .catch(function (err) {
                    showLoadFailedMessage(err);
                })
                .finally(function () {
                    qd.util.perfMeasure('formsviewer_pre_start', 'domComplete', 'formsviewer_start_load')
                    qd.util.perfMeasure('formsviewer_template', 'formsviewer_start_load', 'formsviewer_template_loaded');
                    qd.util.perfMeasure('formsviewer_core', 'formsviewer_start_load', 'formsviewer_core_loaded');
                });
        }

        function loadTemplate(template, accessType) {
            return load({
                template: template,
                // Default to "template", allow "library"
                accessType: accessType
            });
        }

        function loadDocument(documentUrl) {
            return load({
                documentUrl: documentUrl
            });
        }

        return {
            loadTemplate: loadTemplate,
            loadDocument: loadDocument
        };
    }


    fv.loader = loader;
})(Qd, qd, Qd.FormsViewer);