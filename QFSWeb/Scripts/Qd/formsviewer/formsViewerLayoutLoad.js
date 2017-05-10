var additionalQueryString = '';

function createAdditionalQueryString() {
    if (additionalQueryString) {
        return additionalQueryString;
    }

    var queryString = window.location.search;

    if (queryString) {
        if (queryString[0] === "?") {
            queryString = queryString.substring(1);
        }

        var keyValuePairArray = queryString.split("&"),
            keys = ['SPHostUrl', 'SPLanguage', 'SPClientTag', 'SPProductNumber', 'SPAppWebUrl'],
            addQueryKeys = keys.map(function (key) {
                return key + '=' + getQueryStringValue(keyValuePairArray, key);
            });

        additionalQueryString = "?" + addQueryKeys.join('&') + '&AppOnly=true';

        return additionalQueryString;
    }

    return null;
}

function getQueryStringValue(keyValuePairArray, keyName) {
    if (keyValuePairArray == null || keyValuePairArray.length === 0 || keyName === '') {
        return null;
    }

    for (var i = 0; i < keyValuePairArray.length; i++) {
        var currentKeyValuePair = keyValuePairArray[i].split("=");

        if (currentKeyValuePair.length > 1 && currentKeyValuePair[0] === keyName) {
            return currentKeyValuePair[1];
        }
    }
}

qd.shpScriptLoader.loadScriptsAsync();

$(document).ready(function () {
    var keepAliveSeconds = 600;

    //debugger;
    setInterval(function () {
        $.ajax({
            url: '/webproxy/keepalive' + createAdditionalQueryString(),
            success: function (data) {
                console.info('Keep Alive: ', data);
            },
            error: function (e, x) {
                console.info('Keep Alive Error:', e);
            }
        });
    }, keepAliveSeconds * 1000);
});
