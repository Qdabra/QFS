var qd = qd || {};

(function (qd, $) {
    "use strict";

    var loadPromise;

    function loadScriptAsync(url) {
        return Q.when($.getScript(url));
    }

    function getScriptBase(hostWebUrl) {
        return hostWebUrl + "/_layouts/15/";
    }

    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(window.location.search);
        return results == null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
    };


    function loadScriptsAsync() {
        var hostweburl = getParameterByName('SPHostUrl');

        var scriptbase = getScriptBase(hostweburl);

        loadPromise = loadScriptAsync(scriptbase + 'SP.Runtime.js')
            .then(function () { return loadScriptAsync(scriptbase + 'SP.js'); })
            .then(function () {
                return Q.all([
                    loadScriptAsync(scriptbase + 'SP.RequestExecutor.js'),
                    loadScriptAsync("/bundles/formDigestInfo.js")
                ]);
            });

        return loadPromise;
    }

    qd.shpScriptLoader = {
        loadScriptsAsync: loadScriptsAsync,
        loadedAsync: function () {
            return loadPromise || loadScriptsAsync();
        }
    };
})(qd, jQuery);