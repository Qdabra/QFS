(function ($) {
    "use strict";

    var siteLocation,
        stdTok,
        dlgCreateLicense;

    function addCurrentTimeZone(date) {
        if (!date) {
            return '';
        }

        var currentDate = new Date();
        date = new Date(date.getTime() - currentDate.getTimezoneOffset() * 60 * 1000);

        return date.toISOString();
    }

    function getLicenseDataObject() {
        var selectedDate = $('.date-time').datepicker('getDate');
        return {
            Expiration: addCurrentTimeZone(selectedDate),
            ExpirationDate: selectedDate,
            MonthlyOpens: Number($('#txtbxMonthlyOpens').val()),
            Location: siteLocation
        };
    }

    function isValidData(data) {
        if (!data.MonthlyOpens || Number.isNaN(data.MonthlyOpens)) {
            $('#divMonthlyOpensError').removeClass('hidden');
            return false;
        }
        else {
            $('#divMonthlyOpensError').addClass('hidden');
        }

        if (!data.ExpirationDate) {
            $('#divExpirationError .help-block').html('Expiration Date is required');
            $('#divExpirationError').removeClass('hidden');
            return false;
        }
        else {
            $('#divExpirationError').addClass('hidden');
        }

        if (data.ExpirationDate < new Date()) {
            $('#divExpirationError .help-block').html('Expiration Date must be greater than today');
            $('#divExpirationError').removeClass('hidden');
            return false;
        }
        else {
            $('#divExpirationError').addClass('hidden');
        }

        return true;
    }

    function getLicenses() {
        $.get('Licenses?' + stdTok + '&location=' + siteLocation)
        .then(function (data) {
            $('#divLicenses').html(data);
        })
        .fail(function (x, h, r) {
            alert('There was an error while getting license');
        });
    }

    function createLicenseFailureCallback(x, h, r) {
        alert('There was an error while updating license');
    };

    function createLicenseSuccessCallback(data) {

        if (data && !!data.Success) {
            dlgCreateLicense.dialog("close");
            getLicenses();
        }
        else {
            alert('There was an error while updating license');
        }
    };

    function saveLicenseClick(elm, evt) {
        var licenseData = getLicenseDataObject();
        if (!isValidData(licenseData)) {
            return;
        }

        $.post('CreateLicense', licenseData)
            .then(createLicenseSuccessCallback)
            .fail(createLicenseFailureCallback);
    }

    function initializeDatePicker() {
        $('.date-time').datepicker({
            showOn: "button",
            buttonImageOnly: true,
            buttonText: ""
        });
    }

    $(function () {
        siteLocation = $('#hdnLocation').val();
        preparePageAsync(true);
        stdTok = standardTokens();
        initializeDatePicker();

        $('#lnkManageUsage').attr('href', '/formsviewer/manageusage?' + stdTok);

        $('#divCreateLicense')
            .on('click', '.show-date-picker', function () {
                $(this).prev().datepicker("show");
            });

        $('#divLicenses')
            .on('click', '#btnAddLicense', function () {
                $('#txtbxMonthlyOpens').val(0);
                $('#txtbxExpiration').val('');
                dlgCreateLicense.dialog("open");
            })
            .on('click', '#btnEditLicense', function () {
                $.get('/formsviewer/editlicense?' + stdTok + '&location=' + siteLocation)
                    .then(function (data) {
                        $('#divCreateLicense').html(data);
                        initializeDatePicker();
                        dlgCreateLicense.dialog("open");
                    });
            });

        dlgCreateLicense = $("#divCreateLicense").dialog({
            title: 'License',
            autoOpen: false,
            modal: true,
            buttons: {
                "Save": saveLicenseClick,
                Cancel: function () {
                    dlgCreateLicense.dialog("close");
                }
            },
            close: function () {
                dlgCreateLicense.dialog("close");
            },
            width: '600px'
        });

    });
})(jQuery);