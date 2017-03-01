'use strict';

var context;
var appCtxSite;
var web;
var user;
var ACTs;
var lists;

var hostweburl;
var appweburl;
var siteroot;

function sharePointReady() {

    try {
        hostweburl =
             decodeURIComponent(
                 getQueryStringParameter('SPHostUrl')
         );
        appweburl =
            decodeURIComponent(
                getQueryStringParameter('SPAppWebUrl')
         );
        siteroot = getRootUrl(hostweburl);

        var scriptbase = hostweburl + "/_layouts/15/";

        $.getScript(scriptbase + 'SP.Runtime.js',
            function () {
                $.getScript(scriptbase + 'SP.js',
                    function () {
                        $.getScript(scriptbase + 'SP.RequestExecutor.js', function () {
                            registerContextAndProxy();
                            getUserName();

                            $("#getLibraryList").click(function (event) {
                                event.preventDefault();
                                printAllListNamesFromHostWeb();
                            });
                            $("#scanTemplates").click(function (event) {
                                event.preventDefault();
                                scanSelectedTemplates();
                            });
                        });
                    });
            });

    }
    catch (ex) {
        alert('sharePointReady error: ' + ex.message);
    }
}

function getRootUrl(url) {
    return url.toString().replace(/^(.*\/\/[^\/?#]*).*$/, "$1");
}

function registerContextAndProxy() {
    context = new SP.ClientContext(appweburl);
    var factory = new SP.ProxyWebRequestExecutorFactory(appweburl);
    context.set_webRequestExecutorFactory(factory);

    appCtxSite = new SP.AppContextSite(context, hostweburl);
}

// This function prepares, loads, and then executes a SharePoint query to get the current users information
function getUserName() {
    user = context.get_web().get_currentUser();
    context.load(user);
    context.executeQueryAsync(onGetUserNameSuccess, onGetUserNameFail);
}

// This function is executed if the above call is successful
// It replaces the contents of the 'message' element with the user name
function onGetUserNameSuccess() {
     // what should we do with user name info?  put in header?
}

// This function is executed if the above call fails
function onGetUserNameFail(sender, args) {
    // what should we do?
}

function getQueryStringParameter(param) {
    var params = document.URL.split("?")[1].split("&");
    var strParams = "";
    for (var i = 0; i < params.length; i = i + 1) {
        var singleParam = params[i].split("=");
        if (singleParam[0] == param) {
            return singleParam[1];
        }
    }
}

function printAllListNamesFromHostWeb() {

    try {
        clearRows("actTable");
        clearRows("listTable");
        clearRows("libraryTable");
        
        web = appCtxSite.get_web();
        context.load(web);
        context.executeQueryAsync(
            // Success
            function () {
                lists = web.get_lists();
                context.load(lists, 'Include(Title, Id, ParentWebUrl, ItemCount, HasExternalDataSource, Hidden, ContentTypesEnabled)');
                ACTs = web.get_availableContentTypes();
                context.load(ACTs, 'Include(Description, DisplayFormTemplateName, DisplayFormUrl, DocumentTemplate, DocumentTemplateUrl, EditFormTemplateName, EditFormUrl, Group, Hidden, Id, Name, NewFormTemplateName, NewFormUrl, ReadOnly, SchemaXml, Scope, Sealed, StringId)');
                context.executeQueryAsync(
                    Function.createDelegate(this, onSuccess),
                    Function.createDelegate(this, onFail))
                },
                // Failure
                function () {
                    alert('Error querying SharePoint');
                }
        );
    }
    catch (ex) {
        alert('printAllListNamesFromHostWeb error: ' + ex.message);
    }

}

function onTestLink(sender) {
    alert('onTestLink');
}
function scanSelectedTemplates() {
    var table = $('#listTable');
    scanSelectedTemplatesInTable(table);

    table = $('#libraryTable');
    scanSelectedTemplatesInTable(table);

    table = $('#actTable');
    scanSelectedTemplatesInTable(table);
}
function scanSelectedTemplatesInTable(table) {
    var htmlCode = table.html();
    var liburl = '';
    var xsnurl = '';

    var params = document.URL.split("?")[1];

    var rows = table.find('.ctRow');
    rows.each(function () {
        try {
            var row = $(this);

            //"<tr class='ctRow' id='' style='font-weight:bold'>
            //      <td class='ctSelected'>
            //          <input type='checkbox' value='0'>
            //      </td>
            //      <td class='ctName'>
            //      </td>
            //      <td class='ctUrl'>
            //      </td>
            //  </tr>

            url = row.find(".ctUrl")
            xsnurl = url.text();
            if (xsnurl == '') {
                return;
            }

            var td = row.find('.ctSelected');
            var selected = td.find("input:checkbox"); // get <input> node

            if (selected.is(':checked')) {
                //TODO: fix this hack 
                xsnurl = siteroot + xsnurl;

                url = "/Pages/ScanXsn.aspx?" + params + "&xsnUrl=" + xsnurl;
                window.open(url);
            }
        }
        catch (ex) {
            alert('row processing error: ' + ex.message);
        }
    });
}

function onSuccess(sender, args) {
    try {
        var ctTableName = ('actTable');
        var ctEnumerator = ACTs.getEnumerator();
        var ctCount = 0;
        while (ctEnumerator.moveNext()) {
            var ct = ctEnumerator.get_current();
            addContentTypeRow(ctTableName, ct, ctCount);
            ctCount = ctCount + 1;
        }
        var table = $("#" + ctTableName);
        table.children("tbody").children("tr:first").remove();
    }
    catch (ex) {
        alert('onSuccess: error enumerating ACTs');
    }

    try {

        var listInfo = '';
        var listEnumerator = lists.getEnumerator();
        while (listEnumerator.moveNext()) {
            var list = listEnumerator.get_current();
            if (!list.get_hidden()) {
                var tableName = 'libraryTable';
                //tableName = 'listTable';
                addRow(tableName, list.get_id(), list.get_title(), list.get_parentWebUrl(), list.get_itemCount().toString());
            }
        }
    }
    catch (ex) {
        alert('onSuccess error: ' + ex.message);
    }
}
function clearRows(sTableId) {
    var table = $("#" + sTableId);
    table.children("tbody").html("");
}
function clearListRow(id) {
    var row = $("#listRow_" + id.toString());
    row.remove();
}
function addRow(sTableId, listguid, name, url, itemCount) {
    try {
        // find destination and template tables, find first <tr>
        // in template. Wrap inner html around <tr> tags.
        // Keep track of counter to give unique field names.
        var table = $("#" + sTableId);
        var template = $("#" + sTableId + "_rowtemplate");
        var htmlCode = "<tr class='ctRow' id='" + sTableId + "_${counter}'>" + template.find("tr:first").html() + "</tr>";
        var id = parseInt(template.data("counter"), 10) + 1;
        template.data("counter", id);

        htmlCode = htmlCode.replace(/\${counter}/g, id);
        table.find("." + sTableId + "Body:last").append(htmlCode);

        // Append content type placeholder
        var ctRowTemplate = $("#contentTypeTable_rowTemplate").children("tbody");
        htmlCode = ctRowTemplate.html();
        htmlCode = htmlCode.replace(/\${counter}/g, id);
        table.find("." + sTableId + "Body:last").append(htmlCode);

        var htmlCode = table.html();

        $("#" + sTableId + "_name_" + id.toString()).text(name);
        $("#" + sTableId + "_url_" + id.toString()).text(url);
        $("#" + sTableId + "_itemCount_" + id.toString()).text(itemCount.toString());

        queryContentTypes(id, name);
    }
    catch (ex) {
        alert('addRow(sTableId, listguid, name, url, itemCount) error: ' + ex.message);
    }
}
function addContentTypeRow(sTableId, CT, ctCount) {
    try {
        var table = $("#" + sTableId);
        // Append content type placeholder
        if (CT.get_hidden() == false) {
            var group = CT.get_group();
            if (group == 'Microsoft InfoPath' || group == 'Form') {
                var htmlCode = "<tr class='ctRow' id='' style='font-weight:bold'>" +
                    "<td class='ctSelected'><input type='checkbox' value='0'></td>" +
                    newTd(CT.get_name(), 'ctName') +
                    newTd(CT.get_documentTemplateUrl(), 'ctUrl') +
                "</tr>";
                table.children("tbody:last").append(htmlCode);
            }
        }
    }
    catch (ex) {
        alert('error: ' + ex.message);
    }
}
function newTd(text) {
    return ("<td>" + htmlEncode(text) + "</td>");
}
function newTd(text, className) {
    return ("<td class='" + className + "'>" + htmlEncode(text) + "</td>");
}
function queryContentTypes(id, listTitle) {
    try {
        var list = lists.getByTitle(listTitle);
        if (list == null) {
            alert('list == null');
            return;
        }
        var CTs = list.get_contentTypes();
        context.load(CTs, "Include(Hidden, Group, Name, NewFormTemplateName, DisplayFormTemplateName, EditFormTemplateName, DocumentTemplate, DocumentTemplateUrl, DisplayFormUrl)");

        context.executeQueryAsync(
            Function.createDelegate(this, function () { onContentTypeQuerySuccess(id, CTs); }),
            Function.createDelegate(this, function () { onContentTypeQueryFail(id); })
            );
    }
    catch (ex) {
        alert('queryContentTypes error: ' + ex.message);
    }
}

function onContentTypeQuerySuccess(id, CTs) {
    try {
        var ctTableName = ('ctTable_' + id.toString());
        var ctEnumerator = CTs.getEnumerator();
        var ctCount = 0;
        while (ctEnumerator.moveNext()) {
            var ct = ctEnumerator.get_current();
            if (ct.get_group() == 'Microsoft InfoPath') {
                addContentTypeRow(ctTableName, ct, ctCount);
                ctCount = ctCount + 1;
            }
        }
        var table = $("#" + ctTableName);
        table.children("tbody").children("tr:first").remove();
        if (ctCount == 0) {
            clearListRow(id);
            //            table.children("tbody").append("<tr style='font-size:8'><td/><td>No InfoPath Forms found.</td></tr>");
        }
    }
    catch (ex) {
        alert('onContentTypeQuerySuccess error: ' + ex.message);
    }
}

function onContentTypeQueryFail(id) {
    var ctlid = '#ctTable_' + id.toString();

    var htmlString = $(ctlid).html();
    $(ctlid).html('error getting content types');
}

function expandRow(childElem) {
    try {
        var child = $(childElem);

        var row = child.closest("tr"); // find <tr> parent
        var td = row.children('td:first');
        var a = td.children('a:first');

        if (a.text() == '+') { // Expand the node
            a.text('-'); // change to collapse indicator
            var nextRow = row.next();
            if (nextRow.attr('id').substring(0, 14) == 'trContentType_') {
                nextRow.show();
            }
            else {
                // hitting here means something went wrong
            }
        }
        else {
            a.text('+'); // change to expand indicator
            var nextRow = row.next();
            if (nextRow.attr('id').substring(0, 14) == 'trContentType_') {
                nextRow.hide();
            }
            else {
                // hitting here means something went wrong
            }
        }
    }
    catch (ex) {
        alert('expandRow(childElem) error: ' + ex.message);
    }
}
// delete <TR> row, childElem is any element inside row
function deleteRow(childElem) {
    try {
        var child = $(childElem);
        var row = child.closest('tr'); // find <tr> parent
        var nextRow = row.next();
        nextRow.remove();
        row.remove();
    }
    catch (ex) {
        alert('deleteRow(childElem) error: ' + ex.message);
    }
}

function onFail(sender, args) {
    alert('failed to get list. Error:' + args.get_message());
}

function htmlEncode(value) {
    //create a in-memory div, set it's inner text(which jQuery automatically encodes)
    //then grab the encoded contents back out.  The div never exists on the page.
    return $('<div/>').text(value).html();
}

function htmlDecode(value) {
    return $('<div/>').html(value).text();
}
