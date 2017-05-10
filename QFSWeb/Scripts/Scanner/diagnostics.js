(function ($, ui) {
    "use strict";

    var uiLoader = ui.uiLoader(),
        messageBox = ui.messageBox,
        queryString = window.location.search ? window.location.search.substr(1) : "",
        isIframe = getQueryStringValue("iframe") === "yes",//append iframe=yes to iframe src to notify and set page height
        sourceOrigin = "https://qdabra.sharepoint.com";//Change url if parent window changes

    function showMessageAsync(msgText, title) {
        title = title || "Error";

        return messageBox.showHtmlAsync(title, msgText);
    }

    function ajaxAsync(p) {
        return uiLoader.showWaitScreen(Q($.ajax(p)), "Scanning");
    }

    function callAjaxAsync(url, postData) {
        return ajaxAsync({
            type: "POST",
            url: url,
            contentType: false,
            processData: false,
            data: postData
        });
    }

    function scanTemplateFile() {
        var emailregEx = /[A-Z0-9._%+-]+@[A-Z0-9.-]+.[A-Z]{2,4}/igm,
            userName = $.trim($('#txtUserName').val()),
            email = $.trim($('#txtEmail').val()),
            errors = [];

        if (!userName) {
            errors.push("Please enter Name");
        }

        if (!email) {
            errors.push("Please enter Email");
        }
        else if (!emailregEx.test(email)) {
            errors.push("Please enter a valid Email address");
        }

        var files = $("#inpTemplateFile")[0].files;
        if (!files.length) {
            errors.push("Please select a file to scan.");
        }
        else {
            var file = files[0],
                fileName = file.name;
            if (fileName.indexOf(".xsn") !== fileName.length - 4) {
                errors.push("Please select a template file to scan.");
            }
        }

        if (errors.length) {
            return showMessageAsync(errors.join("<br/>"));
        }

        $("#btnSubmitScanForm").click();

        //var data = new FormData();
        //for (var x = 0; x < files.length; x++) {
        //    data.append("file" + x, files[x]);
        //}

        //data.append("userName", userName);
        //data.append("email", email);

        //$.post("Scanner/ScanForm", data)

        //uiLoader.showWaitScreen(callAjaxAsync("ScanForm", data)
        //    .then(function (data) {
        //$("#divScanResult").html(data);

        //$('[id ^= "tabs_"]').tabs({
        //    activate: function () {
        //        setIframeHeight();
        //    }
        //});

        //setIframeHeight();               
        //})
        //.fail(function () {
        //    showMessageAsync("There was an error while scanning file");
        //}));
    }

    function getQueryStringValue(key) {
        if (!queryString || !key) {
            return null;
        }

        var querySplit = queryString.split("&");

        if (!querySplit.length) {
            return null;
        }

        var filteredQuery = querySplit.filter(function (qry) {
            var qrySplit = qry.split(key + "=");
            return qrySplit.length > 1;
        });

        if (!filteredQuery.length) {
            return null;
        }

        return filteredQuery[0].split(key + "=")[1];
    }

    $(document).ready(function () {
        $('#btnValidateForm').click(scanTemplateFile);

        $("#inpTemplateFile").change(function (e) {
            var files = e.target.files;
            if (!files || !files.length) {
                $('.file-name').html("");
            }

            $('.file-name').html(files[0].name);
        });
    });
})(jQuery, Qd.FormsViewer.UI);



//Add below code in Content editor to handle iframe height

//<script type="text/javascript">

//window.onload=function(){
//    var sourceOrigin="https://formsviewerdev.azurewebsites.net";

//    function receiveMessage(event)
//    {
//        if (event.origin !== sourceOrigin)
//            return;

//        if(!event.data){
//            return;
//        }
//        var frameHeight= Number(event.data);
//        if(isNaN(frameHeight)){
//            return;
//        }

//        var iFrame = document.getElementById('iframediagnostics');
//        if(!iFrame){
//            return;
//        }

//        if(iFrame.src.indexOf(sourceOrigin)>=0){
//            iFrame.height = frameHeight;
//        }
//    }

//    window.addEventListener("message", receiveMessage);
//};
//</script>