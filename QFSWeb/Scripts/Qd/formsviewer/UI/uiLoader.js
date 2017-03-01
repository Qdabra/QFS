var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {}
Qd.FormsViewer.UI = Qd.FormsViewer.UI || {};

Qd.FormsViewer.UI.uiLoader = (function (qd, $) {
    var loadingText = 'Loading';
    var showingLoader = false;

    function uiLoader() {
        var notificationInterval;

        function setErrorPanelZindex() {
            var panel = $('div[id^=SP_RequestExecutor_NotificationPanel]');

            if (!panel.length) {
                return;
            }

            var panelIndex = panel.css('z-index'),
                loaderIndex = parseInt($('div#divLoader').css('z-index'));
            if (panelIndex && panelIndex !== 'auto') {
                clearInterval(notificationInterval);
                notificationInterval = null;
                return;
            }

            panel.css('z-index', loaderIndex + 1);
            clearInterval(notificationInterval);
            notificationInterval = null;
        }

        function displayOverlay(text) {
            notificationInterval = setInterval(setErrorPanelZindex, 100);
            showingLoader = true;

            $('#divLoaderContainer').removeClass('hidden');
            $('div#divContent').html(text || loadingText);
        }

        function hideOverlay() {
            showingLoader = false;

            $('#divLoaderContainer').addClass('hidden');
            $('div#divContent').html('');

            if (notificationInterval) {
                clearInterval(notificationInterval);
            }
        }

        function showWaitScreen(promise, text) {
            if (!promise) {
                console.warn('Promise undefined.');
                return Q();
            }

            if (showingLoader) {
                return promise;
            }

            displayOverlay(text);

            return promise.finally(function () {
                hideOverlay();
            });
        }

        return {
            showWaitScreen: showWaitScreen
        };
    }

    return uiLoader;

})(Qd, jQuery);