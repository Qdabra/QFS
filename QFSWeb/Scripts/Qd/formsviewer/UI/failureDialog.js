var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.UI = Qd.FormsViewer.UI || {};

Qd.FormsViewer.UI.failureDialog = (function (ui) {

    function makeButton(text) {
        return $("<input type='button' />")
            .attr("value", text)
            .addClass("ui-button");
    }

    function makeUi(dialog, title, msg, details) {
        var msgDiv = $("<div>")
            .attr("title", title)
            .append($('<p>').html('<b>Title: </b>' + title + '<br/><b>Text:</b><br/>' + msg));

        if (details) {
            msgDiv.append($('<p>').html('<b>Details:</b><br/>' + details));
        }

        msgDiv.append(makeButton("OK"))
            .on("click", "input", function (e) {
                dialog.closeWithResult(true);
            });

        return msgDiv;
    }

    function failureDialog(title, msg, details) {
        var dialog = new ui.asyncDialog();
        dialog.class = "fv-failure-action-dialog";
        dialog.setTarget(makeUi(dialog, title, msg, details));

        return {
            showAsync: function() { return dialog.showAsync(); }
        };
    }

    return failureDialog;
})(Qd.FormsViewer.UI);