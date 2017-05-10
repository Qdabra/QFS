(function ($, ui) {
    "use strict";

    function setIframeHeight() {
        if (!isIframe) {
            return;
        }

        var divDiagnostics = $('#divDiagnostics');
        if (divDiagnostics.length) {
            var iframeHeight = divDiagnostics.outerHeight(true) + 40;

            window.parent.postMessage(iframeHeight, sourceOrigin);
        }
    }
    
    $(document).ready(function () {
        $(document).foundation();

        setIframeHeight();
    });
})(jQuery, Qd.FormsViewer.UI);
