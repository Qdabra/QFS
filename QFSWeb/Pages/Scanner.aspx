<!DOCTYPE html>
<meta http-equiv="X-UA-Compatible" content="IE=8">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>InfoPath Scanner host page</title>
    <script src="//ajax.aspnetcdn.com/ajax/4.0/1/MicrosoftAjax.js" type="text/javascript"></script>
    <script type="text/javascript" src="//ajax.aspnetcdn.com/ajax/jQuery/jquery-1.10.2.min.js"></script>

    <link rel="Stylesheet" type="text/css" href="../Content/App.css" />
    <script type="text/javascript" src="../scripts/scanner/scanner.js"></script>

    <script type="text/javascript">
        "use strict";

        var hostweburl;

        //load the SharePoint resources
        $(document).ready(function () {
            //Get the URI decoded URL.
            hostweburl =
                decodeURIComponent(
                    getQueryStringParameter("SPHostUrl")
            );

            // The SharePoint js files URL are in the form:
            // web_url/_layouts/15/resource
            var scriptbase = hostweburl + "/_layouts/15/";

            // Load the js file and continue to the
            //   success handler
            $.getScript(scriptbase + "SP.UI.Controls.js", renderChrome);
        });

        // Callback for the onCssLoaded event defined
        //  in the options object of the chrome control
        function chromeLoaded() {
            // When the page has loaded the required
            //  resources for the chrome control,
            //  display the page body.
            $("body").show();
        }

        //Function to prepare the options and render the control
        function renderChrome() {
            // The Help, Account and Contact pages receive the
            //   same query string parameters as the main page
            var options = {
                "appIconUrl": "/images/ScannerAppIcon.png",
                "appTitle": "InfoPath Template Scanner",
                "appHelpPageUrl": "/Scanner/Help?"
                    + document.URL.split("?")[1],
                // The onCssLoaded event allows you to
                //  specify a callback to execute when the
                //  chrome resources have been loaded.
                "onCssLoaded": "chromeLoaded()",
                "settingsLinks": [
                    {
                        "linkUrl": "Account.html?"
                            + document.URL.split("?")[1],
                        "displayName": "Account settings"
                    },
                    {
                        "linkUrl": "Contact.html?"
                            + document.URL.split("?")[1],
                        "displayName": "Contact us"
                    }
                ]
            };

            var nav = new SP.UI.Controls.Navigation(
                                    "chrome_ctrl_placeholder",
                                    options
                                );
            nav.setVisible(true);
            sharePointReady();
        }

        // Function to retrieve a query string value.
        // For production purposes you may want to use
        //  a library to handle the query string.
        function getQueryStringParameter(paramToRetrieve) {
            var params =
                document.URL.split("?")[1].split("&");
            var strParams = "";
            for (var i = 0; i < params.length; i = i + 1) {
                var singleParam = params[i].split("=");
                if (singleParam[0] == paramToRetrieve)
                    return singleParam[1];
            }
        }
    </script>
</head>

<!-- The body is initally hidden.
     The onCssLoaded callback allows you to
     display the content after the required
     resources for the chrome control have
     been loaded.  -->
<body style="display: none; ">

    <!-- Chrome control placeholder -->
    <div id="chrome_ctrl_placeholder"></div>
    <div id="MainContent" style="margin: 10px; overflow: visible">
    <div>
        <button id="getLibraryList">Refresh Lists</button>
        <button id="scanTemplates">Scan Selected Templates</button>
        <br />
        <div id="resultsDiv">
            <label id="libraryResults"></label>
            <br />
            <table id="actPanel" class="actPanel">
                <caption>Site Available Content Types</caption>
                <thead>
                    <tr>
                        <th>
                            <br />
                        </th>
                    </tr>
                </thead>
                <tfoot>
                    <tr><th><br /></th></tr>
                </tfoot>
                <tbody>
                    <tr>
                        <td>
                            <table id="actTable" class="actTable">
                                <thead>
                                    <tr>
                                        <th>
                                            <input type='checkbox' onclick="return false;" value='1' />
                                        </th>
                                        <th>Name</th>
                                        <th>Url</th>
                                    </tr>
                                </thead>
                                <tbody class="actTableBody">
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
            <br />
            <table id="libraryPanel" class="libraryPanel">
                <caption>Libraries with InfoPath Forms</caption>
                <thead>
                    <tr>
                        <th>
                            <br />
                        </th>
                    </tr>
                </thead>
                <tfoot>
                    <tr><th><br /></th></tr>
                </tfoot>
                <tbody>
                    <tr>
                        <td>
                            <table id="libraryTable" class="libraryTable">
                                <thead>
                                    <tr>
                                        <th>+/-</th>
                                        <th>Name</th>
                                        <th>Url</th>
                                        <th>ItemCount</th>
                                    </tr>
                                </thead>
                                <tbody class="libraryTableBody">
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
            <table id="listPanel" class="listPanel">
                <caption>Lists with InfoPath Forms</caption>
                <thead>
                    <tr><th><br /></th></tr>
                </thead>
                <tfoot>
                    <tr><th><br /></th></tr>
                </tfoot>
                <tbody>
                    <tr>
                        <td>
                            <table id="listTable" class="listTable">
                                <thead>
                                    <tr>
                                        <th>+/-</th>
                                        <th>Name</th>
                                        <th>Url</th>
                                        <th>ItemCount</th>
                                    </tr>
                                </thead>
                                <tbody class="listTableBody">
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
            <table id="listTable_rowtemplate" style="display: none" data-counter="0">
                <tr class="ctRow">
                    <td><a class="buttonicon" href="javascript:void(0)" title="Expand" onclick="expandRow(this); return false;">+</a></td>
                    <td>
                        <label id="listTable_name_${counter}"></label>
                    </td>
                    <td>
                        <label id="listTable_url_${counter}"></label>
                    </td>
                    <td align="right">
                        <label id="listTable_itemCount_${counter}"></label>
                    </td>
                </tr>
            </table>
            <table id="libraryTable_rowtemplate" style="display: none" data-counter="0">
                <tr class="ctRow">
                    <td class="ctSelected"><a class="buttonicon" href="javascript:void(0)" title="Expand" onclick="expandRow(this); return false;">+</a></td>
                    <td class="ctName">
                        <label id="libraryTable_name_${counter}"></label>
                    </td>
                    <td class="ctUrl">
                        <label id="libraryTable_url_${counter}"></label>
                    </td>
                    <td>
                        <label id="libraryTable_itemCount_${counter}"></label>
                    </td>
                </tr>
            </table>
            <table id="contentTypeTable_rowTemplate" style="display: none" data-counter="0">
                <tr id="trContentType_${counter}" style="display: none">
                    <td></td>
                    <td colspan="4">
                        <div>
                            <table id="ctTable_${counter}">
                                <tbody class="ctTableBody">
                                    <tr id="ctQueryingTypesRow_${counter}" style="font-weight: bold">
                                        <td>querying content types...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    </div>
    <div id="starter">
    </div>
    </div>
</body>
</html>
