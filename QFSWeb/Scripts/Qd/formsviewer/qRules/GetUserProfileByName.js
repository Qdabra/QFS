(function (qRules) {
    "use strict";

    var getUserProfileErrorDsError = "The data source schema is invalid for use with GetUserProfileByName";


    function GetUserProfileByName(params) {

        var constants = qRules.constants;

        var requiredParameters = [];

        var optionalParameters = [
            {
                name: constants.paramDsName,
                description: '/dsname=GetUserProfileByName data source. Defaults to GetUserProfileByName'
            },
            {
                name: 'user',
                description: 'User alias. Defaults to the current user.'
            }
        ];

        var valueMap = {
            Email: 'get_email',
            IsSiteAdmin: 'get_isSiteAdmin',
            LoginName: 'get_loginName',
            AccountName: 'get_loginName',
            PreferredName: 'get_title'
        };

        function getNamespaces() {
            var nsr = new FVNamespaceResolver();

            nsr.addNamespace("dfs", "http://schemas.microsoft.com/office/infopath/2003/dataFormSolution");

            return nsr;
        }

        var nsUps = 'http://microsoft.com/webservices/SharePointPortalServer/UserProfileService';

        function buildPropertyNode(spUser, methodName, propertyName) {
            var xml = $.parseXML(
                '<u:PropertyData xmlns:u="http://microsoft.com/webservices/SharePointPortalServer/UserProfileService">' +
                '<u:IsPrivacyChanged>false</u:IsPrivacyChanged><u:IsValueChanged>false</u:IsValueChanged><u:Name /><u:Privacy />' +
                '<u:Values><u:ValueData><u:Value /></u:ValueData></u:Values>' +
                '</u:PropertyData>'
            );
            var de = xml.documentElement;
            var value = spUser[methodName]();

            $(de.childNodes[2]).text(propertyName);
            //   Values        ValueData     Value
            $(de.childNodes[4].childNodes[0].childNodes[0]).text(value);

            return de;
        }

        function updateDataSource(ds, spUser) {
            var dataNodes = ds.selectSingle('/*/dfs:dataFields', { namespaces: getNamespaces() });

            if (!dataNodes) {
                throw new Error(getUserProfileErrorDsError);
            }

            var xmlStructure = $.parseXML('<u:GetUserProfileByNameResponse xmlns:u="http://microsoft.com/webservices/SharePointPortalServer/UserProfileService"><u:GetUserProfileByNameResult /></u:GetUserProfileByNameResponse>');

            var result = xmlStructure.documentElement.childNodes[0];

            var nodes = Object.keys(valueMap).map(function (property) { return buildPropertyNode(spUser, valueMap[property], property); });

            nodes.forEach(function (n) { result.appendChild(n); });

            return dataNodes.setContentAsync(xmlStructure.documentElement);
        }

        function getUserAsync(spa, userName) {
            var failed = 'Failed to retreive data for the specified user.';

            return spa.loadUserAsync(userName)
                .catch(function () {
                    throw new Error(failed);
                })
                .then(function (user) {
                    if (!user) {
                        throw new Error(failed);
                    }

                    return user;
                });
        }

        function executeAsync() {
            var cf = params.commonFunctions;

            var dsName = cf.getParamValue(constants.paramDsName, 'GetUserProfileByName');
            var userName = cf.getParamValue('user');

            var ds = cf.getDataSource(dsName);

            var spa = params.shpAccess;

            return getUserAsync(spa, userName)
                .then(function (user) {
                    return updateDataSource(ds, user);
                })
                .then(function () {
                    return {
                        success: true
                    };
                });
        }

        return {
            executeAsync: executeAsync,
            requiredParameters: requiredParameters,
            optionalParameters: optionalParameters
        };
    }

    qRules.GetUserProfileByName = GetUserProfileByName;
})(Qd.FormsViewer.qRules);