var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.CreateSharePointFolder = (function (qd) {
    "use strict";

    var cnt = qd.FormsViewer.qRules.Constants,
        errMsgs = qd.FormsViewer.qRules.errorMessages,
        optionalParameters = [{
            name: cnt.paramType,
            description: 'Either Folder or DocumentSet. Default is Folder.'
        },
        {
            name: cnt.paramContentType,
            description: 'A custom content type name or ID to use.'
        },
        {
            name: cnt.paramContentTypeIsId,
            description: '(Boolean) true to indicate that the /' + cnt.paramContentType + ' value is a content type ID (false by default).'
        },
        {
            name: cnt.paramSiteUrl,
            description: 'Url of the SharePoint site where the folder or document set should be created. Required if not specified in a definition file.'
        },
        {
            name: cnt.paramLibrary,
            description: 'Name of the library where the folder or document set should be created.  Required if not specified in a definition file.'
        },
        {
            name: cnt.paramDefinitionSource,
            description: 'Name of the data source where a custom definition is.'
        },
        {
            name: cnt.paramDefinitionName,
            description: 'Name of the definition within the definition file.'
        }],
        requiredParameters = [{
            name: cnt.paramName,
            description: 'The name of the document set to create or path of the new folder to create, relative to the list or library.'
        }],
        paramWebService = {
            name: cnt.paramWebService,
            description: 'The name of a data connection set up to use Lists.asmx\'s UpdateListItems method. (Required when creating folders from Filler mode.)'
        };

    function validateDefinitionParams(definitionSource, definitionName) {
        var srcSpecified = !!definitionSource,
            nameSpecified = !!definitionName;

        if (!!(srcSpecified ^ nameSpecified)) {
            throw new Error('/' + cnt.paramDefinitionSource + ' and /' + cnt.paramDefinitionName + ' must both be specified if either is specified.');
        }

        return srcSpecified;
    }

    function validateValue(value, propertyName) {
        if (!value) {
            throw new Error(propertyName + " must be specified either as a parameter or in the document set definition.");
        }
    }

    function CreateSharePointFolder(params) {
        var cf = params.commonFunction,
            shpAccess = params.shpAccess,
            qfsAccess = params.qfsAccess,
            cTypeInfo = qd.FormsViewer.qRules.ContentTypeCreationInfo();

        function getContentTypeCreationInfo(useDefinition, definitionSource, definitionName, name, siteUrl, library, contentType, typeIsId, type) {
            var info = JSON.parse(JSON.stringify(cTypeInfo.contentTypeInfo));

            if (useDefinition) {
                var defScrDom = cf.getDataSource(definitionSource);

                info = cTypeInfo.fromDefinition(defScrDom, definitionName);
            }
            else {
                // Default to folder unless specified otherwise
                info.type = cTypeInfo.folder;
            }

            info.name = name;

            if (!!siteUrl) {
                info.siteUrl = siteUrl;
            }
            if (!!library) {
                info.libraryName = library;
            }
            if (!!contentType) {
                info.contentType = contentType;
            }
            if (typeIsId) {
                info.typeIsId = typeIsId;
            }
            if (!!type) {
                info.type = cTypeInfo.getDefinitionType(type);
            }

            return info;
        }

        function getCreationInfo() {
            var type = cf.getParamValue(cnt.paramType),
                siteUrl = cf.getParamValue(cnt.paramSiteUrl),
                library = cf.getParamValue(cnt.paramLibrary),
                name = cf.getParamValue(cnt.paramName),
                contentType = cf.getParamValue(cnt.paramContentType),
                definitionSource = cf.getParamValue(cnt.paramDefinitionSource),
                definitionName = cf.getParamValue(cnt.paramDefinitionName),
                typeIsId = cf.getBoolParamValue(cnt.paramContentTypeIsId, false),
                useDefinition = validateDefinitionParams(definitionSource, definitionName);

            return getContentTypeCreationInfo(useDefinition, definitionSource, definitionName, name, siteUrl, library, contentType, typeIsId, type);
        }

        function validateValues(info) {
            validateValue(info.siteUrl, "Site url");
            validateValue(info.libraryName, "Library name");
        }

        function validatePath(path) {
            if (("/" + path + "/").indexOf("/../") >= 0) {
                throw new Error("Path cannot contain \"/../\".");
            }

            if (path.indexOf("/") === 0) {
                throw new Error("Path cannot start with \"/\".");
            }
        }

        function createFolderAsync(info) {
            validatePath(info.name);

            var createFolderAsync = SharePointAccess.isAppOnlyMode
                ? qfsAccess.createFolderAsync
                : shpAccess.createFolderAsync;

            return createFolderAsync(info.siteUrl, info.libraryName, info.name)
                .then(function (result) {
                    return {
                        success: result.success,
                        error: result.error
                    };
                });
        }

        function executeAsync() {
            var info = getCreationInfo();

            validateValues(info);

            if (info.type === cTypeInfo.folder) {
                return createFolderAsync(info);
            }
            else if (info.type === cTypeInfo.documentSet) {
                throw new Error("Document set is not implemented.")
            }
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }


    return CreateSharePointFolder;
})(Qd);

Qd.FormsViewer.qRules.ContentTypeCreationInfo = (function () {

    function ContentTypeCreationInfo() {

        var unspecified = "unspecified",
            documentSet = "documentset",
            folder = "folder",
            contentTypeInfo = {
                siteUrl: '',
                libraryName: '',
                contentType: '',
                name: '',
                contentTypeIsId: '',
                contentTypeType: '',
                fields: '',
                type: '',
                typeIsId: false
            };

        function getByName(definitions, name) {
            var found = definitions.selectNodes("/Definitions/Definition[@name]")
                .filter(function (node) {
                    var nameValue = node.getAttribute("name");
                    return nameValue && (nameValue.toLowerCase() === name.toLowerCase());
                });

            if (!found.length) {
                throw new Error("Definition not found: '" + name + "'");
            }

            return found[0];
        }

        function getDefinitionTypeFromNode(definitionNode) {
            var type = definitionNode.getAttribute("type");

            if (!type) {
                throw new Error("Definition type unspecified.");
            }

            return getDefinitionType(type);
        }

        //TODO: Implement for document set
        function getFields(definition) {
            //var fieldNodes = definition.selectNodes('Fields/Field[@name and (@value or @path)]');

            return {};
        }

        function loadProperties(definitionNode, info) {
            var properties = definitionNode.selectSingle("Properties");

            if (properties != null) {
                var siteUrlAttr = properties.getAttribute("siteUrl"),
                    libraryAttr = properties.getAttribute("library"),
                    typeAttr = properties.getAttribute("contentType"),
                    typeIsIdAttr = properties.getAttribute("typeIsId");

                if (!!siteUrlAttr) {
                    info.siteUrl = siteUrlAttr;
                }
                if (!!libraryAttr) {
                    info.libraryName = libraryAttr;
                }
                if (!!typeAttr) {
                    info.contentType = typeAttr;
                }

                var typeIsIdAttrLower = typeIsIdAttr ? typeIsIdAttr.toLowerCase() : '';
                info.contentTypeIsId = typeIsIdAttrLower === "true" || typeIsIdAttrLower === "1";
            }
        }

        function fromDefinitionNode(definitionNode) {
            var info = JSON.parse(JSON.stringify(contentTypeInfo));
            info.type = getDefinitionTypeFromNode(definitionNode);
            info.fields = getFields(definitionNode);//TODO:Implementation required for DocumentSet

            loadProperties(definitionNode, info);

            return info;
        }

        function fromDefinition(definitionsDom, name) {
            var definition = getByName(definitionsDom, name);

            return fromDefinitionNode(definition);
        }

        function getDefinitionType(type) {
            switch (type.toLowerCase()) {

                case "folder":
                    return folder;

                case "documentset"://For now throw error for this type
                default:
                    throw new Error("Invalid definition type: '" + type + "'.");
            }
        }

        return {
            contentTypeInfo: contentTypeInfo,
            unspecified: unspecified,
            documentSet: documentSet,
            folder: folder,
            fromDefinition: fromDefinition,
            getDefinitionType: getDefinitionType
        };
    }

    return ContentTypeCreationInfo;
})();