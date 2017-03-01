var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.DataConnections = Qd.FormsViewer.DataConnections || {};

(function (dc) {
    "use strict";

    var qNs = 'http://schemas.microsoft.com/office/infopath/2009/WSSList/queryFields',
        dNs = 'http://schemas.microsoft.com/office/infopath/2009/WSSList/dataFields',
        dfsNs = dc.utils.dfsNs,
        baseXml = '<dfs:myFields xmlns:d="' + dNs + '" xmlns:q="' + qNs + '" xmlns:dfs="' + dfsNs + '" />';

    var invalidFieldValue = {};

    function buildBaseXml(fields) {
        var xml = $.parseXML(baseXml),
            myFields = FVUtil.firstElementChild(xml),
            qf = xml.createElementNS(dfsNs, "dfs:queryFields"),
            qFields = xml.createElementNS(qNs, "q:SharePointListItem_RW"),
            dFields = xml.createElementNS(dfsNs, "dfs:dataFields");

        myFields.appendChild(qf).appendChild(qFields);
        myFields.appendChild(dFields);

        fields.forEach(function (field) {
            qFields.appendChild(xml.createElementNS(qNs, 'q:' + field.internalName));
        });

        return {
            xml: xml,
            queryFields: qFields,
            dataFields: dFields
        };
    }

    function shouldUseFilterField(filterField) {
        return !!filterField.value;
    }

    function convertBoolean(value) {
        // empirically verified in InfoPath - this conversion is case sensitive (requires XML boolean values)
        if (value === 'true' || value === '1') {
            return '1';
        }
        if (value === 'false' || value === '0') {
            return '0';
        }

        return invalidFieldValue;
    }

    function convertFieldValue(type, value) {
        if (!value) {
            return null;
        }

        if (type === "Boolean") {
            return convertBoolean(value);
        }

        return value;
    }

    function shpListAdapter(definition, template, shpAccess, qfsAccess) {
        var listId = definition.listId,
            siteUrl = dc.utils.combinePath(template.getBasePath(), definition.siteURL),
            fields = definition.fields,
            baseXmlParts = buildBaseXml(fields),
            queryFieldsNode = baseXmlParts.queryFields,
            dataFieldsNode = baseXmlParts.dataFields;

        function getFilterField(fieldDef) {
            var fieldNode = queryFieldsNode.getElementsByTagNameNS(qNs, fieldDef.internalName),
                fieldValue = $(fieldNode).text(),
                convertedValue = convertFieldValue(fieldDef.type, fieldValue);

            if (convertedValue === invalidFieldValue) {
                throw new Error('Invalid value for column "' + fieldDef.internalName + '" specified in the query fields.');
            }

            return { field: fieldDef, value: convertedValue };
        }

        function updateData(retrievedXml) {
            $(dataFieldsNode).empty().append($(retrievedXml).children());
        };

        function makeXmlItem(item, dom) {
            var el = dom.createElementNS(SharePointAccess.NamespaceIPData, "d:SharePointListItem_RW"),
                values = item.fieldArray,
                valueEl, key, value;

            values.forEach(function (field) {
                key = field.internalName;
                value = field.value;
                valueEl = dom.createElementNS(SharePointAccess.NamespaceIPData, "d:" + key);

                if (field.isDateTime) {
                    if (!value) {
                        valueEl.textContent = null;
                    }
                    else {
                        if (!(value instanceof Date)) {
                            value = parseInt(value.substr(6));
                            value = new Date(value);
                        }

                        valueEl.textContent = SharePointAccess.convertDate(value);
                    }
                }
                else if (field.isFieldUserValue) {
                    SharePointAccess.addUserValue(valueEl, value, dom);
                }
                else if (field.isFieldLookupValue) {
                    SharePointAccess.addLookupValue(valueEl, value, dom);
                }
                else if (field.isRichText) {
                    //Move the method to util.js -- 11/15/16
                    qd.util.setRichTextString(valueEl, value);
                }
                else if (value || value === 0) {
                    valueEl.textContent = value;
                }

                el.appendChild(valueEl);
            });

            return el;
        }

        function qfsListToXml(data) {
            var dom = $.parseXML(SharePointAccess.DataFieldsElement),
                docEl = dom.documentElement;

            data.forEach(function (item) {
                docEl.appendChild(makeXmlItem(item, dom));
            });

            return docEl;
        }

        function appendColumnValue(dom, destNode, value, isRichText) {
            if (isRichText) {
                //Move the method to util.js -- 11/15/16
                qd.util.setRichTextString(destNode, value);
            }
            else if (value instanceof Date) {
                destNode.textContent = SharePointAccess.convertDate(value);
            }
            else if (value instanceof SP.FieldUserValue) {
                // Currently disabling the population of user fields because we can't get any userful values
                // addUserValue(destNode, value, dom);
            }
            else if (value instanceof SP.FieldLookupValue) {
                SharePointAccess.addLookupValue(destNode, value, dom);
            }
            else if (value || value === 0) {
                destNode.textContent = value;
            }

        }

        function makeShpXmlItem(item, fieldTypes, dom) {
            var el = dom.createElementNS(SharePointAccess.NamespaceIPData, "d:SharePointListItem_RW"),
                values = item.get_fieldValues();

            Object.keys(values)
                .forEach(function (key) {
                    var valueEl = dom.createElementNS(SharePointAccess.NamespaceIPData, "d:" + key);
                    // could be an array or single value, so normalize to an array
                    var valueArr = [].concat(values[key]);
                    var fieldDef = fieldTypes[key];
                    var isRichText = fieldDef && fieldDef.isRichText;

                    valueArr.forEach(function (value) {
                        appendColumnValue(dom, valueEl, value, isRichText);
                    });

                    el.appendChild(valueEl);
                });

            return el;
        }

        function shpListToXml(data) {
            var items = data.items.getEnumerator(),
                item,
                dom = $.parseXML(SharePointAccess.DataFieldsElement),
                docEl = dom.documentElement,
                fields = data.fields.getEnumerator(),
                fieldType = {};

            while (items.moveNext()) {
                item = items.get_current();

                var columnKeys = Object.keys(item.get_fieldValues());

                while (fields.moveNext()) {
                    var field = fields.get_current(),
                        internalName = field.get_staticName();

                    if (columnKeys.indexOf(internalName) >= 0) {
                        fieldType[internalName] = {
                            type: field.get_fieldTypeKind(),
                            isRichText: field.get_richText && field.get_richText()
                        };
                    }
                }

                docEl.appendChild(makeShpXmlItem(item, fieldType, dom));
            }

            return docEl;
        }

        function executeAsync(dataSource) {
            return Q()
                .then(function () {
                    var queryFields = fields
                        .map(getFilterField)
                        .filter(shouldUseFilterField);

                    if (SharePointAccess.isAppOnlyMode) {
                        return qfsAccess.querySpListAsync({
                            siteUrl: siteUrl,
                            listId: listId,
                            Fields: definition.fieldNames,
                            filterFields: queryFields,
                            sortBy: definition.sortBy,
                            sortAsc: definition.sortAsc
                        })
                            .catch(function () {
                                throw new Error('Failed to execute connection: ' + definition.name);
                            })
                            .then(qfsListToXml);
                    }

                    return shpAccess.queryListXmlAsync(listId, definition.fieldNames, queryFields, siteUrl, definition.sortBy, definition.sortAsc)
                        .then(shpListToXml);
                })
                .then(updateData);
        }

        function initAsync(dataSource) {
            dataSource.setDom(baseXmlParts.xml);

            return Q.Promise.resolve();
        }

        function setUrlAndListId(spSiteUrl, spListId) {
            siteUrl = spSiteUrl;
            listId = spListId;
        }

        // interface
        return {
            executeAsync: executeAsync,
            initAsync: initAsync,
            setUrlAndListId: setUrlAndListId
        };
    }

    dc.shpListAdapter = shpListAdapter;
})(Qd.FormsViewer.DataConnections);