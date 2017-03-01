var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.UI = Qd.FormsViewer.UI || {};

(function (ui) {
    "use strict";

    function aDlg() { };

    aDlg.prototype._target = null;
    aDlg.prototype._isOpen = false;
    aDlg.prototype._resolveCallback = null;

    aDlg.prototype.width = 400;
    aDlg.prototype.buttons = [];
    aDlg.prototype.class = "fv-async-dialog";

    aDlg.prototype.closeWithResult = function (value) {
        if (this._isOpen) {
            this._resolveCallback(value);
            this._resolveCallback = null;
            this._isOpen = false;
            this._target.dialog("close");
        } else {
            throw Error("This dialog is not currently open.");
        }
    };

    aDlg.prototype.setTarget = function (targetElement) {
        this._target = $(targetElement);
    };

    aDlg.prototype.showAsync = function () {
        return Q.Promise(function (resolve) {
            this._resolveCallback = resolve;

            this._target.dialog({
                dialogClass: this.class,
                draggable: false,
                modal: true,
                width: this.width,
                buttons: this.buttons
            });

            this._isOpen = true;
        }.bind(this));
    }

    aDlg.makeButton = function (text, result) {
        return $("<input type='button' />")
            .attr("value", text)
            .addClass("ui-button")
            .data("result", result);
    }

    ui.asyncDialog = aDlg;
})(Qd.FormsViewer.UI);
