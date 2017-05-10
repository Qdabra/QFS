var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};

(function ($, fv) {
    function create(api, files, instanceId) {
        // templateFiles is Object[String -> String] indexed on file names
        var templateFiles = {};

        files.forEach(function (fileItem) {
            templateFiles[fileItem.Name] = fileItem.Contents;
        });

        var manifestStr = templateFiles["manifest.xsf"],
            manifest = $.parseXML(manifestStr),
            manifestParser = new ManifestParser(),
            defaultView,
            xpathEngine = new XPathEngine();

        function getTemplateName() {
            if (api.getAccessType() === 'templateName') {
                return api.getTemplateLocation();
            }

            return null;
        }

        function evaluateXPath(context, path) {
            return xpathEngine.evaluateXPath(path, { context: context });
        }

        function getAndCacheFileAsync(fileName) {
            return api.getTemplateFileAsync(fileName, instanceId)
            .then(function (data) {
                // TODO: check result for errors
                var contents = data.Contents;
                templateFiles[fileName] = contents;
                return contents;
            });
        }

        function getTemplateFileAsync(fileName) {
            var file = templateFiles[fileName],
                p = file ? Q.Promise.resolve(file) : getAndCacheFileAsync(fileName);

            return p;
        }

        function getViewDefinitionAsync(viewName) {
            var viewFileName = manifestParser.getViewFilename(viewName);

            return api.requestView(viewFileName, instanceId);
        }

        function getViews() {
            return manifestParser.getViews();
        }

        function getDefaultView() {
            if (!defaultView) {
                var views = getViews();
                defaultView = views[0];
            }

            return defaultView;
        }

        // =========================
        // Rule definition retrieval
        // =========================

        // String, String -> RuleSet
        function getButtonRules(viewName, buttonName) {
            var viewRules = manifestParser.getButtonRules(viewName);

            return viewRules ? viewRules[buttonName] : null;
        }

        function isMatch(domNode, xpath) {
            var dom = FVUtil.getDocumentElement(domNode),
                matches = evaluateXPath(dom, xpath);

            return matches && matches.toUnsortedArray().some(function (n) {
                return n === domNode;
            });
        }

        function findRuleSetMatch(domNode, candidates) {
            var i, candidate;
            for (i = 0; i < candidates.length; i += 1) {
                candidate = candidates[i];
                if (isMatch(domNode, candidate.match)) {
                    return candidate;
                }
            }

            return null;
        }

        function getRulesForField(domName, domNode) {
            var nodeName = domNode.nodeName,
                nameToUse = (domNode.nodeType === DOM_ATTRIBUTE_NODE) ? ("@" + nodeName) : nodeName,
                ruleCandidates = manifestParser.getFieldRuleCandidates(domName, nameToUse);

            if (ruleCandidates) {
                return findRuleSetMatch(domNode, ruleCandidates);
            }
            return null;
        }

        function getOnLoadRules() {
            return manifestParser.getOnLoadRules();
        }

        // DOMNode, String -> Array[XmlToEdit]
        function getXmlToEdits(domNode, viewName) {
            var editableComponents = manifestParser.getEditableComponents(viewName);

            return filter(editableComponents, function (comp) {
                return isMatch(domNode, comp.fullItem);
            });
        };

        // =============================
        // END Rule definition retrieval
        // =============================

        // void -> DefaultValue[]
        function getAllDefaultValues() {
            return manifestParser.getAllDefaultValues();
        }

        // DomNode -> DefaultValue[]
        function getDependentDefaultValues(node) {
            // TODO: Make this smarter; currently just returning all default values
            return manifestParser.getAllRefDefaultValues();
        }

        function getTemplateFileName() {
            // TODO: retrieve this value from the manifest (pri 4 since it will almost always be template.xml)
            return "template.xml";
        }

        function getEditableComponent(viewName, ecName) {
            return manifestParser.getEditableComponent(viewName, ecName);
        }

        // String -> Array[ContextMenuItem]
        function getContextMenuItems(viewName, xmlToEdit) {
            return manifestParser.getContextMenuItems(viewName, xmlToEdit);
        }

        // =================================
        // Data connection setting retrieval
        // =================================

        function getQueryAdapter(dcName) {
            return manifestParser.getQueryAdapter(dcName);
        }

        function getSubmitAdapter(dcName) {
            return manifestParser.getSubmitAdapter(dcName);
        }

        function getSubmitSettings() {
            return manifestParser.getSubmitSettings();
        }

        function getDataSourceDefinitions() {
            return manifestParser.getDataSources();
        }

        function getDataConnectionDefinitions() {
            return manifestParser.getDataConnections();
        }

        function listDataSources() {
            return manifestParser.listDataSources();
        }

        // =================================
        // END Data connection setting retrieval
        // =================================

        function getBasePath() {
            return manifestParser.getBasePath();
        }

        function getSolutionVersion() {
            return manifestParser.getSolutionVersion();
        }

        function getUpgradeSettings() {
            return manifestParser.getUpgradeSettings();
        }

        function getNamespaceManager() {
            return FVUtil.buildNamespaceManager(manifest, FVNamespaceResolver);
        }

        function getXPathEngine() {
            return xpathEngine;
        }

        function getTemplateUrlFromApi() {
            var accessType = api.getAccessType(),
                templateLocation = api.getTemplateLocation();

            switch (accessType) {
                case fv.Constants.AccessTypes.Template:
                    return templateLocation;
                case fv.Constants.AccessTypes.Library:
                    return templateLocation.replace(/\/+$/, '') + '/Forms/template.xsn';
            }

            return null;
        }

        function getWssUrl() {
            var wssPath = manifestParser.getWssPath();

            if (wssPath) {
                return wssPath + "Forms/template.xsn";
            }

            return null;
        }

        function getHrefUrl() {
            return manifestParser.getBaseUrl() ||
                getWssUrl() ||
                manifestParser.getPublishUrl() ||
                getTemplateUrlFromApi();
        }

        function getResourceAbsoluteUrl(name) {
            var urlPrefix = api.getImagePrefix(instanceId);
            return urlPrefix += name;
        }

        manifestParser.setManifest(manifestStr);
        xpathEngine.nsr = getNamespaceManager();

        return {
            getTemplateFileName: getTemplateFileName,
            getViewDefinitionAsync: getViewDefinitionAsync,
            getButtonRules: getButtonRules,
            getSubmitSettings: getSubmitSettings,
            getBasePath: getBasePath,
            getRulesForField: getRulesForField,
            getSubmitAdapter: getSubmitAdapter,
            getQueryAdapter: getQueryAdapter,
            getDefaultView: getDefaultView,
            getOnLoadRules: getOnLoadRules,
            getAllDefaultValues: getAllDefaultValues,
            getDependentDefaultValues: getDependentDefaultValues,
            getEditableComponent: getEditableComponent,
            getSolutionVersion: getSolutionVersion,
            getUpgradeSettings: getUpgradeSettings,
            getTemplateFileAsync: getTemplateFileAsync,
            getDataSourceDefinitions: getDataSourceDefinitions,
            getDataConnectionDefinitions: getDataConnectionDefinitions,
            listDataSources: listDataSources,
            getXmlToEdits: getXmlToEdits,
            getContextMenuItems: getContextMenuItems,
            getNamespaceManager: getNamespaceManager,
            getXPathEngine: getXPathEngine,
            getHrefUrl: getHrefUrl,
            getTemplateName: getTemplateName,
            getViews: getViews,
            getResourceAbsoluteUrl: getResourceAbsoluteUrl
        };
    }

    function getInstanceId(manifestResponse) {
        var properties = manifestResponse.FormProperties,
            propertiesInner = properties && properties.FormProperties, // intentional - the FormProperties property is nested in a property of the same name
            instanceIdProp = propertiesInner && propertiesInner.filter(function (prop) { return prop.Name === 'instanceId'; })[0],
            instanceId = instanceIdProp && instanceIdProp.Value;

        return instanceId;
    }

    function createAsync(api, getTemplateXml) {

        return Q()
            .then(function () {
                var queryTemplateInfo = api.getAccessType() === "templateName";

                if (!queryTemplateInfo) {
                    return null;
                }

                return api.getTemplateInfoAsync();
            })
            .then(function (result) {
                var instanceId = result ? result.instanceId : null;
                return api.getTemplateDefinitionAsync(getTemplateXml, instanceId)
                    .then(function (result) {
                        var instanceId = result.InstanceId,
                            files = result.Files;

                        if (instanceId) {
                            api.setAccessType('templateName', result.TemplateName);
                        }

                        if (files) {
                            return create(api, files, instanceId);
                        } else if (result.error === true) {
                            throw new Error("Manifest retrieval failed with the error: " + result.message);
                        } else {
                            console.error(result);
                            throw new Error("Could not access manifest data.");
                        }
                    })
                    .catch(function (err) {
                        if (err && err.status === 404) {
                            var templateLocation = api.getTemplateLocation(),
                                errMsg = "Template not found";

                            if (templateLocation) {
                                errMsg += ": " + templateLocation;
                            }

                            errMsg += ".\nThis template might have been deleted. Please verify the template name.";

                            err.userDisplayMessage = errMsg;
                        }

                        throw err;
                    })
                    .finally(function () {
                        FVUtil.perfMark('formsviewer_template_loaded');
                    });
            });
    }

    fv.template = {
        create: create,
        createAsync: createAsync
    };
})(jQuery, Qd.FormsViewer);

