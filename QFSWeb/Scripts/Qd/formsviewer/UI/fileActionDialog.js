var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.UI = Qd.FormsViewer.UI || {};

// Dialog to prompt a user for what they want to do with an attachment.
(function ($, ui) {
    "use strict";

    var actionRemove = "remove",
        actionDownload = "download",
        actionReplace = "replace",
        actionCancel = "cancel";

    function makeButton(text, result) {
        return $("<input type='button' />").attr("value", text)
                                           .addClass("ui-button")
                                           .data("result", result);
    }

    function makeUi(dialog, fileName) {
        var myUi = $("<div>").attr("title", "What do you want to do with " + fileName + "?")
                           .append(makeButton("Remove", actionRemove))
                           .append(makeButton("Download", actionDownload))
                           .append(makeButton("Replace", actionReplace))
                           .append(makeButton("Cancel", actionCancel));

        myUi.on("click", "input", function (e) {
            dialog.closeWithResult($(this).data("result"));
        });

        return myUi;
    }

    function fad(fileName) {
        this.class = "fv-file-action-dialog";
        this.setTarget(makeUi(this, fileName));
    }

    fad.prototype = Object.create(ui.asyncDialog.prototype);

    fad.prototype.constructor = fad;

    fad.ACTION_REMOVE = actionRemove;
    fad.ACTION_DOWNLOAD = actionDownload;
    fad.ACTION_REPLACE = actionReplace;
    fad.ACTION_CANCEL = actionCancel;

    ui.fileActionDialog = fad;
})(jQuery, Qd.FormsViewer.UI);
