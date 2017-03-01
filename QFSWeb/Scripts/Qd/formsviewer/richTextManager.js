(function (fv) {
    "use strict";

    function updateRichText(element, elemId) {
        CKEDITOR.instances[elemId].setData($(element).attr('data-fv-value'));
    }

    function blurHandler() {
        // Update the associated element to the latest value
        this.updateElement();
        // Trigger change event so that FormsViewer handlers can run
        $('#' + this.element.$.id).trigger('change');
    }

    function attachRichText(element, elemId) {
        var instance = CKEDITOR.instances[elemId];

        if (instance) {
            instance.destroy();
        }

        CKEDITOR.inline(elemId, { on: { blur: blurHandler } });
    }

    function ensureRichText(baseNode) {
        baseNode.find('.fv-rich-text[id]:not([id=""])').each(function (i, elem) {
            var elemId = $(elem).attr('id');

            attachRichText(elem, elemId);

            updateRichText(elem, elemId);
        });
    }

    function richTextManager() {
        return {
            ensureRichText: ensureRichText
        };
    }

    fv.richTextManager = richTextManager;
})(Qd.FormsViewer);