var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.InsertPi = (function (qd) {
    'use strict';

    var requiredParameters = [{
        name: 'name',
        description: 'Name of the processing instruction to insert'
    },
    {
        name: 'data',
        description: 'Data content of the processing instruction'
    }],
    optionalParameters = [{
        name: 'update',
        description: 'Update the processing-instruction if it already exists'
    },
    {
        name: 'dsname',
        description: 'Name of the DataSource to insert the processing instruction'
    }],
    insertpiErrorPiExists = "The specified PI already exists";

    function InsertPi(params) {

        function executeAsync() {
            var commonFunction = params.commonFunction,
                name = commonFunction.getParamValue('name'),
                data = commonFunction.getParamValue('data'),
                update = commonFunction.getBoolParamValue('update'),
                dsName = commonFunction.getParamValue('dsname'),
                dom = commonFunction.getDataSource(dsName),
                existingPi = commonFunction.getPi(dom, name);

            return Q()
                .then(function () {
                    if (existingPi && !update) {
                        return {
                            Error: insertpiErrorPiExists,
                            Success: false
                        };
                    }

                    var xdoc = qd.util.ownerDocument(dom.getNode()),
                        newPi = xdoc.createProcessingInstruction(name, data);

                    if (existingPi) {
                        existingPi.deleteSelf();
                    }

                    return dom.selectSingle('/*')
                        .insertBeforeAsync(newPi)
                        .then(function () {
                            return {
                                Success: true
                            };
                        })
                        .catch(function () {
                            return {
                                Success: false,
                                Error: 'Error occured trying to insert Pi'
                            };
                        });
                });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    return InsertPi;
})(Qd);