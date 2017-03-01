var Qd = Qd || {},
    fv = Qd.FormsViewer = Qd.FormsViewer || {},
    ui = Qd.FormsViewer.UI = Qd.FormsViewer.UI || {};

(function(qd, fv, ui) {
    "use strict";

    function formCloser(renderTarget) {
        
        function getCloseDestination() {
            return qd.util.getParameterByName(fv.Constants.CloseTargetParameter);
        }

        function closeForm() {
            var dest = getCloseDestination();

            if (dest) {
                window.location = dest;
            } else {
                $(renderTarget).html("<div style='text-align:center; font-size:18pt'>This form has been closed.</div>");
            }
        }

        return {
            closeForm: closeForm
        };
    }

    ui.formCloser = formCloser;
})(Qd, fv, ui);
