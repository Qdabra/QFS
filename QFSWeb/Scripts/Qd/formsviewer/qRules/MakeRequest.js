var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.MakeRequest = (function (qd) {
    'use strict';

    function MakeRequest(params) {
        var constants = qd.FormsViewer.qRules.Constants,
            optionalParameters = [{
                name: constants.paramUsername,
                description: "Username to use for authentication"
            },
            {
                name: constants.paramPassword,
                description: "Password to use for authentication"
            },
            {
                name: constants.paramMethod,
                description: "HTTP Method to use. Default is POST."
            },
            {
                name: constants.paramContentType,
                description: "Content type of content being sent. Default is text/plain. Only relevant when /content is specified."
            },
            {
                name: constants.paramContent,
                description: "Content to send in the request "
            }],
            requiredParameters = [{
                name: constants.paramPath,
                description: 'Path where the request should be sent (URL, etc.)'
            }];

        function executeAsync() {
            var commonFunction = params.commonFunction,
                path = commonFunction.getParamValue(constants.paramPath),
                userName = commonFunction.getParamValue(constants.paramUsername),
                password = commonFunction.getParamValue(constants.paramPassword),
                method = commonFunction.getParamValue(constants.paramMethod, 'POST'),
                contentType = commonFunction.getParamValue(constants.paramContentType, 'text/plain'),
                content = commonFunction.getParamValue(constants.paramContent, ''),
                qfsAccess = params.qfsAccess;

            var request = {
                Content: content,
                ContentType: contentType,
                Method: method,
                Password: password,
                url: path,
                Username: userName
            };

            return qfsAccess.callCrossDomainRequestAsync(request)
                .then(function (result) {
                    if (result.success) {
                        return {
                            Result: result.resultBody,
                            Success: true
                        };
                    }

                    return {
                        Success: false
                    };
                });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    return MakeRequest;
})(Qd);