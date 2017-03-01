(function (qd, qRules) {
    "use strict";

    qRules.SortTable = function () {
        var cnt = qd.FormsViewer.qRules.Constants,
            optionalParameters = [{
                name: cnt.paramDsName,
                description: 'Data Source Name'
            },
            {
                name: cnt.paramOrder,
                description: 'Sort Order (asc | desc)'
            },
            {
                name: cnt.paramType,
                description: 'Data Type (text | number)'
            }],
            requiredParameters = [{
                name: cnt.paramRow,
                description: 'XPath to Table Row'
            },
            {
                name: cnt.paramCompare,
                description: 'Relative XPath to Compare Field'
            }],
            errorFailedToSelectTable = "Failed to select the table to sort.",
            errorFailedToSelectRow = "Failed to select the row to sort.",
            errorSortFieldCountMismatch = "Parameter count mismatch for RelativeXPathToCompareField, SortOrder, and DataType." +
            "\nPlease verify each parameter has the same number of comma-separated values.",
            errorInvalidOrder = "Optional order parameter has invalid value. This parameter, if included, should be set to ASC or DESC.";

        function sortNode(xPath, isAsc) {
            return function (node1, node2) {
                var value1 = node1.evaluateString(xPath),
                    value2 = node2.evaluateString(xPath);

                if (value1 === value2) {
                    return 0;
                }

                return value1 < value2
                    ? (isAsc ? -1 : 1)
                    : (isAsc ? 1 : -1);
            };
        }

        function isAscOrder(orderType) {
            if (orderType !== "desc" && orderType !== "asc") {
                throw new Error(errorInvalidOrder);
            }

            return orderType === "asc";
        }

        function applyMultipleSort() {
            var filters = arguments[0],
                orders = arguments[1];

            return function (node1, node2) {
                var i = 0,
                    result = 0,
                    filterLength = filters.length;

                while (result === 0 && i < filterLength) {
                    var orderType = orders[i].toLowerCase(),
                        isAsc = isAscOrder(orderType);

                    result = sortNode(filters[i], isAsc)(node1, node2);
                    i++;
                }

                return result;
            };
        }

        function getSortedNodes(rowNodes, fieldXPath, order) {
            return rowNodes
                .sort(applyMultipleSort(fieldXPath, order))
                .map(function (node) {
                    return node.getNode();
                });
        }

        function SortTable(params) {

            function sortTableAsync(cf, dsName, rowXPath, fieldXPathList, orderList, typeList) {
                var dom = cf.getDataSource(dsName),
                    table = cf.getValidNode(dom, rowXPath + "/..", errorFailedToSelectTable),
                    row = cf.getValidNode(dom, rowXPath, errorFailedToSelectRow),
                    fieldXPath = fieldXPathList.split(','),
                    order = orderList.split(','),
                    type = typeList.split(','),
                    orderIndex = 0;

                // Ensure each parameter has the same number of split values.
                if (!(fieldXPath.length === order.length && order.length === type.length)) {
                    throw new Error(errorSortFieldCountMismatch);
                }

                // Make sure we have 2 or more rows.
                var rowNodes = dom.selectNodes(rowXPath);
                if (rowNodes.length <= 1) {
                    // No need to sort--not enough rows.
                    return {
                        Success: true
                    };
                }

                var sortedNodes = getSortedNodes(rowNodes, fieldXPath, order);

                return table.setContentAsync(sortedNodes)
                    .then(function () {
                        return {
                            Success: true
                        };
                    });
            }

            function executeAsync() {
                var cf = params.commonFunction,
                    dsName = cf.getParamValue(cnt.paramDsName),
                    row = cf.getParamValue(cnt.paramRow),
                    compare = cf.getParamValue(cnt.paramCompare),
                    order = cf.getParamValue(cnt.paramOrder, "asc"),
                    type = cf.getParamValue(cnt.paramType, "text");

                return sortTableAsync(cf, dsName, row, compare, order, type);
            }

            return {
                executeAsync: executeAsync,
                optionalParameters: optionalParameters,
                requiredParameters: requiredParameters
            };
        }

        return SortTable;
    }();

})(Qd, Qd.FormsViewer.qRules);