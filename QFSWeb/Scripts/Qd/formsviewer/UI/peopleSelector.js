var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.UI = Qd.FormsViewer.UI || {};

Qd.FormsViewer.UI.peopleSelector = (function (ui) {
    'use strict';

    var width = '88%',
        select2MultOptions = {
            width: width
        },
        select2Options = {
            width: width,
            placeholder: '',
            allowClear: true
        }

    function peopleSelector(qfsAccess, shpAccess) {
        var peoplePickerManager = fv.peoplePickerManager(qfsAccess, shpAccess),
            serverUrl,
            searchPeopleOnly,
            allowMultiple,
            isAddressBook;

        //ifallowMultiple =  (serverUrl && serverUrl.lastIndexOf('/') !== serverUrl.length) {
        //    serverUrl += '/';
        //}

        var maxCount = 200,
            providers,
            dsProviders,
            usersData;

        function makeUi(dialog) {

            var ddlProviders = $('<select>')
                .attr('id', 'ddlProviders'),
                title = 'Person' + (searchPeopleOnly ? '' : '/Group') + ' Picker';

            dsProviders.forEach(function (item) {
                ddlProviders.append($('<option>').attr('value', item.ProviderName).text(item.DisplayName));
            });

            var ddlSelector = $('<select>').attr('class', 'search-selector'),
                phSelectHeading = $("<p>").attr('id', 'phSelectHeading').text('Select Users'),
                divSelector = $('<div>').attr('id', 'divSelector').attr('class', 'hidden')
                .append(phSelectHeading)
                .append(ddlSelector)
                .append($("<div class='buttons add'>").append('<input type="button"/>')),
                ddlResult = $('<select>').attr('class', 'search-result'),
                phResultHeading = $("<p>").attr('id', 'phResultHeading').text('Selected Users'),
                divResult = $('<div>').attr('id', 'divResult').attr('class', 'hidden')
                .append(phResultHeading)
                .append(ddlResult),
                divErrMsg = $("<div>").html('No matching users found.').attr('class', 'hidden err-msg'),
                btnContainer = $("<div class='btn-container'>")
                .append($("<div class='buttons ok'>").append(ui.asyncDialog.makeButton("OK", 'ok')))
                .append($("<div class='buttons cancel'>").append(ui.asyncDialog.makeButton("Cancel", 'cancel'))),
                msgDiv = $('<div>')
                .attr('title', title);

            if (isAddressBook) {
                msgDiv.append(ddlProviders);
            }
            else {
                btnContainer.addClass('hidden');
            }

            msgDiv.append($('<input>').attr('class', 'inp-search').attr('id', 'txtSearch'))
            .append($("<div class='buttons search'>").append('<input type="button"/>'))
            .append(divErrMsg);

            if (isAddressBook) {
                msgDiv.append(divSelector)
            }

            msgDiv.append(divResult)
            .append(btnContainer)
            .on("click", "div.buttons.add", function () {
                var selectedItems = ddlSelector.val()
                    ? ddlSelector.select2('data')
                    : [];

                if (!selectedItems.length) {
                    return;
                }

                var selectedResult = ddlResult.val() ? ddlResult.select2('data') : [];

                for (var index in selectedItems) {

                    var item = selectedItems[index],
                        isExists = selectedResult.some(function (res) {
                            return item.id === res.id;
                        });

                    if (!isExists) {
                        selectedResult.push(item);
                    }
                }

                ddlResult.html('');
                ddlResult.select2({
                    multiple: 'multiple',
                    width: '99%',
                    data: selectedResult
                });
            })
            .on("click", "div.buttons.search", function (data) {
                divErrMsg.hide();

                var parentDiv = $(this).closest('.fv-people-selector-dialog'),
                    searchText = parentDiv.find('#txtSearch').val(),
                    selectedProvider = parentDiv.find('#ddlProviders').val(),
                    listProviders = !isAddressBook
                    ? providers.map(function (item) {
                        return item.ProviderName;
                    })
                    : [selectedProvider];

                if (!searchText) {
                    alert('Please enter text to search user.');
                    return;
                }

                return Q()
                    .then(function () {
                        if (isAddressBook) {
                            return peoplePickerManager.getUserListAsync(serverUrl, listProviders, searchText, searchPeopleOnly, maxCount);
                        }

                        return peoplePickerManager.searchUserNameAsync(serverUrl, listProviders, searchText, searchPeopleOnly);
                    })
                    .then(function (data) {
                        return Q()
                            .then(function () {
                                if (isAddressBook) {
                                    if (!data || !data.length) {
                                        divErrMsg.show();
                                        if (allowMultiple) {
                                            divSelector.hide();
                                        }
                                        else {
                                            divResult.hide();
                                        }
                                        return;
                                    }

                                    var resultHeading = allowMultiple ? 'Selected users' : 'Select user';
                                    phResultHeading.html(resultHeading);

                                    if (allowMultiple) {
                                        divSelector.show();
                                        ddlSelector.html('');

                                        ddlSelector.select2({
                                            data: data,
                                            multiple: 'multiple',
                                            width: '92%',
                                            placeholder: 'Please type to select users'
                                        });

                                        if (divResult.is(':hidden')) {
                                            ddlResult.select2({
                                                multiple: 'multiple',
                                                width: '99%'
                                            });
                                        }
                                    }
                                    else {
                                        ddlResult.html('');
                                        ddlResult.select2({
                                            data: data,
                                            width: '99%'
                                        });
                                    }

                                    divResult.show();
                                    return;
                                }
                                else {
                                    if (!data || !data.length) {
                                        divErrMsg.show();
                                        return;
                                    }

                                    if (data.length === 1) {
                                        ddlResult.html('');
                                        ddlResult.select2({
                                            data: data,
                                            width: '99%'
                                        });

                                        var result = ddlResult.val() ? ddlResult.select2('data') : [];

                                        return dialog.closeWithResult(result);
                                    }

                                    ddlResult.html('');
                                    ddlResult.select2({
                                        data: data,
                                        width: '99%'
                                    });

                                    divResult.show();
                                    btnContainer.show();
                                    return;
                                }
                            });
                    });
            })
            .on("click", "div.buttons.cancel", function (data) {
                return dialog.closeWithResult([]);
            })
            .on("click", "div.buttons.ok", function (data) {
                var result = ddlResult.val() ? ddlResult.select2('data') : [];
                return dialog.closeWithResult(result);
            });

            ddlProviders.val('Tenant');

            return msgDiv;
        }

        function searchAddressBookAsync(eventInfo) {
            isAddressBook = true;

            searchPeopleOnly = eventInfo.searchPeopleOnly;
            allowMultiple = eventInfo.allowMultiple;
            serverUrl = eventInfo.serverUrl;

            if (serverUrl && serverUrl.lastIndexOf('/') !== serverUrl.length - 1) {
                serverUrl += '/';
            }

            return peoplePickerManager.checkIsClaimsModeAsync(serverUrl)
                .then(function (data) {
                    if (!!data) {
                        return peoplePickerManager.getClaimProviderSchemasAsync(serverUrl);
                    }
                })
                .then(function (data) {
                    if (data && data.length) {
                        providers = data;
                        //dsProviders = [{ DisplayName: 'All', ProviderName: '-1' }].concat(providers);
                        dsProviders = providers;//TODO:Handle All Type

                    }
                })
                .then(function () {
                    if (!providers.length) {
                        return;
                    }

                    var dialog = new ui.asyncDialog();
                    dialog.class = "fv-people-selector-dialog";
                    dialog.setTarget(makeUi(dialog));

                    return dialog.showAsync();
                });


        }

        function checkUserNameAsync(eventInfo) {
            isAddressBook = false;

            searchPeopleOnly = eventInfo.searchPeopleOnly;
            allowMultiple = eventInfo.allowMultiple;
            serverUrl = eventInfo.serverUrl;

            if (serverUrl && serverUrl.lastIndexOf('/') !== serverUrl.length - 1) {
                serverUrl += '/';
            }

            return peoplePickerManager.checkIsClaimsModeAsync(serverUrl)
                .then(function (data) {
                    if (!!data) {
                        return peoplePickerManager.getClaimProviderSchemasAsync(serverUrl);
                    }
                })
                .then(function (data) {
                    if (data && data.length) {
                        providers = data;
                        dsProviders = providers;
                    }
                })
                .then(function () {
                    if (!providers.length) {
                        return;
                    }

                    var dialog = new ui.asyncDialog();
                    dialog.class = "fv-people-selector-dialog";
                    dialog.setTarget(makeUi(dialog));

                    return dialog.showAsync();
                });
        }

        return {
            searchAddressBookAsync: searchAddressBookAsync,
            checkUserNameAsync: checkUserNameAsync,
            select2Options: select2Options,
            select2MultOptions: select2MultOptions
        };
    }

    return peopleSelector;

})(Qd.FormsViewer.UI);