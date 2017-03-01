var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.SaveToDbxl = (function (qd) {
    'use strict';

    var constants = qd.FormsViewer.qRules.constants,
        optionalParameters = [
            {
                name: constants.paramDsName,
                description: 'Data Source Name'
            },
            {
                name: constants.paramQdImage,
                description: '(boolean, defaults to false) Create a QdImage Document for a Saved Picture (yes | no)]'
            },
            {
                name: constants.paramAutoOpen,
                description: '(boolean, defaults to false) Use links that automatically open the saved-out files rather than the documents they are stored in.'
            },
            {
                name: constants.paramDomainId,
                description: 'A DBXL domain with which to associate the saved-out file'
            }],
        requiredParameters = [
            {
                name: constants.paramSubmit,
                description: 'DBXL Submit Adapter Name'
            },
            {
                name: constants.paramXPath,
                description: 'XPath to Picture(s) or Attachment(s)'
            }],
            saveToDbxlQdFileXmlTemplate = "<?xml version='1.0' encoding='UTF-8'?><?mso-infoPathSolution "
            + "name='urn:schemas-microsoft-com:office:infopath:QdFile:-myXSD-2008-08-21T22-28-06' href='manifest.xsf' solutionVersion='1.0.0.3' "
            + "productVersion='12.0.0' PIVersion='1.0.0.0' ?><?mso-application progid='InfoPath.Document'?><?mso-infoPath-file-attachment-present?>"
            + "<my:QdFile xmlns:my='http://schemas.microsoft.com/office/infopath/2003/myXSD/2008-08-21T22:28:06' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'>"
            + "<my:File/><my:DomainId xsi:nil='true'/></my:QdFile>",
            saveToDbxlQdImageXmlTemplate = "<?xml version='1.0' encoding='UTF-8'?><?mso-infoPathSolution "
            + "name='urn:schemas-microsoft-com:office:infopath:QdImage:-myXSD-2009-01-23T19-16-16' href='manifest.xsf' solutionVersion='1.0.0.1' "
            + "productVersion='12.0.0' PIVersion='1.0.0.0'?><?mso-application progid='InfoPath.Document' versionProgid='InfoPath.Document.2'?>"
            + "<my:QdImage xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:my='http://schemas.microsoft.com/office/infopath/2003/myXSD/2009-01-23T19:16:16'>"
            + "<my:DatePublished/><my:UserName/><my:Image my:qRulesLink='' my:qRulesFilename='' my:qdFileDocId='' my:qdDomainId='' xsi:nil='true'/>"
            + "<my:DateTaken/><my:Title/><my:Subject/><my:Location/><my:Creator/><my:Copyright/><my:IsPrivate>false</my:IsPrivate><my:Tags/></my:QdImage>",
            saveToDbxlQdAttachmentXmlTemplate = "<?xml version='1.0' encoding='UTF-8'?><?mso-infoPathSolution "
            + "name='urn:schemas-microsoft-com:office:infopath:QdAttachment:-myXSD-2009-01-23T19-16-16' href='manifest.xsf' solutionVersion='1.0.0.1' "
            + "productVersion='12.0.0' PIVersion='1.0.0.0'?><?mso-application progid='InfoPath.Document' versionProgid='InfoPath.Document.2'?>"
            + "<?mso-infoPath-file-attachment-present ?><my:QdAttachment xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' "
            + "xmlns:my='http://schemas.microsoft.com/office/infopath/2003/myXSD/2009-01-23T19:16:16'><my:DatePublished/><my:UserName/>"
            + "<my:File my:qRulesLink='' my:qRulesFilename='' my:qdFileDocId='' my:qdDomainId='' xsi:nil='true'/><my:DateCreated/><my:Title/><my:Subject/>"
            + "<my:Description/><my:Creator/><my:Copyright/><my:IsPrivate>false</my:IsPrivate><my:Tags/></my:QdAttachment>",
            saveToDbxlQdFileDocTypeName = 'QdFile',
            saveToDbxlQdImageDocTypeName = 'QdImage',
            saveToDbxlQdAttachmentDocTypeName = "QdAttachment",
            dbxlQdflowXmlTemplate =
            "<?xml version='1.0' encoding='UTF-8'?><?mso-infoPathSolution name='urn:schemas-microsoft-com:office:infopath:EmailFlow:-myXSD-2006-12-05T15-51-37' ?>"
            + "<?mso-application progid='InfoPath.Document'?>"
            + "<my:myFields xmlns:my='http://schemas.microsoft.com/office/infopath/2003/myXSD/2006-12-05T15:51:37'>"
            + "<my:HostDocType />"
            + "<my:HostDocId />"
	        + "<my:Alias />"
	        + "<my:Name />"
	        + "<my:Comment />"
	        + "<my:Date />"
	        + "<my:Time />"
	        + "<my:Status />"
	        + "<my:AssignedToAlias />"
	        + "<my:AssignedToName />"
	        + "<my:CCAddresses />"
            + "</my:myFields>",
            dbxlQdflowXmlTemplateWithEmail =
            "<?xml version='1.0' encoding='UTF-8'?><?mso-infoPathSolution name='urn:schemas-microsoft-com:office:infopath:EmailFlow:-myXSD-2006-12-05T15-51-37' ?><?mso-application progid='InfoPath.Document'?>"
            + "<my:myFields xmlns:my='http://schemas.microsoft.com/office/infopath/2003/myXSD/2006-12-05T15:51:37'>"
            + "<my:HostDocType />"
            + "<my:HostDocId />"
            + "<my:Alias />"
            + "<my:Name />"
            + "<my:Comment />"
            + "<my:Date />"
            + "<my:Time />"
            + "<my:Status />"
            + "<my:AssignedToAlias />"
            + "<my:AssignedToName />"
            + "<my:AssignedToEmail />"
            + "<my:CCAddresses />"
            + "</my:myFields>",
            dbxlQdflowMyNamespace = "http://schemas.microsoft.com/office/infopath/2003/myXSD/2006-12-05T15:51:37",
            dbxlQdflowDoctype = "QdEmailFlow",
            saveToDbxlErrorQdImage = "In order to create a QdImage document type along with the QdFile document type, the file must be attached using a picture control, not a file attachment control, and /qdimage must be set to yes.";

    function createXPathEngine(nameSpaceList) {
        var xPathEngine = new XPathEngine(),
            nsr = new FVNamespaceResolver();

        if (nameSpaceList) {
            nameSpaceList.forEach(function (nameSpace) {
                nsr.addNamespace(nameSpace.name, nameSpace.url);
            });
        }

        xPathEngine.nsr = nsr;
        return xPathEngine;
    }

    function SaveToDbxl(params) {

        function submitQdFileToDbxl(cf, submit, domainId, node) {
            var properties = cf.getBase64Values(node),
                fileName = properties.fileName,
                fileExtension = properties.fileExtension,
                fileSize = properties.fileSize,
                base64 = properties.base64,
                xdoc = $.parseXML(saveToDbxlQdFileXmlTemplate),
                xPathEngine = params.xpathEngine,
                utilities = params.utilities;

            cf.setNodeValueFromXPathEngine(xPathEngine, '/*/*[1]', xdoc, base64);

            if (domainId) {
                cf.setNodeValueFromXPathEngine(xPathEngine, '/*/*[2]', xdoc, domainId);
            }

            var submitConnection = params.dataConnections.get(submit),
                submitSource = cf.getDataSource(submit),
                submitDocumentObj = qd.FormsViewer.qRules.submitDocument.standard(submitSource, submitConnection),
                userName = '';//TODO:Get Username;

            return submitDocumentObj.querySubmitDocument(saveToDbxlQdFileDocTypeName, qd.util.xmlToString(xdoc), fileName, userName, fileSize + ' bytes')
                .then(function (result) {
                    return {
                        base64: base64,
                        docId: result.docId,
                        fileName: fileName
                    };
                });
        }

        function getDbxlDocumentsPath(submit) {
            var conn = params.dataConnections.get(submit),
                docUrl = conn.getUrl(),
                i = docUrl.toLowerCase().lastIndexOf("/");

            docUrl = (i > 0)
                ? docUrl.substr(0, i) + "/Documents"
                : null;

            return docUrl;
        }

        function getUserInfo(dsRoot, dataConn) {
            var cf = params.commonFunction,
                dataSource = dsRoot,
                dataConnection = dataConn,
                xPathEngine = createXPathEngine([{
                    name: "dfs",
                    url: "http://schemas.microsoft.com/office/infopath/2003/dataFormSolution"
                },
                {
                    name: "tns",
                    url: "http://qdabra.com/databaseservice"
                },
                {
                    name: "ns2",
                    url: "http://qdabra.com/webservices/"
                }]),
                querySucceded,
                exception;

            function performQueryAsync() {
                return dataConnection.executeAsync()
                    .then(function () {
                        querySucceded = true;
                        return true;
                    })
                    .catch(function (e) {
                        querySucceded = false;
                        exception = e;
                        return false;
                    });
            }

            function getPropertyValue(key) {
                if (!querySucceded) {
                    exception = new Error('No query has been successfully performed.  The data is not available');
                    return null;
                }

                var infoFields = cf.selectNodeFromXPathEngine(xPathEngine, 'dfs:myFields/dfs:dataFields/node()/node()', dataSource.getNode());
                if (!infoFields || infoFields.length === 0) {
                    exception = new Error('No data was found for the specified user.');
                    return null;
                }

                var propPath = String.format('ns2:ADProp[ns2:Key = "{0}"]/ns2:Value', key);//TODO:Use SecurityElement.Escape(key) instead of key ??
                infoFields = cf.selectNodeFromXPathEngine(xPathEngine, propPath, infoFields);

                return infoFields
                    ? qd.util.getNodeValue(infoFields)
                    : null;
            }

            return {
                performQueryAsync: performQueryAsync,
                querySucceded: querySucceded,
                getPropertyValue: getPropertyValue
            };
        }

        function getUserIdentityAsync(userInfo) {
            if (!userInfo) {
                var userName = '';//TODO:Get UserName
                return Q({
                    modifiedByAlias: userName,
                    modifiedByName: userName
                });
            }

            var myInfoConnection = params.dataConnections.get(userInfo),
                myInfoSource = params.commonFunction.getDataSource(userInfo),
                userInfoObj = getUserInfo(myInfoSource, myInfoConnection),
                modifiedByAlias,
                modifiedByName;

            return userInfoObj.performQueryAsync()
                .then(function () {
                    modifiedByAlias = userInfoObj.getPropertyValue('sAMAccountName');
                    if (userInfoObj.querySucceded && modifiedByAlias) {
                        modifiedByName = userInfoObj.getPropertyValue('cn');

                        if (!modifiedByName) {
                            modifiedByName = modifiedByAlias;
                        }
                    }
                    else {
                        modifiedByAlias = userName;
                        modifiedByName = userName;
                    }

                    return {
                        modifiedByAlias: modifiedByAlias,
                        modifiedByName: modifiedByName
                    };
                });
        }

        function doAssignDocumentAsync(submit, docId, comment, status, assignedToAlias, assignedToName, assignedToEmail, cc, ccEmail, myInfo) {
            return getUserIdentityAsync(myInfo)
                .then(function (userInfo) {
                    var cf = params.commonFunction,
                        modifiedByAlias = userInfo.modifiedByAlias,
                        modifiedByName = userInfo.modifiedByName,
                        milliSeconds = new Date().getTime().toString(),
                        date = milliSeconds.substr(0, 10),
                        time = milliSeconds.substr(11, 8),
                        flowXml = assignedToEmail
                        ? dbxlQdflowXmlTemplateWithEmail
                        : dbxlQdflowXmlTemplate,
                        xDocEmailFlow = $.parseXML(flowXml),
                        xPathEngine = createXPathEngine([{
                            name: 'my',
                            url: dbxlQdflowMyNamespace
                        }]),
                        rootNav = cf.selectNodeFromXPathEngine(xPathEngine, '/my:myFields', xDocEmailFlow);

                    cf.setNodeValueFromXPathEngine(xPathEngine, 'my:HostDocId', rootNav, docId);
                    cf.setNodeValueFromXPathEngine(xPathEngine, 'my:Alias', rootNav, modifiedByAlias);
                    cf.setNodeValueFromXPathEngine(xPathEngine, 'my:Name', rootNav, modifiedByName);
                    cf.setNodeValueFromXPathEngine(xPathEngine, 'my:Comment', rootNav, comment);
                    cf.setNodeValueFromXPathEngine(xPathEngine, 'my:Date', rootNav, date);
                    cf.setNodeValueFromXPathEngine(xPathEngine, 'my:Time', rootNav, time);
                    cf.setNodeValueFromXPathEngine(xPathEngine, 'my:Status', rootNav, status);
                    cf.setNodeValueFromXPathEngine(xPathEngine, 'my:AssignedToAlias', rootNav, assignedToAlias);
                    cf.setNodeValueFromXPathEngine(xPathEngine, 'my:AssignedToName', rootNav, assignedToName);

                    if (assignedToEmail) {
                        cf.setNodeValueFromXPathEngine(xPathEngine, 'my:AssignedToEmail', rootNav, assignedToEmail);
                    }

                    if (cc) {
                        //TODO:Implement
                    }

                    var submitConnection = params.dataConnections.get(submit),
                        submitSource = cf.getDataSource(submit),
                        submitDocumentObj = utilities.submitDocument(submitSource.getNode(), submitConnection);

                    return submitDocumentObj.querySubmitDocument(dbxlQdflowDoctype, qd.util.xmlToString(xDocEmailFlow), "Document Assignment", modifiedByAlias, comment)
                        .then(function (result) {
                            //TODO:Set Result here ?

                            return !!result.docId;
                        });
                });
        }

        function submitQdImageToDbXl(submit, link, fileName, qdFileDocId, domainId) {
            var cf = params.commonFunction,
                user = '',//TODO:Get UserName
                dateTime = new Date().toISOString(),
                title = '[New Untitled - ' + user + ']',
                xPathEngine = createXPathEngine([{
                    name: "my",
                    url: "http://schemas.microsoft.com/office/infopath/2003/myXSD/2009-01-23T19:16:16"
                }]),
                doc = $.parseXML(saveToDbxlQdImageXmlTemplate);

            var qdImageNode = cf.selectNodeFromXPathEngine(xPathEngine, '/my:QdImage', doc);

            cf.setNodeListValueFromXPathEngine(xPathEngine, qdImageNode, 'my:DatePublished', dateTime);
            cf.setNodeListValueFromXPathEngine(xPathEngine, qdImageNode, 'my:UserName', user);
            cf.setNodeListValueFromXPathEngine(xPathEngine, qdImageNode, 'my:Image/@my:qRulesLink', link);
            cf.setNodeListValueFromXPathEngine(xPathEngine, qdImageNode, 'my:Image/@my:qRulesFilename', fileName);
            cf.setNodeListValueFromXPathEngine(xPathEngine, qdImageNode, 'my:Image/@my:qdFileDocId', qdFileDocId);
            cf.setNodeListValueFromXPathEngine(xPathEngine, qdImageNode, 'my:Image/@my:qdDomainId', domainId);
            cf.setNodeListValueFromXPathEngine(xPathEngine, qdImageNode, 'my:DateTaken', dateTime.substr(0, 10));
            cf.setNodeListValueFromXPathEngine(xPathEngine, qdImageNode, 'my:Title', title);

            var submitConnection = params.dataConnections.get(submit),
                submitSource = cf.getDataSource(submit),
                utilities = params.utilities,
                submitDocumentObj = utilities.submitDocument(submitSource.getNode(), submitConnection);

            return submitDocumentObj.querySubmitDocument(saveToDbxlQdImageDocTypeName, qd.util.xmlToString(doc), title, user, '')
                .then(function (data) {
                    var comment = 'New Image Submitted',
                        status = 'Submitted';

                    return doAssignDocumentAsync(submit, docId, comment, status, user, user, '', '', '', null);
                });
        }

        function submitQdAttachmentToDbxl(submit, link, fileName, qdFileDocId, domainId) {
            var cf = params.commonFunction,
                user = '',//TODO:Get UserName
                dateTime = new Date().toISOString().toString(),
                xPathEngine = createXPathEngine([{
                    name: 'my',
                    url: 'http://schemas.microsoft.com/office/infopath/2003/myXSD/2009-01-23T19:16:16'
                }]),
                doc = $.parseXML(saveToDbxlQdAttachmentXmlTemplate);

            var qdAttachmentNode = cf.selectNodeFromXPathEngine(xPathEngine, '/my:QdAttachment', doc);

            cf.setNodeListValueFromXPathEngine(xPathEngine, qdAttachmentNode, 'my:DatePublished', dateTime);
            cf.setNodeListValueFromXPathEngine(xPathEngine, qdAttachmentNode, 'my:UserName', user);
            cf.setNodeListValueFromXPathEngine(xPathEngine, qdAttachmentNode, 'my:File/@my:qRulesLink', link);
            cf.setNodeListValueFromXPathEngine(xPathEngine, qdAttachmentNode, 'my:File/@my:qRulesFilename', fileName);
            cf.setNodeListValueFromXPathEngine(xPathEngine, qdAttachmentNode, 'my:File/@my:qdFileDocId', qdFileDocId);
            cf.setNodeListValueFromXPathEngine(xPathEngine, qdAttachmentNode, 'my:File/@my:qdDomainId', domainId);
            cf.setNodeListValueFromXPathEngine(xPathEngine, qdAttachmentNode, 'my:DateCreated', dateTime.substr(0, 10));
            cf.setNodeListValueFromXPathEngine(xPathEngine, qdAttachmentNode, 'my:Title', fileName);

            var submitConnection = params.dataConnections.get(submit),
                submitSource = cf.getDataSource(submit),
                utilities = params.utilities,
                submitDocumentObj = utilities.submitDocument(submitSource.getNode(), submitConnection);

            return submitDocumentObj.querySubmitDocument(saveToDbxlQdAttachmentDocTypeName, qd.util.xmlToString(doc), filename, user, '')
                .then(function (data) {
                    var comment = 'New Attachment Submitted',
                        status = 'Submitted';

                    return doAssignDocumentAsync(submit, docId, comment, status, user, user, '', '', '', null);
                });
        }

        function submitMetaDocumentAsync(submit, qdimage, domainId, base64Value, autoOpenUrl, fileName, docId) {
            var isAttachment = base64Value.indexOf('x0lG') === 0;

            return Q()
                .then(function () {

                    //TODO:Fix issue with qdImage and isAttachment
                    if (qdimage) {
                        if (isAttachment) {
                            return submitQdImageToDbXl(submit, autoOpenUrl, fileName, docId, domainId)
                        }

                        return true;
                    }
                    else if (isAttachment) {
                        return submitQdAttachmentToDbxl(submit, autoOpenUrl, fileName, docId, domainId);
                    }

                    return false;
                })
            .catch(function (e) {
                console.error(e);
                //TODO: Remove ??
                //Handle exception in case QdImage and QdAttachment fails.
                return true;
            });
        }

        function saveOutFile(cf, submit, qdImage, domainId, node, autoOpen) {
            cf.verifyRequiredAttributesExist(node);

            var saveToDbxlLinkFormat = "{0}?cmd=file",
                domSubmit = cf.getDataSource(submit),
                base64Value = node.value();

            return submitQdFileToDbxl(cf, submit, domainId, node)
                .then(function (data) {
                    var docId = data.docId,
                        fileName = data.fileName,
                        base64 = data.base64;

                    if (docId) {
                        var qdFileUrl = String.format('{0}/{1}/{1}.xml', getDbxlDocumentsPath(submit), docId),
                            autoOpenUrl = String.format(saveToDbxlLinkFormat, qdFileUrl);

                        return cf.setNil(node)
                            .then(function () {
                                return cf.selectAndSetNodeValueAsync(node, constants.qdimageAttributeXpathQrulesFilename, fileName)
                            })
                            .then(function () {
                                return cf.selectAndSetNodeValueAsync(node, constants.qdimageAttributeXpathQruleslink, autoOpen ? autoOpenUrl : qdFileUrl);
                            })
                            .then(function () {
                                return submitMetaDocumentAsync(submit, qdImage, domainId, base64Value, autoOpenUrl, fileName, docId);
                            })
                            .then(function (result) {
                                return {
                                    Saved: true,
                                    Error: result
                                };
                            });
                    }

                    var errorDescription = domSubmit.selectSingle('/dfs:myFields/dfs:dataFields/tns:SubmitDocumentResponse/tns:SubmitDocumentResult/tns:Errors/tns:ErrorInfo/tns:Description');

                    throw new Error(errorDescription ? errorDescription.value() : 'Unable to save out the file.');
                });
        }

        function saveOutFiles(cf, dsName, xPath, submit, qdImage, domainId, autoOpen) {
            var nodes = cf.getValidNodeSet(cf.getDataSource(dsName), xPath)
                .filter(function (node) {
                    return node.value();
                }),
                resultData = [];

            return qd.util.runPromiseSequence(nodes,
                function (lastResult, node) {
                    if (lastResult && lastResult.shouldStop) {
                        return lastResult;
                    }
                    else {
                        return saveOutFile(cf, submit, qdImage, domainId, node, autoOpen)
                            .then(function (result) {
                                resultData.push(result);
                            });
                    }
                })
                .then(function () {
                    var qdImageError = resultData
                        .filter(function (result) {
                            return result.Error;
                        }).length,
                        count = resultData
                        .filter(function (result) {
                            return result.Saved;
                        }).length;

                    return {
                        Error: qdImageError ? saveToDbxlErrorQdImage : '',
                        Result: count,
                        Success: count > 0
                    };
                });
        }

        function executeAsync() {
            var cf = params.commonFunction,
                submit = cf.getParamValue(constants.paramSubmit),
                dsName = cf.getParamValue(constants.paramDsName),
                xPath = cf.getParamValue(constants.paramXPath),
                qdImage = cf.getBoolParamValue(constants.paramQdImage),
                domainId = cf.getParamValue(constants.paramDomainId, ''),
                autoOpen = cf.getBoolParamValue(constants.paramAutoOpen);

            cf.verifySecondaryDataSource(dsName);

            return saveOutFiles(cf, dsName, xPath, submit, qdImage, domainId, autoOpen);
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    return SaveToDbxl;
})(Qd);