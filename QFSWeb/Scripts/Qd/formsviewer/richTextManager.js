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

    var fvRtbPattern = /^fvCTRL/;

    function destroyRichTextBoxes() {
        Object.keys(CKEDITOR.instances)
            .filter(function (key) {
                return fvRtbPattern.test(key);
            })
            .forEach(function (key) {
                CKEDITOR.instances[key].destroy();
            });
    }

    function attachRichText(element, elemId) {
        CKEDITOR.inline(elemId, { on: { blur: blurHandler } });
    }

    function ensureRichText(baseNode) {
        destroyRichTextBoxes();

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