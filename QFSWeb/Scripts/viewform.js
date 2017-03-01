(function (ui) {
    "use strict";

    function showLoadFailedMessage(errMsg) {
        ui.showLoadFailedError({ userDisplayMessage: errMsg }, $("#form"));
    }

    function getAccessType(template, templateName, library) {
        if (templateName) {
            document.title = templateName;
            return "templateName";
        }
        if (library) {
            return "library";
        }
        return "template";
    }

    function pageInit(template, templateName, library, document) {
        var form = template || library || templateName,
            loader = Qd.FormsViewer.loader($("#form"));

        return Q()
            .then(function () {
                if (form) {
                    return loader.loadTemplate(form, getAccessType(template, templateName, library));
                } else if (document) {
                    return loader.loadDocument(document);
                } else {
                    showLoadFailedMessage("Please specify a template or library url.");
                }
            });
    }

    function openForm() {
        try {
            var template = FVUtil.getParameterByName("template"),
                templateName = FVUtil.getParameterByName("templateName"),
                library = FVUtil.getParameterByName("library"),
                docUrl = FVUtil.getParameterByName("document");

            return pageInit(template, templateName, library, docUrl);
        } catch (ex) {
            showLoadFailedMessage("An error occurred opening the form error: " + ex.message);
        }
    }

    $(function () {
        //$("#loadMessage").animateWaitText();

        var uiLoader = Qd.FormsViewer.UI.uiLoader();
        return uiLoader.showWaitScreen(
            preparePageAsync(false).then(openForm),
            'Form loading'
        )
            .done();

    });
}(Qd.FormsViewer.UI));
