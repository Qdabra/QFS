<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>FormsViewer host page</title>
    <script src="//ajax.aspnetcdn.com/ajax/4.0/1/MicrosoftAjax.js" type="text/javascript"></script>
    <script type="text/javascript" src="//ajax.aspnetcdn.com/ajax/jQuery/jquery-1.10.2.min.js"></script>

    <link rel="Stylesheet" type="text/css" href="../Content/App.css" />

    <script src="../Scripts/Libraries/q.js"></script>
    <script src="../Scripts/xpath.js"></script>
    <script src="../Scripts/util.js"></script>

    <script src="../scripts/app.js"></script>

    <script type="text/javascript">
        "use strict";

        // This function prepares, loads, and then executes a SharePoint query to get the current users information
        function getUserName() {
            var user = context.get_web().get_currentUser();
            context.load(user);
            context.executeQueryAsync(onGetUserNameSuccess, onGetUserNameFail);

            // This function is executed if the above call is successful
            // It replaces the contents of the 'message' element with the user name
            function onGetUserNameSuccess() {
                $('#message').text('Hello ' + user.get_title());
            }

            // This function is executed if the above call fails
            function onGetUserNameFail(sender, args) {
                alert('Failed to get user name. Error:' + args.get_message());
            }
        }

        function openForm(controlSelector, promptText, paramName) {
            var userValue = $(controlSelector).val();
            if (!userValue) {
                alert(promptText);
            }
            else {
                var url = "/Pages/View.aspx?" + getQueryString() + "&" + paramName + "=" + userValue;
                if (window.navigate) {
                    window.navigate(url);
                }
                else {
                    window.location.href = url;
                }
            }
        }

        function openFormTemplate(evt) {
            evt.preventDefault();
            openForm("input#txtTemplatePath",
                     "Please enter a template path.",
                     "template");
        }

        function openDocument(evt) {
            evt.preventDefault();
            openForm("#txtDocumentPath",
                     "Please enter a document path.",
                     "document");
        }

        function addEvents() {
            $("#btnOpenForm").click(openFormTemplate);
            $("#btnOpenDocument").click(openDocument);
        }

        $(function () {
            preparePageAsync()
            .then(getUserName)
            .then(addEvents)
            .done();
        });

    </script>
</head>

<!-- The body is initally hidden.
     The onCssLoaded callback allows you to
     display the content after the required
     resources for the chrome control have
     been loaded.  -->
<body style="display: none">

    <!-- Chrome control placeholder -->
    <div id="chrome_ctrl_placeholder"></div>

    <div id="MainContent" style="margin: 10px; overflow: visible">
        <div>
            <p id="message">
                <!-- The following content will be replaced with the user name when you run the app - see App.js -->
                Initializing...
            </p>
        </div>
        <div>
            <p>
                <label for="txtTemplatePath">Please enter a form template url:</label>
            </p>
            <input id="txtTemplatePath" name="txtTemplatePath" type="text" style="width: 400px; margin-bottom: 1em;" /><br />
            <button id="btnOpenForm" style="margin-left: 0;">Open Template</button>
            <p>
                <br />
                <label for="txtTemplatePath">Please enter a document url:</label>
            </p>
            <input id="txtDocumentPath" name="txtDocumentPath" type="text" style="width: 400px; margin-bottom: 1em;" /><br />
            <button id="btnOpenDocument" style="margin-left: 0;">Open Document</button>

        </div>
    </div>
</body>
</html>
