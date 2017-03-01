var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.UI = Qd.FormsViewer.UI || {};
Qd.FormsViewer.Controls = Qd.FormsViewer.Controls || {};

(function (ui, controls) {
    "use strict";

    function create(om, nodeId) {
        var field = om.getNodeById(nodeId),
            currentValue = field && field.value(),
            fsd = ui.fileDialog,
            fad = ui.fileActionDialog,
            fileProperties = currentValue && FVUtil.getFileProperties(field.getNode());

        function setFileToFieldAsync(file) {
            var encoded = FVUtil.File.getBase64Attachment(file.bytes, file.name);

            return clearFileAsync()
                .then(function () {
                    return field.setValueAsync(encoded);
                });
        }

        function handleFileSelectionResultAsync(result) {
            switch (result.result) {
                case fsd.RESULT_RETRIEVED:
                    return setFileToFieldAsync(result.file);
                case fsd.RESULT_CANCEL:
                    // do nothing
                    break;
            }

            return Q.Promise.resolve();
        }

        function doFileSelectionAsync() {
            var dialog = fsd.create();

            return dialog.showAsync()
            .then(handleFileSelectionResultAsync);
        }

        function initFileDownload() {
            var file = FVUtil.File.decodeBase64Attachment(currentValue);

            FVUtil.File.initiateFileDownload(file.bytes, file.name);
        }

        // Clears the value of the file
        function clearFileAsync() {
            // TODO: set to nil if nillable
            om.setNodeValueAsync(field.getNode(), "");
            return field.setValueAsync('');
        }

        function handleFileActionResultAsync(result) {
            switch (result) {
                case fad.ACTION_DOWNLOAD:
                    initFileDownload();
                    break;

                case fad.ACTION_REMOVE:
                    return clearFileAsync();

                case fad.ACTION_REPLACE:
                    return doFileSelectionAsync();

                case fad.ACTION_CANCEL:
                    // do nothing
                    break;
            }

            return Q.Promise.resolve();
        }

        function doFileActionSelectionAsync() {
            var dialog = new ui.fileActionDialog((fileProperties && fileProperties.name) || "");

            return dialog.showAsync()
            .then(handleFileActionResultAsync);
        }

        function handleClickAsync() {
            if (field) {
                return currentValue ? doFileActionSelectionAsync() : doFileSelectionAsync();
            }

            return Q.Promise.resolve();
        }

        return {
            handleClickAsync: handleClickAsync
        };
    };

    controls.attachmentClickHandler = {
        create: create
    };
})(Qd.FormsViewer.UI, Qd.FormsViewer.Controls);
