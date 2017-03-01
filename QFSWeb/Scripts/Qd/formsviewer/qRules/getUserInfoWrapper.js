(function (qRules) {
    "use strict";

    var nses = {
        tns: "http://qdabra.com/databaseservice",
        ns2: "http://qdabra.com/webservices/"
    };

    function getUserInfoWrapper(dataSource, dataConnection) {
        var wrapper = qRules.webServiceWrapper(dataSource, dataConnection, nses, ["GetUserInfo", "GetMyInfo"]);

        var properties;

        function getProperties(){
            var resultNode = wrapper.resultNode();

            if(!resultNode){
                return;
            }

            var propNodes = wrapper.getServiceElements(resultNode, 'ADProp');
            properties = {};

            propNodes.forEach(function (node) {
                properties[wrapper.getServiceElementValue(node, 'Key')] =
                    wrapper.getServiceElementValue(node, 'Value');
            });
        }

        return {
            username: function (value) {
                wrapper.setQueryField('username', value);
            },
            property: function(key){
                if (!properties) {
                    throw new Error('User info has not been queried.');
                }

                return properties[key];
            },
            executeAsync: function () {
                wrapper.executeAsync()
                    .then(getProperties);
            }
        };
    }

    qRules.getUserInfoWrapper = getUserInfoWrapper;
})(qd.qRules);