(function (ui) {
    "use strict";

    // UNFINISHED

    function makeUi(dialog, title, message) {
        var msgDiv = $('<div>')
            .attr('title', title)
            .append($('<p style="white-space: pre-wrap">').text(message))
            .append($("<div class='buttons'>").append(ui.asyncDialog.makeButton("OK")))
            .on("click", "input", function () {
                dialog.closeWithResult(true);
            });

        return msgDiv;
    }

    function showAsync(title, message) {
        var dialog = new ui.asyncDialog();

        dialog.setTarget(makeUi(dialog, title, message));

        return dialog.showAsync();
    }

    ui.messageBox = {
        showAsync: showAsync
    };
})(Qd.FormsViewer.UI);