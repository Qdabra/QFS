var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};

// ViewWatcher
// Responsible for receiving DOM events from the DOM, 
//     collecting and assembling the relevant information from the DOM based on those events,
//     and then passing the processed information to registered listener(s)
(function ($, fv) {
    var cEditable = "[data-fv-editable]";
    var cClickable = "[data-fv-clickable]";
    var cFvId = "data-fv-id";
    var cFvDs = "data-fv-ds";
    var cXmlToEdit = "data-fv-xd-xmlToEdit";
    var cOnValue = "data-fv-xd-onValue";
    var cOffValue = "data-fv-xd-offValue";
    var cContext = "data-fv-context";
    var cAction = "data-fv-xd-action";
    var cCtrlId = fv.FormAttributes.CTRL_ID;
    var cDisabled = "disabled";

    // Making this "static" because it needs to be accessed from two different types.
    // Need to decide whether there's a better way to do this.
    function getEventNodeProps(target) {
        var jTarg = $(target),
            fmtVal = Qd.util.getAttribute(target, 'data-fv-xd-datafmt'),
            fmtType,
            currencyLocale,
            hasGrouping;

        if (fmtVal) {
            var fmtValSplit = fmtVal.replace(/"/g, '').split(',');
            fmtType = fmtValSplit[0];

            if (fmtValSplit[1]) {
                var fmtAttr = fmtValSplit[1].split(';'),
                    fmtAttrList = {};

                fmtAttr.forEach(function (attr) {
                    var attrSplit = attr.split(':');

                    fmtAttrList[attrSplit[0]] = attrSplit[1];
                });

                currencyLocale = fmtAttrList['currencyLocale'];

                hasGrouping = (fmtType === "currency" || fmtType === "number") && !fmtAttrList["grouping"];
            }
        }

        return {
            target: target,
            newValue: target.value,
            inputType: jTarg.attr("type"),
            isRichText: jTarg.hasClass('fv-rich-text'),
            context: jTarg.attr(cContext),
            ctrlId: jTarg.attr(cCtrlId),
            nodeId: fv.nodeId.create(jTarg.attr(cFvId), jTarg.attr(cFvDs)),
            action: jTarg.attr(cAction),
            disabled: jTarg.attr(cDisabled),
            formatType: fmtType,
            currencyLocale: currencyLocale,
            hasGrouping: hasGrouping
        };
    }

    function getNewDateValue(target) {
        var datePicker = $(target),
            format = datePicker.datepicker("option", "dateFormat"),
            targetValue = datePicker.val(),
            settings = datePicker.datepicker("option", "settings"),
            selectedDate,
            isValid = true;

        try {
            selectedDate = $.datepicker.parseDate(format, targetValue, settings);
        } catch (e) {
            isValid = false;
        }

        return {
            date: selectedDate ? FVUtil.getXmlDate(selectedDate) : targetValue,
            isValidDate: isValid
        };
    }

    function create(baseNode) {
        var listeners = [],
            $baseNode = $(baseNode);

        function emit(event) {
            listeners.forEach(function (listener) {
                try {
                    listener(event);
                } catch (e) {
                    console.error("Error emitting event: " + JSON.stringify(event));
                    console.error(e);
                }
            });
        }

        function hideWidgets() {
            $baseNode.find(fv.Constants.MenuWidgetClass).hide();
        }

        function formatFieldValueChanges(props) {
            switch (props.formatType) {
                case 'currency':
                    var localeInfo = qd.formsViewer.xpathFunctions.currencyLocales[props.currencyLocale];

                    if (localeInfo) {
                        var valueWithoutComma = props.newValue.replace(/,/g, '').trim(),
                            valueWithoutSymbol = valueWithoutComma.replace(localeInfo.symbol, ''),
                            isSymbolExists = valueWithoutComma.indexOf(localeInfo.symbol) >= 0,
                            isCorrectPosition = localeInfo.position === 'before'
                            ? valueWithoutComma.startsWith(localeInfo.symbol)
                            : valueWithoutComma.endsWith(localeInfo.symbol);

                        if ((!isSymbolExists || isCorrectPosition) && !Number.isNaN(Number(valueWithoutSymbol))) {
                            props.newValue = valueWithoutSymbol
                        }
                    }
                    break;

                case 'percentage':
                    var parsedValue = parseFloat(props.newValue.trim());

                    if (!Number.isNaN(parsedValue)) {
                        props.newValue = parsedValue / 100;
                    }
                    break;

                case 'number':
                    if (props.hasGrouping) {
                        props.newValue = props.newValue.replace(/,/g, '').trim();
                    }
                    break;
            }
        }

        function fieldChange(e, value) {
            var elTarget = $(e.target);
            //TODO:Handle select2 change
            if (elTarget.hasClass('ppl-picker')) {
                return;
            }
            var props = getEventNodeProps(e.target);

            if (props.newValue) {
                formatFieldValueChanges(props);
            }

            if (value) {
                props.newValue = value;
            } else if (props.inputType === "date") {
                props.newValue = getNewDateValue(props.target);
            } else if (props.isRichText) {
                props.newValue = elTarget.html();
            }

            var parentClassName = props.target.parentElement && props.target.parentElement.attributes && props.target.parentElement.attributes['class']
                ? FVUtil.getNodeValue(props.target.parentElement.attributes['class'])
                : null,
                controlType;

            switch (parentClassName) {
                case 'xdDatePicker':
                case 'xdDTPicker':
                    controlType = 'datePicker';
                    var dateObject = getNewDateValue(props.target);
                    props.newValue = dateObject.date;
                    props.isValidDate = dateObject.isValidDate;
                    break;

                case 'xdTimeTextBoxWrap':
                    controlType = 'timePicker';
                    break;

                default:
                    controlType = null;
                    break;
            }

            emit({ type: "fieldChange", props: props, controlType: controlType });
        }

        // Event handler for checkbox check events
        function checkChange(e) {
            var target = e.target,
                value = target.getAttribute(target.checked ? cOnValue : cOffValue);

            fieldChange(e, value);
        }

        // jQueryClickEvent -> void
        // used as an event handler and therefore context is not the containing object
        function buttonClick(e) {
            var target = e.currentTarget,
                bProps = getEventNodeProps(target);

            if (!(bProps.disabled === "true" || bProps.disabled === true)) {
                emit({ type: "button", props: bProps });
            }
        }

        function insertClick(e) {
            var target = $(e.target),
                fvId = target.attr(cFvId),
                fvDs = target.attr(cFvDs),
                xmlToEdit = target.attr(cXmlToEdit);

            emit({ type: "insertClick", id: fv.nodeId.create(fvId, fvDs), xmlToEdit: xmlToEdit });
        }

        function hideMenus() {
            $('.fv-menu-holder').hide();
        }

        function showMenu(e) {
            e.stopPropagation();

            // 2016-10-03 - Disabling for now - causes problems with Rich Text; see also jimmy's 10-13 shelveset
            //emit({ type: "showMenu", target: e.target });
        }

        function showMenuHandle(e) {
            e.stopPropagation();

            hideMenus();

            emit({ type: "showMenuHandle", target: e.target });
        }

        function menuItemClick(e) {
            var targ = $(e.target),
                action = targ.attr(fv.FormAttributes.XMLACTION);

            e.stopPropagation();

            hideMenus();

            emit({ type: "menuItemClick", target: targ, action: action });
        }

        function getPeoplePickerProps(e, type) {
            var target = $(e.target),
                selector = target.closest('.fv-PeoplePicker').find('.ppl-picker'),
                searchPeopleOnly = JSON.parse(selector.attr('searchPeopleOnly')),
                allowMultiple = JSON.parse(selector.attr('allowMultiple')),
                serverUrl = SharePointAccess.isAppOnlyMode ? Qd.qfsAccess.hostRootSiteUrl : SharePointAccess.hostRootSiteUrl;

            emit({
                type: type,
                target: target,
                searchPeopleOnly: searchPeopleOnly,
                allowMultiple: allowMultiple,
                serverUrl: serverUrl,
                props: getEventNodeProps(selector[0])
            });
        }

        function pplPickerSearchAddressBookClick(e) {
            getPeoplePickerProps(e, 'pplPickerSearchAddressBookClick');
        }

        function pplPickerCheckNamesClick(e) {
            getPeoplePickerProps(e, 'pplPickerCheckNamesClick');
        }

        // Subscribe a listener for this viewWatcher.
        // Listener should be a function that accepts a single eventInfo parameter
        function subscribe(listener) {
            if (typeof listener !== "function") {
                throw new TypeError("listener is not a function.");
            }

            listeners.push(listener);
        }

        // Register DOM events on the target node (using event delegation)
        $baseNode
            .on("change", cEditable + "[type != checkbox]", fieldChange)
            .on("change", cEditable + "[type = checkbox]", checkChange)
            .on("click", cClickable, buttonClick)
            .on("click", "[" + cAction + " = 'xCollection::insert']", insertClick)
            .on("mouseenter click", fv.FormAttributes.REPEATER, showMenuHandle)
            .on("click", fv.Constants.MenuWidgetClass, showMenu)
            .on("focus", "input", hideWidgets)
            .on("click", fv.Constants.MenuWidgetClass + " li", menuItemClick)
            .on('click', hideWidgets)
            .on('click', '.ppl-search', pplPickerSearchAddressBookClick)
            .on('click', '.ppl-check-names', pplPickerCheckNamesClick)
            .on('change', '.ppl-picker', function (e) {
                var target = $(e.target),
                    selector = target.closest('.fv-PeoplePicker').find('.ppl-picker'),
                    props = getEventNodeProps(selector[0]),
                    data = $(this).val() ? $(this).select2('data') : [];

                emit({
                    type: 'peopleSearchReset',
                    target: target,
                    props: getEventNodeProps(selector[0]),
                    data: data
                })
            });

        // interface
        return {
            subscribe: subscribe
        };
    }

    fv.viewWatcher = {
        create: create,
        getEventNodeProps: getEventNodeProps
    };
})(jQuery, Qd.FormsViewer);
