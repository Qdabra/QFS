var qd = qd || {};

(function (qd, $) {
    "use strict";

    var loadPromise;

    // temporary fix to get getScript() to use caching
    $.ajaxSetup({ cache: true });

    function loadScriptAsync(url, noCache) {
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
        loadPromise = loadScriptAsync('/bundles/sharePointLibraries2.js').then(function() {
            //return loadScriptAsync('/_layouts/15/sp.userprofiles.js');
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