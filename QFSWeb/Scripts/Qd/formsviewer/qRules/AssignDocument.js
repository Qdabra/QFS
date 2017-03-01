(function (qRules) {
    "use strict";

    var requiredParameters = {
        submit: 'DBXL Submit Adapter Name',
        docid: 'Host DocID',
        alias: 'Assigned To Alias'
    };

    var optionalParameters = {
        comment: 'Comment',
        status: 'Status',
        name: 'Assigned to Name',
        email: 'Assigned to Email',
        cc: 'Semicolon delimited list of CC Aliases',
        ccEmail: 'Semicolon delimited list of CC emails -- must be in same order as the CC Aliases',
        myinfo: 'Name of a data source set up to access DBXL\'s GetMyInfo service. Used in automatically determining alias and name'
    };

    var assignDocumentCcEmailError = 'If providing a value for the /ccEmail parameter, you must include the same number of emails as aliases in the /cc parameter';

    var qdFlowBaseXml =
        "<my:myFields xmlns:my='http://schemas.microsoft.com/office/infopath/2003/myXSD/2006-12-05T15:51:37'>" +
            "<my:HostDocType /><my:HostDocId /><my:Alias /><my:Name /><my:Comment /><my:Date /><my:Time /><my:Status /><my:AssignedToAlias /><my:AssignedToName /><my:AssignedToEmail /><my:CCAddresses />" +
        "</my:myFields>";
    var qdFlowDoctype = "QdEmailFlow";
    var qdFlowMyNamespace = "http://schemas.microsoft.com/office/infopath/2003/myXSD/2006-12-05T15:51:37";

    var nsm = qRules.utility.makeNamespaceResolver({ my: qdFlowMyNamespace });
    var xpe = qRules.utility.makeXPathEngine(nsm);

    function appendCcAddressees(nodeWrapper, cc, ccEmail) {
        if (!cc) {
            return;
        }

        var ccs = cc.split(';'),
            ccEmails = ccEmail ? ccEmail.split(';') : [];

        if (ccEmails.length > 0 && ccEmails.length !== ccs.length) {
            throw new Error(assignDocumentCcEmailError);
        }

        var addressesNode = nodeWrapper.selectNode('my:CCAddresses');
        ccs.forEach(function (alias, i) {
            var ccNode = addressesNode.appendElement('my:CCAddress');
            ccNode.appendElement('my:CCAlias').setValue(alias);
            ccNode.appendElement('my:CCName').setValue(alias);
            if (i < ccEmails.length && ccEmails[i]) {
                ccNode.appendElement('my:CCEmail').setValue(ccEmails[i]);
            }
        });
    }

    function buildEmailFlowDocument(
        docid,
        modifiedByAlias,
        modifiedByName,
        comment,
        status,
        assignedToAlias,
        assignedToName,
        assignedToEmail,
        cc,
        ccEmail
        ) {
        var dt = qRules.utility.isoDate(),
            date = dt.substr(0, 10),
            time = dt.substr(11, 8);

        var doc = $.parseXML(qdFlowBaseXml);

        var root = qRules.utility.selectNode(xpe, doc, '/my:myFields');
        var nw = qRules.utility.nodeWrapper(xpe, root)
            .setNodeValue('my:HostDocId', docid)
            .setNodeValue('my:Alias', modifiedByAlias)
            .setNodeValue('my:Name', modifiedByName)
            .setNodeValue('my:Comment', comment)
            .setNodeValue('my:Date', date)
            .setNodeValue('my:Time', time)
            .setNodeValue('my:Status', status)
            .setNodeValue('my:AssignedToAlias', assignedToAlias)
            .setNodeValue('my:AssignedToName', assignedToName);

        if (assignedToEmail) {
            nw.setNodeValue('my:AssignedToEmail', assignedToEmail);
        } else {
            nw.deleteNode('my:AssignedToEmail');
        }

        appendCcAddressees(nw, cc, ccEmail);

        return doc;
    }

    function AssignDocument(params) {
        var cf = params.commonFunction;

        function defaultUserInfo() {
            var userName = cf.environment.userName() || '';

            return {
                alias: userName,
                name: userName
            };
        }

        function getUserInfoFromConnectionAsync(connName) {
            var wrapper = qd.qRules.getUserInfoWrapper(cf.getDataSource(connName), params.dataConnections.get(connName));

            return wrapper.executeAsync()
                .then(function () {
                    var alias = wrapper.property('sAMAccountName');

                    if (alias) {
                        return {
                            alias: alias,
                            name: wrapper.property('cn') || alias
                        };
                    }

                    return defaultUserInfo();
                });
        }

        function getUserIdentityAsync(myInfoConnName) {
            return Q()
                .then(function () {
                    if (myInfoConnName) {
                        return getUserInfoFromConnectionAsync(myInfoConnName);
                    }
                })
                .catch(function () { })
                .then(function (result) {
                    return result || defaultUserInfo();
                });
        }

        function doAssignDocumentAsync(assignParams) {
            return getUserIdentityAsync(assignParams.myInfods)
                .then(function (userInfo) {
                    var doc = buildEmailFlowDocument(
                        assignParams.docid,
                        userInfo.alias,
                        userInfo.name,
                        assignParams.comment,
                        assignParams.status,
                        assignParams.assignedToAlias,
                        assignParams.assignedToName,
                        assignParams.assignedToEmail,
                        assignParams.cc,
                        assignParams.ccEmail);

                    var submitSource = cf.getDataSource(assignParams.submit);
                    var submitConn = params.dataConnections.get(assignParams.submit);
                    var submitWrapper = qRules.submitDocument.standard(submitSource, submitConn);

                    return submitWrapper.querySubmitDocument(
                        qdFlowDoctype,
                        qd.xmlUtility.xmlToString(doc),
                        'Document Assignment',
                        cf.environment.userName() || '',
                        assignParams.comment
                    );
                })
                .then(function (submitResult) {
                    return submitResult.docId
                        ? qRules.commandResult.success(submitResult.docId)
                        : qRules.commandResult.failure('Unable to determine docid of submitted document.');
                });
        }

        function executeAsync() {
            var assignedToAlias = cf.getParamValue('alias');

            var assignParams = {
                submit: cf.getParamValue('submit'),
                docid: cf.getParamValue('docid'),
                comment: cf.getParamValue('comment', ''),
                status: cf.getParamValue('status', ''),
                assignedToAlias: assignedToAlias,
                assignedToName: cf.getParamValue('name', assignedToAlias),
                assignedToEmail: cf.getParamValue('email'),
                cc: cf.getParamValue('cc', ''),
                ccEmail: cf.getParamValue('ccEmail', ''),
                myInfoDs: cf.getParamValue('myinfo')
            };

            cf.verifySecondaryDataSource(assignParams.submit);
            cf.verifySecondaryDataSource(assignParams.myInfoDs);

            return doAssignDocumentAsync(assignParams)
        }

        return {
            executeAsync: executeAsync,
            requiredParameters: requiredParameters,
            optionalParameters: optionalParameters
        };
    }

    qRules.AssignDocument = AssignDocument;

})(qd.qRules);