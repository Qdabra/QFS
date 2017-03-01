var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.UI = Qd.FormsViewer.UI || {};

// Dialog to prompt a user to select a file
(function ($, ui) {
    "use strict";

    var CLASS_FILE_DIALOG = "fv-file-dialog",
        CLASS_FILE_PICKER = "fv-file-dialog-file";

    var RESULT_RETRIEVED = "retrieved",
        RESULT_CANCEL = "cancel";


    function makeUi() {
        return $("<div />").append($("<div />").css("margin-bottom", "0.5em"))
                           .append($("<input type='file' />").addClass(CLASS_FILE_PICKER));
    }

    function FileDialog() {
        var target = makeUi();

        this.class = CLASS_FILE_DIALOG;
        this.setTarget(target);
        this.filePicker = target.find("input")[0];
        this.buttons = [
            { text: "OK", click: this.handleOk.bind(this) },
            { text: "Cancel", click: this.handleCancel.bind(this) }
        ];
    }

    FileDialog.prototype = Object.create(ui.asyncDialog.prototype);
    FileDialog.prototype.filePicker = null;

    function getFileAsync(picker) {
        var file = picker.files[0];

        if (!file) {
            return Q.Promise.reject(Error("Please pick a file."));
        }

        return FVUtil.File.loadFileAsync(file)
        .catch(function (e) { throw Error("An error occurred:\n", e.message); });
    }

    FileDialog.prototype.handleOk = function () {
        var buttons = $("." + CLASS_FILE_DIALOG).find(".ui-button");

        buttons.attr("disabled", "disable");

        getFileAsync(this.filePicker)
        .then(this.handleFileResult.bind(this))
        .catch(function (err) { alert(err.message); })
        .done(function () { buttons.removeAttr("disabled"); });
    };

    FileDialog.prototype.handleFileResult = function (file) {
        if (file) {
            this.closeWithResult({ result: RESULT_RETRIEVED, file: file });
        } else {
            console.error("An error occurred attempting to load the file.");
        }
    };

    FileDialog.prototype.handleCancel = function () {
        this.closeWithResult({ result: RESULT_CANCEL, file: null });
    };

    FileDialog.prototype.constructor = FileDialog;

    function create() {
        return new FileDialog();
    }

    ui.fileDialog = {
        create: create,
        RESULT_RETRIEVED: RESULT_RETRIEVED,
        RESULT_CANCEL: RESULT_CANCEL
    };

})(jQuery, Qd.FormsViewer.UI);

