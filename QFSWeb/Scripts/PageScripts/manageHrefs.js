(function ($) {
    "use strict";

    $(function () {
        var table = $('#hrefsTable');

        function ajax(options) {
            return Q.when($.ajax(options));
        }

        function convertNewRow(row) {
            var $row = $(row);

            $row.removeClass('new').addClass('existing');

            var $href = $row.find('.href');

            $row.data('href', $href.val());
            $row.find('td').eq(0).text($href.val());

            $href.remove();
        }

        function addNewAssociation() {
            var newRow = $('<tr class="new"><td><input type="text" class="href form-control" /></td><td><select class="template-selection form-control"></select></td></tr>');
            var emptyOption = { Id: '', Name: '' };
            var templates = window.manageHrefs.templates;

            var options = [emptyOption].concat(templates).map(function (t) {
                return $('<option>')
                    .attr('value', t.Id)
                    .text(t.Name);
            });

            newRow.find('select').append(options);

            table.find('tbody').append(newRow);
        }

        function saveChanges() {
            var updates = table.find('tr.dirty').toArray().map(function (row) {
                return {
                    href: $(row).data('href'),
                    templateId: $(row).find('.template-selection').val()
                };
            });

            var newHrefs = table.find('tr.new').toArray().map(function (row) {
                return {
                    href: $(row).find('.href').val(),
                    templateId: $(row).find('.template-selection').val()
                }
            });

            ajax({
                method: 'POST',
                url: '/FormsViewer/SaveHrefs' + window.location.search,
                contentType: 'application/json',
                dataType: 'json',
                data: JSON.stringify({
                    newHrefs: newHrefs,
                    updates: updates
                })
            })
                .then(function () {
                    table.find('.new').toArray().forEach(convertNewRow);
                    table.find('.dirty').removeClass('dirty');
                })
                .then(function () {
                    alert('Your changes have been saved.');
                });

            console.log(updates);
            console.log(newHrefs);
        }


        preparePageAsync(true);

        $('#addNewAssociation').click(addNewAssociation);
        $('#saveAssociations').click(saveChanges);
        table.on('change', '.existing .template-selection', function (e) {
            $(e.target).closest('tr').addClass('dirty');
        });
    });

    window.manageHrefs = {};
})(jQuery);