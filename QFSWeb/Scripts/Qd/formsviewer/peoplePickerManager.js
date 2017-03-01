var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};

Qd.FormsViewer.peoplePickerManager = (function (qd) {

    //TODO:Classic mode implementation

    function peoplePickerManager(qfsAccess, shpAccess) {

        function getFirstNodeValue(selector, tagName) {
            if (!selector) {
                return null;
            }

            var selectorNode = selector.getElementsByTagName(tagName);
            if (!selectorNode.length) {
                return null;
            }

            return qd.util.getNodeValue(selectorNode[0]);
        }

        function checkIsClaimsModeAsync(serviceUrl) {
            var claimsNode = $.parseXML('<IsClaimsMode xmlns="http://schemas.microsoft.com/sharepoint/soap/" />'),
                checkClaimsUrl = serviceUrl + '_vti_bin/people.asmx',
                action = 'http://schemas.microsoft.com/sharepoint/soap/';

            return qfsAccess.querySoapAsync(checkClaimsUrl, null,
                action,
                qd.util.xmlToString(claimsNode),
                false)
                .then(function (data) {
                    if (data && !!data.success) {
                        var dataNode = $.parseXML(data.resultBody);

                        //var resultNode = dataNode.documentElement.getElementsByTagName('IsClaimsModeResult');
                        //if (!result.length) {
                        //    return false;
                        //}

                        var isClaims = !!getFirstNodeValue(dataNode.documentElement, 'IsClaimsModeResult');

                        return isClaims;
                    }
                })
                .fail(function (err) {
                    throw err;
                });

        }

        function getClaimProviderSchemasAsync(serviceUrl) {
            var providerNode = $.parseXML('<ProviderSchemas xmlns="http://schemas.microsoft.com/sharepoint/claims/IClaimProviderWebService/ProviderSchemas"/>'),
                getProviderUrl = serviceUrl + '_vti_bin/spclaimproviderwebservice.https.svc',
                action = 'http://schemas.microsoft.com/sharepoint/claims/',
                soapAction = 'http://schemas.microsoft.com/sharepoint/claims/IClaimProviderWebService/ProviderSchemas';

            return qfsAccess.querySoapAsync(getProviderUrl, null,
                soapAction,
                qd.util.xmlToString(providerNode),
                true)
                .then(function (data) {
                    if (data && !!data.success) {
                        var dataNode = $.parseXML(data.resultBody);

                        var responseNode = dataNode.documentElement.getElementsByTagName('SPProviderSchema');
                        if (!responseNode.length) {
                            return [];
                        }

                        var providers = Array.prototype.slice.call(responseNode).map(function (item) {
                            return {
                                DisplayName: getFirstNodeValue(item, 'DisplayName'),
                                ProviderName: getFirstNodeValue(item, 'ProviderName'),
                                ProviderSchema: getFirstNodeValue(item, 'ProviderSchema'),
                                SupportsHierarchy: getFirstNodeValue(item, 'SupportsHierarchy')
                            };
                        });

                        return providers;
                    }
                    return [];
                })
                .fail(function (err) {
                    throw err;
                });
        }

        function prepareGetUserQuery(serviceUrl, providers, searchPattern, searchPeopleOnly, isSearch, maxCount) {
            var method = isSearch ? 'SearchAll' : 'Resolve',
                principalType = searchPeopleOnly
                ? 'User'
                : 'User SecurityGroup SharePointGroup DistributionList',
                nsAction = "http://schemas.microsoft.com/sharepoint/claims/",
                soapAction = 'http://schemas.microsoft.com/sharepoint/claims/IClaimProviderWebService/' + method,
                getUsersUrl = serviceUrl + '_vti_bin/spclaimproviderwebservice.https.svc',
                xmlQuery = $.parseXML('<' + method + ' xmlns="' + nsAction + '" />'),
                parentNode = xmlQuery.documentElement,
                providerNamesNode = parentNode.appendChild(xmlQuery.createElementNS(nsAction, 'providerNames')),
                principalTypeNode = parentNode.appendChild(xmlQuery.createElementNS(nsAction, 'principalType')),
                searchNodeName = isSearch ? 'searchPattern' : 'resolveInput',
                searchPatternNode = parentNode.appendChild(xmlQuery.createElementNS(nsAction, searchNodeName));

            //TODO:Handle more users?
            if (maxCount > 10) {
                maxCount = 10
            }

            //parentNode.setAttribute('xmlns', 'http://schemas.microsoft.com/sharepoint/claims/');

            providers.forEach(function (item) {
                var elmProvider = xmlQuery.createElementNS(nsAction, 'string');
                providerNamesNode.appendChild(elmProvider);

                $(elmProvider).text(item);
            });

            $(principalTypeNode).text(principalType);
            $(searchPatternNode).text(searchPattern);

            if (isSearch) {
                var maxCountNode = parentNode.appendChild(xmlQuery.createElementNS(nsAction, 'maxCount'));
                $(maxCountNode).text(maxCount);
            }

            return {
                url: getUsersUrl,
                soapAction: soapAction,
                node: xmlQuery
            };
        }

        function getUserListAsync(serviceUrl, providers, searchPattern, searchPeopleOnly, maxCount) {
            var userQuery = prepareGetUserQuery(serviceUrl, providers, searchPattern, searchPeopleOnly, true, maxCount);

            return qfsAccess.querySoapAsync(userQuery.url, 'SearchAll',
                userQuery.soapAction,
                qd.util.xmlToString(userQuery.node),
                true,
                true)
                .then(function (data) {
                    if (data && !!data.success) {
                        var responseXml = $.parseXML(data.resultBody).documentElement;

                        var pickerEntities = responseXml.getElementsByTagName('PickerEntity');
                        if (!pickerEntities.length) {
                            return [];
                        }

                        var users = Array.prototype.slice.call(pickerEntities).map(function (entity) {
                            return {
                                id: getFirstNodeValue(entity, 'Key'),
                                text: getFirstNodeValue(entity, 'DisplayText'),
                                IsResolved: getFirstNodeValue(entity, 'IsResolved'),
                                Description: getFirstNodeValue(entity, 'Description'),
                                EntityType: getFirstNodeValue(entity, 'EntityType'),
                                EntityGroupName: getFirstNodeValue(entity, 'EntityGroupName'),
                                ProviderName: getFirstNodeValue(entity, 'ProviderName'),
                                ProviderDisplayName: getFirstNodeValue(entity, 'ProviderDisplayName')
                            };
                        });

                        return users;
                    }

                    return [];
                })
                .fail(function (err) {
                    throw err;
                });
        }

        function searchUserNameAsync(serviceUrl, providers, resolveInput, searchPeopleOnly) {
            var userQuery = prepareGetUserQuery(serviceUrl, providers, resolveInput, searchPeopleOnly, false);

            return qfsAccess.querySoapAsync(userQuery.url, 'Resolve',
                userQuery.soapAction,
                qd.util.xmlToString(userQuery.node),
                true,
                true)
                .then(function (data) {
                    if (data && !!data.success) {
                        var responseXml = $.parseXML(data.resultBody).documentElement;

                        var pickerEntities = responseXml.getElementsByTagName('PickerEntity');
                        if (!pickerEntities.length) {
                            return [];
                        }

                        var users = Array.prototype.slice.call(pickerEntities).map(function (entity) {
                            return {
                                id: getFirstNodeValue(entity, 'Key'),
                                text: getFirstNodeValue(entity, 'DisplayText'),
                                IsResolved: getFirstNodeValue(entity, 'IsResolved'),
                                Description: getFirstNodeValue(entity, 'Description'),
                                EntityType: getFirstNodeValue(entity, 'EntityType'),
                                EntityGroupName: getFirstNodeValue(entity, 'EntityGroupName'),
                                ProviderName: getFirstNodeValue(entity, 'ProviderName'),
                                ProviderDisplayName: getFirstNodeValue(entity, 'ProviderDisplayName')
                            };
                        });

                        return users;
                    }

                    return [];
                })
                .fail(function (err) {
                    throw err;
                });
        }

        return {
            checkIsClaimsModeAsync: checkIsClaimsModeAsync,
            getClaimProviderSchemasAsync: getClaimProviderSchemasAsync,
            getUserListAsync: getUserListAsync,
            searchUserNameAsync: searchUserNameAsync
        };
    }

    return peoplePickerManager;
})(Qd);