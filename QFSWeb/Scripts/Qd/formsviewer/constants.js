var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};

(function(fv) {
    "use strict";
    var nsPrefixPrefix = "fv-";

    fv.FormAttributes = {
        CTRL_ID: "data-fv-xd-ctrlId",
        XMLACTION: "data-fv-action",
        REPEATER: "[data-fv-repeater]"
    };

    fv.Constants = {
        MenuClass: ".fv-menu",
        MenuHolderClass: ".fv-menu-holder",
        MenuWidgetClass: ".fv-menu-widget",
        CloseTargetParameter: "Source",
        NsPrefixPrefix: nsPrefixPrefix,
        dfsNs: nsPrefixPrefix + "dfs",
        Files: {
            FileNameProperty: "fileName",
            FileSizeProperty: "fileSize"
        },
        AccessTypes: {
            Template: "template",
            Library: "library",
            TemplateName: "templateName"
        }
    };

})(Qd.FormsViewer);
