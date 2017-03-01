(function (qRules, $) {
    "use strict";

    var requiredParameters = {
        text: "text to encode"
    };

    var optionalParameters = {
        decode: "(boolean, defaults to false) Decode the text",
        type: "Encoding type (url | html | uri | uriComponet); default is url"
    };

    function prepareTypeParamError(type) {
        throw new Error('Unknown value for /type parameter: ' + type);
    }

    function encodeHtml(text) {
        return $('<n />').text(text).html()
    }

    function performEncode(text, type) {
        switch (type) {
            case 'url':
            case 'uri':
                return encodeURI(text);
            case 'html':
                return encodeHtml(text);
            case 'uriComponent':
                return encodeURIComponent(text);
        }

        throw prepareTypeParamError(type);
    }

    function decodeHtml(text) {
        return $('<n />').html(text).text();
    }

    function performDecode(text, type) {
        switch (type) {
            case 'url':
            case 'uri':
                return decodeURI(text);
            case 'html':
                return decodeHtml(text);
            case 'uriComponent':
                return decodeURIComponent(text);
        }

        throw prepareTypeParamError(type);
    }

    function Encode(params){
        var cf = params.commonFunction;

        function execute(){
            var text = cf.getParamValue('text'),
                type = cf.getParamValue('type', 'url'),
                decode = cf.getBoolParamValue('decode');

            return decode
                ? performDecode(text, type)
                : performEncode(text, type);
        }

        return {
            execute: execute,
            requiredParameters: requiredParameters,
            optionalParameters: optionalParameters
        };
    }

    qRules.Encode = Encode;

})(qd.qRules, jQuery);