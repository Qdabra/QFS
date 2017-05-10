Qd.FormsViewer.UI = Qd.FormsViewer.UI || {};

(function (ui) {
    "use strict";

    function showLoadFailedError(err, renderTarget, isHtmlMsg) {
        var msg = (err && err.userDisplayMessage) || "An unexpected error occurred.\nPlease contact Qdabra support.";

        console.error(err);

        var msgBoxMethod = !!isHtmlMsg ? ui.messageBox.showHtmlAsync : ui.messageBox.showAsync;

        return msgBoxMethod("Error", msg + "\n\nThe form will now close.")
             .then(function () {
                 var fc = ui.formCloser(renderTarget);

                 fc.closeForm();
             });
    }

    function getErrorDetails(error) {
        if (error) {
            if (error.shpError && error.shpError.get_message) {
                return error.shpError.get_message();
            }

            if (error.message) {
                return error.message;
            }
        }

        return '';
    }

    function showRuleError(ruleName, error) {
        var errMsg = ruleName + ' rule was not applied.',
         errDetails = getErrorDetails(error);

        var fd = ui.failureDialog('Rule Error', errMsg, errDetails);

        return fd.showAsync();

    }

    ui.showLoadFailedError = showLoadFailedError;
    ui.showRuleError = showRuleError;

})(Qd.FormsViewer.UI)