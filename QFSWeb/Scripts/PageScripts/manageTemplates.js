(function ($) {
    "use strict";

    function getTemplateName(el) {
        return $(el).closest('[data-template-name]').data('template-name');
    }

    function getTemplateUploadedDate(el) {
        return $(el).closest('[data-template-uploaded]').data('template-uploaded');
    }

    $(function () {
        preparePageAsync(true);

        var stdTok = standardTokens();

        function viewerLink(el) {
            var templateName = getTemplateName(el);

            return '/FormsViewer/View?' + stdTok + '&templateName=' + encodeURIComponent(templateName);
        }

        function diagnosticsLink(el) {
            var templateName = getTemplateName(el);

            return "/Scanner/ScanTemplateDiag?" + stdTok + "&templateName=" + encodeURIComponent(templateName);
        }

        function editTemplateLink(el) {
            var templateName = getTemplateName(el);

            return '/FormsViewer/UploadTemplate?' + stdTok + "&update=true&formName=" + encodeURIComponent(templateName);
        }

        $('.editTemplateLink').each(function () {
            this.href = editTemplateLink(this);
        });

        $('.uploadTemplateLink').each(function () {
            this.href = "/FormsViewer/UploadTemplate?" + stdTok;
        });

        $('a.form-open').each(function () {
            this.href = viewerLink(this);
        });

        $('a.form-open-anon').each(function () {
            this.href = viewerLink(this) + '&AppOnly=true';
        });

        $('a.form-open-diagnostics').each(function () {
            this.href = diagnosticsLink(this);
        });

        $('td.form-uploaded').each(function (i, obj) {
            var uploadedDate = getTemplateUploadedDate(obj);
            if (uploadedDate) {
                var date = new Date(uploadedDate + ' UTC');
                obj.innerHTML = date.toLocaleDateString();
            }
            else {
                obj.innerHTML = '';
            }
        });
    });
})(jQuery);