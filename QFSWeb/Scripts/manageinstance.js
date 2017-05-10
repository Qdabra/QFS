(function (window, $, qd, ui) {
    'use strict';

    var dialog, dialogDeleteInstance,
        spHostUrlKey = 'SPHostUrl',
        sPLanguageKey = 'SPLanguage',
        sPClientTagKey = 'SPClientTag',
        sPProductNumberKey = 'SPProductNumber',
        sPAppWebUrlKey = 'SPAppWebUrl',
        Promise = Q.Promise,
        uiLoader = ui.uiLoader(),
        messageBox = ui.messageBox;

    function showMessageAsync(title, msgText) {
        return messageBox.showAsync(title, msgText);
    }

    $(function () {
        return preparePageAsync(true)
            .then(initializeDialog)
            .then(initializeEvents)
            .then(getInstancesList)
            .then(function () {
                $('#divContainer').removeClass('hidden');
            }).done();
    });

    function getAsync(url, settings) {
        return uiLoader.showWaitScreen(Promise.resolve($.ajax(url, settings)), 'Querying');
    }

    function ajaxAsync(p) {
        return uiLoader.showWaitScreen(Promise.resolve($.ajax(p)));
    }

    function getInstancesList() {
        var url = 'InstanceList' + createAdditionalQueryString();

        return getAsync(url, { cache: false })
            .then(function (data) {
                $('#divInstanceList').html(data);

                initializeDataTable();
            })
            .catch(function () {
                $('#divInstanceList').html('There was an error while getting instances list.');
            });
    }

    function initializeDataTable() {
        $('#tblAppInstances').dataTable({

            "fnDrawCallback": function (oSettings) {
                if (oSettings._iDisplayLength >= oSettings.fnRecordsDisplay()) {
                    $('.dataTables_paginate').hide();
                } else {
                    $('.dataTables_paginate').show();
                }
            },
            columnDefs: [
                    { width: 50, targets: 0 }
            ],
            aoColumns: [
            { bSortable: false },
            { bSortable: true },
            { bSortable: true }]
        });
    }

    function closeDeleteDialog() {
        dialogDeleteInstance.dialog("close");
        $('#hdnSelectedId').val('');
    }

    function initializeDialog() {
        dialog = $("#divInstance").dialog({
            autoOpen: false,
            modal: true,
            buttons: {
                "Save": function (element, event) {
                    saveOrUpdateInstance();
                },
                Cancel: function () {
                    dialog.dialog("close");
                }
            },
            close: function () {
                dialog.dialog("close");
            },
            width: 'auto'
        });

        $('#divConfirmDelete').removeClass('hidden');
        dialogDeleteInstance = $("#divConfirmDelete").dialog({
            autoOpen: false,
            modal: true,
            buttons: {
                "Yes": function (element, event) {
                    deleteInstance();
                },
                "No": function () {
                    closeDeleteDialog();
                }
            },
            close: function () {
                closeDeleteDialog();
            },
            width: 'auto'
        });
    }

    function getInstanceId(el) {
        return $(el).closest('[data-instance-id]').data('instance-id');
    }

    function deleteInstance() {
        var dataObject = {
            instanceId: $('#hdnSelectedId').val()
        };

        closeDeleteDialog();

        ajaxAsync({
            url: 'DeleteInstance' + createAdditionalQueryString(),
            type: "POST",
            dataType: "json",
            data: dataObject
        })
            .then(function (data) {
                if (data.Result) {
                    showMessageAsync('Deleted', 'App instance deleted successfully.');
                    getInstancesList();
                }
                else {
                    showMessageAsync('Error', 'There was an error while deleting the credentials.');
                }
            })
            .fail(function (data) {
                showMessageAsync('Error', 'There was an error while deleting the credentials.');
            });
    }

    function confirmDeleteCredential(e) {
        var instanceId = getInstanceId(e.target);
        $('#hdnSelectedId').val(instanceId);

        dialogDeleteInstance.dialog('open');
        $('.ui-dialog :button').blur();
    }

    function initializeEvents() {
        $('#btnAddAppInstance').click(function () {
            showInstanceForm();
        });

        $('#divInstanceList').on('click', '.editInstance', function () {
            var instanceId = getInstanceId(this);
            showInstanceForm(instanceId);
        });

        $('#divInstance').on('click', '.edit-credential', editCredentials);

        $('#divInstanceList').on('click', '.deleteInstance', confirmDeleteCredential);
    }

    function showInstanceForm(instanceId) {
        var url = 'Instance' + createAdditionalQueryString();

        if (instanceId) {
            url += "&instanceId=" + instanceId;
        }

        getAsync(url, { cache: false })
            .then(function (data) {
                $('#divInstance').html(data);
                dialog.dialog('open');
            })
            .catch(function () {
                showMessageAsync('Error', 'There was an error while loading form');
            });
    }

    function editCredentials() {
        $('div#divUsername, div#divPassword, div#divDomain').toggleClass('hidden');

        if (!$('div#divUsername:visible').length) {
            $('div#divPasswordError,div#divUsernameError').addClass('hidden');
        }
    }

    function saveOrUpdateInstance() {
        var instance = createInstance();

        if (!validateForm(instance)) {
            return Q();
        }

        ajaxAsync({
            url: 'Instance' + createAdditionalQueryString(),
            type: "POST",
            dataType: "json",
            data: instance
        })
            .then(function (data) {
                if (data.Exists && JSON.parse(data.Exists)) {
                    showMessageAsync('Error', 'A credential set with same name or url already exists.');
                    return;
                }

                if (data.Result && JSON.parse(data.Result)) {
                    dialog.dialog("close");
                    return getInstancesList();
                }

                showMessageAsync('Error', 'There was an error while saving the credentials.');
            })
            .catch(function (data) {
                showMessageAsync('Error', 'There was an error while saving the credentials.');
            });
    }

    function validateForm(instance) {
        if (instance) {
            if (instance.InstanceName) {
                $('#divInstanceNameError').addClass('hidden');
            }
            else {
                $('#divInstanceNameError').removeClass('hidden');
            }

            if (instance.ServiceUrl) {
                $('#divServiceUrlError').addClass('hidden');
            }
            else {
                $('#divServiceUrlError').removeClass('hidden');
            }

            var regex = /^(https?|ftp):\/\/(((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-fA-F]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|([a-zA-Z][\-a-zA-Z0-9]*)|((([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-fA-F]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-fA-F]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-fA-F]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-fA-F]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/;
            if (regex.test(instance.ServiceUrl)) {
                $('#divWrongServiceUrl').addClass('hidden');
            }
            else {
                $('#divWrongServiceUrl').removeClass('hidden');
            }

            if ($('div#divUsername:visible').length) {
                if (instance.Username) {
                    $('#divUsernameError').addClass('hidden');
                }
                else {
                    $('#divUsernameError').removeClass('hidden');
                }
            }

            if ($('div#divUsername:visible').length) {
                if (instance.Password) {
                    $('#divPasswordError').addClass('hidden');
                }
                else {
                    $('#divPasswordError').removeClass('hidden');
                }
            }
        }

        return $('div#divInstance div.formviewer-error:visible').length === 0;
    }

    function createInstance() {
        var instance = new Object();

        instance.O365Domain = $.trim($('#hdn365Domain').val());
        instance.InstanceId = $.trim($('#hdnInstanceItemId').val());
        instance.InstanceName = $.trim($('#txtbxInstanceName').val());
        instance.ServiceUrl = $.trim($('#txtbxServiceUrl').val());
        instance.Domain = $.trim($('#txtbxDomain').val());
        instance.Username = $.trim($('#txtbxUsername').val());
        instance.Password = $.trim($('#txtbxPassword').val());

        return instance;
    }

    function createAdditionalQueryString() {
        var queryString = window.location.search;

        if (queryString) {
            if (queryString[0] === "?") {
                queryString = queryString.substring(1);
            }

            var keyValuePairArray = queryString.split("&");

            var additionalQueryString = "?" + spHostUrlKey + "=" + getQueryStringValue(keyValuePairArray, spHostUrlKey);
            additionalQueryString += "&" + sPLanguageKey + "=" + getQueryStringValue(keyValuePairArray, sPLanguageKey);
            additionalQueryString += "&" + sPClientTagKey + "=" + getQueryStringValue(keyValuePairArray, sPClientTagKey);
            additionalQueryString += "&" + sPProductNumberKey + "=" + getQueryStringValue(keyValuePairArray, sPProductNumberKey);
            additionalQueryString += "&" + sPAppWebUrlKey + "=" + getQueryStringValue(keyValuePairArray, sPAppWebUrlKey);
            additionalQueryString += '&AppOnly=true';

            return additionalQueryString;
        }

        return null;
    }

    function getQueryStringValue(keyValuePairArray, keyName) {
        if (keyValuePairArray == null || keyValuePairArray.length == 0 || keyName === '') {
            return null;
        }

        for (var i = 0; i < keyValuePairArray.length; i++) {
            var currentKeyValuePair = keyValuePairArray[i].split("=");

            if (currentKeyValuePair.length > 1 && currentKeyValuePair[0] == keyName) {
                return currentKeyValuePair[1];
            }
        }
    }
})(window, jQuery, Qd, Qd.FormsViewer.UI);