(function ($) {
    "use strict";

    $(function () {
        var stdTokens = standardTokens(),
            uiLoader = Qd.FormsViewer.UI.uiLoader();

        var updateValue = $('#update').val();
        var isExisting = updateValue === 'True' || updateValue === 'true';
        var allowDowngrade = false;

        Dropzone.autoDiscover = false;
        Dropzone.options.dropTemplate = {
            init: function () {
                this.on('sending', function (file, xhr, formData) {
                    formData.append('formName', getTemplateName());
                    formData.append('update', $('#update').val());
                    formData.append('location', getHostWebUrl());
                    formData.append('allowDowngrade', allowDowngrade);
                });

                this.on('success', uploadSuccessCallback);

                this.on('error', uploadFailureCallback);

                this.on('maxfilesexceeded', maxFilesExceededCallback);

                this.on('removedfile', removedFileCallback);
            },
            dictDefaultMessage: "Click / Drop here to upload files",
            addRemoveLinks: true,
            dictRemoveFile: "Remove",
            maxFiles: 1,
        }

        var myDropzone = new Dropzone("#dropTemplate", {
            url: "UploadTemplate?" + stdTokens,
            autoProcessQueue: false
        });

        function queryAjaxPromise(url, ajaxParams, loaderText) {
            return uiLoader.showWaitScreen(Q.when($.ajax(url, ajaxParams)), loaderText);
        }

        function viewerLink() {
            return '/FormsViewer/View?' + stdTokens + '&templateName=' + getTemplateNameEscaped();
        }

        preparePageAsync(true)
            .then(initializePageData)
            .done();

        function initializePageData() {
            $('a.form-open').attr("href", viewerLink());

            $('a.form-open-anon').attr("href", viewerLink() + '&AppOnly=true');
        }

        function getTemplateName() {
            var templateName = $.trim($('#formName').val());

            if (!templateName) {
                templateName = $.trim($('#templateName').val());
            }

            return templateName;
        }

        function getTemplateNameEscaped() {
            return encodeURIComponent(getTemplateName());
        }

        $('.templatesLink').click(function () {
            window.location = "/FormsViewer/ManageTemplates?" + stdTokens;
        });

        $('.downloadXsn').click(function () {
            window.location = "/Forms/DownloadTemplate?" + stdTokens + "&templateName=" + getTemplateNameEscaped();
        });

        $('.deleteXsn').click(function () {
            if (!confirm('Are you sure you want to delete this template? This may disrupt user sessions that are currently using this template.')) {
                return;
            }

            var dataObj = {
                templateName: getTemplateName()
            };

            return queryAjaxPromise("/Forms/DeleteTemplate?" + stdTokens,
                {
                    type: 'POST',
                    contentType: 'application/json',
                    dataType: 'json',
                    data: JSON.stringify(dataObj)
                },
                'Deleting')
                .then(function (data) {
                    if (!!data) {
                        alert('Template deleted successfully.');
                        window.location = "/FormsViewer/ManageTemplates?" + stdTokens;
                    }
                    else {
                        $('div.message').html('There was an error while deleting this template.');
                    }
                })
                .fail(function () {
                    $('div.message').html('There was an error while deleting this template.');
                });
        });

        $('.uploadXsn').click(function (e) {
            uploadTemplate(e, false);
        });

        $('.confirmUploadXsn').click(function (e) {
            uploadTemplate(e, true);
        });

        function isValidForm() {
            var formName = getTemplateName();
            if (!formName) {
                alert('Please enter form name to upload template.');
                return false;
            }

            if (myDropzone && myDropzone.files.length == 0) {
                alert('Please select file to upload template.');
                return false;
            }

            return true;
        }

        function setFormLinks(formUrl) {
            $(".form-link .form-open").attr('href', formUrl);
            $(".form-link .form-open-anon").attr('href', formUrl + '&AppOnly=true');
        }

        function uploadSuccessCallback(file, data) {
            var message = data.Message,
                isUploadSuccess = data.IsUploaded;

            var templateName;
            var formLink;

            if (!isUploadSuccess && data.OldVersion && data.NewVersion) {
                var isSameVersion = data.OldVersion === data.NewVersion;
                message = isSameVersion
                ? 'A template with the same version has already been uploaded.'
                : "Your form's has a version of " + data.NewVersion + " which is lower than the current form version " + data.OldVersion;

                $('#divConfirmUpload .message').html(message);
                $('#divConfirmUpload').removeClass('hidden');
            }
            else {

                //Set error message if no success and message is blank
                if (!isUploadSuccess && !message) {
                    message = 'There was an error while uploading template';
                }

                myDropzone.removeAllFiles(true);
                $('#divMessage').html(message);
            }

            if (isUploadSuccess) {
                $('input[name="template"]').val('');
                $('#divMessage').addClass('success').removeClass('message');

                templateName = getTemplateName(),
                formLink = '/FormsViewer/View?' + stdTokens + '&templateName=' + encodeURIComponent(templateName);

                if (!isExisting) {
                    isExisting = true;

                    var headerText = $('<span>Update <strong><em></em></strong></span>');
                    headerText.find('em').text(templateName);

                    $('#divTemplateNameHeader').html(headerText);
                    $("input[name='formName']").val(templateName);
                    $('#divTemplateName').remove();
                    $(".downloadXsn, .deleteXsn").removeClass('hidden');
                    $("input[name='update']").val(true);
                    $(".form-open, .form-open-anon").removeClass('hidden');
                    setFormLinks(formLink);
                }
            }
            else {
                $('#divMessage').removeClass('success').addClass('message');
            }
        }

        function uploadFailureCallback(file, data) {
            $('div.message').html('There was an error while uploading template');
        }

        function maxFilesExceededCallback(file) {
            myDropzone.removeAllFiles(true);
            myDropzone.addFile(file);
        }

        function removedFileCallback(file, x, v) {
            $('#divMessage').html('');
            $('#divConfirmUpload').addClass('hidden');
        }

        function setFileStatustoQueued() {
            if (!myDropzone.files || !myDropzone.files.length) {
                return;
            }

            myDropzone.files.forEach(function (dzFile) {
                dzFile.status = Dropzone.QUEUED;
            });
        }

        function uploadTemplate(e, downgrade) {
            e.preventDefault();
            if (!$('#divConfirmUpload').hasClass('hidden')) {
                $('#divConfirmUpload').addClass('hidden');
            }

            $('#divMessage').html('').removeClass('success message');
            $('div.message').html('');

            if (!isValidForm()) {
                return;
            }

            if (downgrade) {
                if (myDropzone.files.length > 0) {
                    myDropzone.files[0].status = 'queued';
                }
            }

            allowDowngrade = downgrade;

            setFileStatustoQueued();

            myDropzone.processQueue();
        }

    })
})(jQuery);