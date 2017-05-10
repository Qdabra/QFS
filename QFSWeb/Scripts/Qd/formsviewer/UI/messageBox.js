(function (ui) {
    "use strict";

    // UNFINISHED

    function makeUi(dialog, title, message, isHtml) {
        var msgDiv = $('<div>')
            .attr('title', title),
            pContainer = $('<p style="white-space: pre-wrap; word-break: break-all;">');

        if (isHtml) {
            msgDiv.append(pContainer.html(message))
        }
        else {
            msgDiv.append(pContainer.text(message))
        }

        msgDiv.append($("<div class='buttons'>").append(ui.asyncDialog.makeButton("OK")))
            .on("click", "input", function () {
                dialog.closeWithResult(true);
            });

        return msgDiv;
    }

    function showAsync(title, message) {
        var dialog = new ui.asyncDialog();

        dialog.setTarget(makeUi(dialog, title, message, false));

        return dialog.showAsync();
    }

    function showHtmlAsync(title, message) {
        var dialog = new ui.asyncDialog();

        dialog.setTarget(makeUi(dialog, title, message, true));

        return dialog.showAsync();
    }

    ui.messageBox = {
        showAsync: showAsync,
        showHtmlAsync: showHtmlAsync
    };
})(Qd.FormsViewer.UI);