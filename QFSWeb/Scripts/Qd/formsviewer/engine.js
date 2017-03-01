var Qd = Qd || {};

Qd.FormsViewer = Qd.FormsViewer || {};

(function (qd, fv) {
    "use strict";

    fv.engine = function (
        viewManager,
        mainXml,
        template,
        functions,
        renderTarget,
        shpAccess,
        xpathEngine,
        ruleSetExecutor,
        dataConnections,
        dataSources,
        qfsAccess
        ) {

        var ds = Qd.FormsViewer.DataSources;
        var ui = Qd.FormsViewer.UI;

        // temporary alias
        var formDom = mainXml;

        var defValues = ds.defaultValueApplicator(template, dataSources);

        var widgetManager = fv.widgetManager(template, viewManager, { getNodeForNodeId: getNodeForNodeId }),
            xmlActionExecutor = fv.xmlActionExecutor(dataSources),
            peopleSelector = fv.UI.peopleSelector(qfsAccess, shpAccess);


        function unhandledError(error) {
            console.error(error);
        }

        function renderViewAsync() {
            return viewManager.startRenderViewAsync(mainXml, functions);
        }

        function resetFileValueCacheValues(field) {
            var fcf = fv.Constants.Files;

            if (FVUtil.getNodeData(field, fcf.FileNameProperty)) {
                FVUtil.setNodeData(field, fcf.FileNameProperty, null);
                FVUtil.setNodeData(field, fcf.FileSizeProperty, null);
            }
        }

        function setNodeValueAsync(node, value) {
            resetFileValueCacheValues(node);
            // TODO: implement
        }

        function getNodeForNodeId(nodeId) {
            return dataSources.getNodeById(nodeId);
        }

        function evaluateXPath(path, options) {
            var context = options && options.context;
            return xpathEngine.evaluateXPath(xpath, { context: context });
        }

        function getDateValue(oldValue, isValidDate, value, isDateTime) {
            if (oldValue && !oldValue.endsWith('Z')) {
                oldValue += 'Z';
            }

            var oldDate = oldValue && oldValue.length > 11 && !Number.isNaN(Date.parse(oldValue))
                ? qd.util.parseIsoDate(oldValue)
                : null;
            var selectedDate = isValidDate && value
                ? qd.util.parseIsoDate(value)
                : null;

            if (selectedDate) {
                selectedDate.omitMilliseconds = true;

                if (oldDate) {
                    // case 42803
                    selectedDate.date = new Date(Date.UTC(selectedDate.date.getUTCFullYear(),
                                                          selectedDate.date.getUTCMonth(),
                                                          selectedDate.date.getUTCDate(),
                                                          oldDate.date.getUTCHours(),
                                                          oldDate.date.getUTCMinutes(),
                                                          oldDate.date.getUTCSeconds()));

                    return qd.util.makeIsoDate(selectedDate);
                } else {
                    selectedDate.omitTimeIfZero = !isDateTime;//omit only if date field

                    return qd.util.makeIsoDate(selectedDate);
                }
            }

            return value;
        }

        function getTimeValue(oldValue, value) {
            var currentDate = new Date().toDateString(),
                oldDateMilli = oldValue ? Date.parse(oldValue) : null,
                oldDate = oldDateMilli && !Number.isNaN(oldDateMilli) && oldDateMilli > 0
                ? new Date(oldValue)
                : null,
                timeRegExp = /^([0]?[0-9]|1[0-9]|2[0-3]):([0-5]\d):([0-5]\d)\s?$/igm;

            if (oldDate) {
                oldDate = new Date(oldDate.getTime() + oldDate.getTimezoneOffset() * 60 * 1000);
            }

            var isPMValue = /^([0]?[0-9]|1[0-9]|2[0-3]):([0-5]\d):([0-5]\d)(\s+PM)\s?$/igm.test(value);
            var timeValue = value;

            if (value) {
                value = value.replace(/\s+(AM|PM)/ig, '');
            }

            if (value && timeRegExp.test(value)) {
                var valueSubstr = value,
                selectedDateMilli = Date.parse(currentDate + ' ' + valueSubstr),
                selectedDate;

                if (!Number.isNaN(selectedDateMilli)) {
                    selectedDate = new Date(selectedDateMilli);

                    if (selectedDate.getHours() === 12) {
                        selectedDate.setHours(0);
                    }

                    if (isPMValue) {
                        selectedDate.setHours(selectedDate.getHours() + 12);
                    }
                }

                if (selectedDate) {
                    if (oldDate) {
                        selectedDate.setFullYear(oldDate.getFullYear());
                        selectedDate.setMonth(oldDate.getMonth());
                        selectedDate.setDate(oldDate.getDate());

                    }
                    selectedDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60 * 1000);

                    timeValue = selectedDate.toISOString().substr(0, 19);
                }
            }

            return timeValue;
        }

        // string, string -> Promise
        function updateNodeByNodeIdAsync(nodeId, value, controlType, isValidDate, isRichText, isDateTime) {
            var node = getNodeForNodeId(nodeId);

            if (node) {
                if ((controlType === 'datePicker' || controlType === 'timePicker') && value) {
                    var oldValue = node.value();

                    if (controlType === 'datePicker') {
                        value = getDateValue(oldValue, isValidDate, value, isDateTime);
                    }
                    else {
                        value = getTimeValue(oldValue, value);
                    }
                }

                return node.setValueAsync(value, { isRichTextString: isRichText });
            }

            console.error("Unable to find node with id ", JSON.stringify(nodeId));

            return Q.Promise.resolve();
        };

        // Handles a field change event from the page DOM
        function handleFieldChangeAsync(props) {
            return updateNodeByNodeIdAsync(props.nodeId, props.newValue, props.controlType, props.isValidDate, props.isRichText, props.isDateTime)
                .then(renderViewAsync);
        }

        /**
         * Run the specified ruleSet
         * @param ruleSet - A rule set definition
         * @param [context] - a dataSourceNode object. if unspecified, the document element of the main data source will be used as the context
         */
        function runRuleSetAsync(ruleSet, context) {
            return ruleSetExecutor.runRuleSetAsync(ruleSet, context || getDocumentElement());
        }

        // String, String, String -> RuleSetResult?
        function executeButtonRulesAsync(ctrlId, nodeId) {
            var ruleSet = template.getButtonRules(viewManager.getCurrentView(), ctrlId),
                context = ruleSet && getNodeForNodeId(nodeId);

            if (ruleSet && context) {
                return runRuleSetAsync(ruleSet, context);
            }

            // TODO?: log info
            return Q.Promise.resolve();
        }

        function closeForm() {
            var formCloser = fv.UI.formCloser(renderTarget);
            formCloser.closeForm();
        }

        function handleRuleSetResultAsync(ruleSetResult) {
            if (ruleSetResult && ruleSetResult.status === ResultTypes.CLOSE) {
                closeForm();
                return Q();
            }

            return renderViewAsync();
        }

        function pickImageAsync(ctrlId, nodeId) {
            var contextNode = getNodeForNodeId(nodeId),
                fsd = fv.UI.fileDialog;

            if (contextNode) {
                return fsd.create().showAsync()
                .then(function (result) {
                    if (result.result === fsd.RESULT_RETRIEVED) {
                        var b64 = FVUtil.File.arrayBufferToBase64(result.file.bytes);

                        return contextNode.setValueAsync(b64);
                    }
                    return null;
                });
            } else {
                return Q.Promise.reject(new Error("Could not find node for clicked image. CtrlId: " + ctrlId + "; id: " + nodeId));
            }
        }

        function createObjectModel() {
            return {
                getNodeById: getNodeForNodeId,
                setNodeValueAsync: setNodeValueAsync
            };
        }

        function handleFileClickAsync(nodeId) {
            var om = createObjectModel(),
                handler = fv.Controls.attachmentClickHandler.create(om, nodeId);

            return handler.handleClickAsync()
                .then(renderViewAsync);
        }

        function handleQueryError(adapterName, error) {
            alert("An error occurred querying the " + adapterName + " data source.");
            if (error && error.message) {
                console.log("Error querying " + adapterName + ": " + error.message);
            }
        }

        // DataAdapter -> Promise[void]
        function submitWithAsync(adapter) {
            var name = adapter.name,
                conn = dataConnections.get(name);

            if (!conn) {
                return Q.Promise.reject(new Error("Data connection not available: " + name));
            }

            return conn.executeAsync();
        }

        /**
         * Get a dataSourceNode for the main data source's document element
         */
        function getDocumentElement() {
            return dataSources.getMainDocumentElement();
        };

        function performDefaultSubmitAsync() {
            var submitSettings = template.getSubmitSettings();

            if (submitSettings) {
                if (submitSettings.adapter) {
                    return submitWithAsync(submitSettings.adapter);
                } else if (submitSettings.ruleSet) {
                    return runRuleSetAsync(submitSettings.ruleSet);
                }
            } else {
                return Q.Promise.reject(new Error("This form does not have any submit settings specified."));
            }
        }

        function routeButtonActionAsync(action, bProps) {
            var ctrlId = bProps.ctrlId,
                nodeId = bProps.nodeId;

            switch (action) {
                case "":
                    return executeButtonRulesAsync(ctrlId, nodeId)
                        .then(handleRuleSetResultAsync);
                case "submit":
                    return performDefaultSubmitAsync()
                        .then(renderViewAsync);
                case "image":
                    return pickImageAsync(ctrlId, nodeId)
                        // TODO (perf): only re-render if an image was picked
                        .then(renderViewAsync);
                case "file":
                    return handleFileClickAsync(nodeId);
                default:
                    return Q.Promise.reject(new Error("Unknown action: " + action));
            }
        }

        /**
         * @param parent - a dataSourceNode
         * @param nodesToCheck - array of DOMNode
         */
        function tryToInsertAsync(parent, nodesToCheck) {
            var currentCheckNode = nodesToCheck.pop(),
                toInsert,
                inserted;

            // Find child node of Parent with same name as CurrentCheckNode
            var matchingChild = parent.childNodes().filter(function (n) {
                var match = (n.localName() === currentCheckNode.localName) &&
                            (n.namespaceURI() === currentCheckNode.namespaceURI);
                return match;
            })[0];

            if (!matchingChild || nodesToCheck.length === 0) {
                //Insert CurrentCheckNode under Parent & we're done!
                toInsert = currentCheckNode.cloneNode(true);
                return parent.appendChildAsync(toInsert);
            }

            return tryToInsertAsync(matchingChild, nodesToCheck); // Recurse down
        }

        function buildTryInsertList(container, innerFragment) {
            var currentNode = innerFragment,
                nodesToCheck = [];

            if (currentNode) {
                while (currentNode && currentNode !== container) {
                    nodesToCheck.push(currentNode);
                    currentNode = currentNode.parentNode;
                }

                return nodesToCheck;
            } else {
                // Error
            }
        }

        function insertLastAsync(xmlDom, viewName, sectionName, contextNode, editableComponent) {
            // insert a new repeating row into the xmlDOM
            // (1) Select parent attribute from xsf:chooseFragment
            var pathToParent = editableComponent.parent,
                actualContext = contextNode.selectSingle(pathToParent),
                nodesToCheck = buildTryInsertList(editableComponent.fragmentContainer, editableComponent.innerFragment);

            return tryToInsertAsync(actualContext, nodesToCheck);
        }

        // xmlDOM - the XML DOM for the form
        // viewName - the name of the current view
        // sectionName - 
        // contextNode - an xml node near the repeating group (e.g. parent, grandparent)
        // insertType - type of insert (insertAfter, insertBefore, insert)
        function insertRepeatingNodeAsync(xmlDom, viewName, sectionName, contextNode, insertType) {
            return Q.Promise.resolve().then(function () {
                var editableComponent = template.getEditableComponent(viewName, sectionName);

                if (editableComponent) {
                    return insertLastAsync(xmlDom, viewName, sectionName, contextNode, editableComponent);
                } else {
                    throw new Error('Could not determine item to insert.');
                }
            });
        };

        function handleInsertClickAsync(nodeId, xmlToEdit) {
            var contextNode = getNodeForNodeId(nodeId);

            // TODO - use the right DOM instead of the main one? maybe not needed because InfoPath only supports inserting into MDS

            return insertRepeatingNodeAsync(formDom, viewManager.getCurrentView(), xmlToEdit, contextNode, "insert")
            .then(renderViewAsync);
        }

        function handleMenuItemClickAsync(eventInfo) {
            var action = widgetManager.processMenuItemClick(eventInfo);

            return xmlActionExecutor.performXmlToEditActionAsync(
                    action.target,
                    action.action,
                    action.xmlToEdit)
                .catch(function (err) { console.error(err); })
                .then(renderViewAsync);
        }

        function setPeoplePickerNodeAsync(personNode, item) {
            var displayNameNode = personNode.selectSingle('pc:DisplayName'),
                accountIdNode = personNode.selectSingle('pc:AccountId'),
                accountTypeNode = personNode.selectSingle('pc:AccountType');

            return displayNameNode.setValueAsync(item.text)
                .then(function () {
                    return accountIdNode.setValueAsync(item.id);
                }).then(function () {
                    return accountTypeNode.setValueAsync(item.EntityType);
                });
        }

        function createPeoplePickerElement(result, props) {
            return Q()
                .then(function () {

                    if (result) {
                        var targetNode = dataSources.getNodeById(props.nodeId);

                        if (targetNode) {
                            var personNodes = targetNode.selectNodes('pc:person'),
                                personNode = personNodes[0];

                            if (result.length) {
                                $(targetNode.getNode()).empty();

                                return qd.util.runPromiseSequence(result,
                                    function (lastResult, item) {
                                        if (lastResult && lastResult.shouldStop) {
                                            return lastResult;
                                        }
                                        else {
                                            return setPeoplePickerNodeAsync(personNode, item)
                                                .then(function () {
                                                    return targetNode.appendChildAsync(personNode.getNode().cloneNode(true));
                                                });
                                        }
                                    })
                                    .then(renderViewAsync);
                            }
                            else {
                                var item = {
                                    text: '',
                                    id: '',
                                    EntityType: ''
                                };

                                return setPeoplePickerNodeAsync(personNode, item)
                                    .then(renderViewAsync);
                            }
                        }
                    }
                });

        }

        function handlePeoplePickerClick(eventInfo, isAddressBook) {
            var target = $(eventInfo.target).parent().find('.ppl-picker'),
                select2Options = peopleSelector.select2Options,
                select2MultOptions = peopleSelector.select2MultOptions;

            return Q()
                .then(function () {
                    if (isAddressBook) {
                        return peopleSelector.searchAddressBookAsync(eventInfo);
                    }

                    return peopleSelector.checkUserNameAsync(eventInfo);
                })
                .then(function (users) {
                    if (!users.length) {
                        return;
                    }
                    var allowMultiple = eventInfo.allowMultiple;
                    //Clear only if single selection

                    if (allowMultiple) {
                        var selected = target.val() ? target.select2('data') : [];

                        for (var index in users) {
                            var item = users[index];

                            var isExist = selected.some(function (sel) {
                                return sel.id === item.id;
                            });

                            if (!isExist) {
                                selected.push(item);
                            }
                        }

                        users = selected;
                    }

                    target.html("");
                    var options = allowMultiple ? select2MultOptions : select2Options;
                    options.data = users;

                    target.select2(options);

                    if (allowMultiple) {
                        target.val(users.map(function (item) { return item.id; })).trigger('change');
                    } else {
                        target.val(users[0].id).trigger('change');
                    }
                });
        }

        function runViewEvent(eventInfo) {
            var props = eventInfo.props;

            return Q()
                .then(function () {
                    var eventType = eventInfo.type;

                    switch (eventType) {
                        case "fieldChange":
                            props.controlType = eventInfo.controlType;

                            props.isDateTime = eventInfo.props && eventInfo.props.formatType
                                && eventInfo.props.formatType === "datetime";//Property to check is datetime field

                            return handleFieldChangeAsync(props);
                        case "button":
                            return routeButtonActionAsync(props.action || "", props);
                        case "insertClick":
                            return handleInsertClickAsync(eventInfo.id, eventInfo.xmlToEdit);
                        case "showMenu":
                            widgetManager.showWidgetMenu(eventInfo);
                            return;
                        case "showMenuHandle":
                            widgetManager.showDropdownWidget(eventInfo);
                            return;
                        case "menuItemClick":
                            return handleMenuItemClickAsync(eventInfo);
                        case "pplPickerSearchAddressBookClick":
                            return handlePeoplePickerClick(eventInfo, true);

                        case "pplPickerCheckNamesClick":
                            return handlePeoplePickerClick(eventInfo, false);

                        case 'peopleSearchReset':
                            return createPeoplePickerElement(eventInfo.data, eventInfo.props);
                    }

                    throw new Error("Unsupported view event: " + eventType);
                });
        }

        function handleViewEvent(eventInfo) {
            Q.Promise.resolve(eventInfo)
                .then(runViewEvent)
                .catch(unhandledError);
        }

        function initDataSourceAsync(dataConnection) {
            return dataConnection.initAsync().catch(function (e) {
                console.error("Error initializing data source " + dataConnection.name);
                console.error(e);
                //throw e;
            });
        };

        // void -> void
        function initDataSourcesAsync() {
            return Q.all(dataConnections.getAll().map(initDataSourceAsync));
        }

        // void -> Promise[void]
        function queryOnLoadDataSourcesAsync() {
            var onLoadDses = dataSources.getAll()
                .filter(function (source) {
                    return source.initOnLoad;
                });

            return qd.util.runPromiseSequence(onLoadDses, function (lastResult, dSource) {
                var conn = dataConnections.get(dSource.name);

                return conn.executeAsync();
            }, function (err, dSource) {
                var errMsg = 'An error occured querying the data connection ' + dSource.name + '.',
                    errDetails = '';

                console.error(err);

                if (err) {
                    if (err.shpError && err.shpError.get_message) {
                        errDetails = err.shpError.get_message();
                    }
                    else if (err.message) {
                        errDetails = err.message;
                    }
                }

                var fd = new fv.UI.failureDialog('Query Failed', errMsg, errDetails);
                return fd.showAsync();
            });
        }

        function addEvents() {
            var vw = fv.viewWatcher.create(renderTarget);
            vw.subscribe(handleViewEvent);
        }

        function handleInitError(e) {
            // intentionally not returning so that wait overlay can hide
            ui.showLoadFailedError(e, renderTarget);
        }

        function processInitialDefaultValuesAsync() {
            return defValues.processAllDefaultValues();
        }

        function performFormLoadRulesAsync() {
            var loadRules = template.getOnLoadRules();

            if (loadRules) {
                // Context node for on load rules is the main DOM's document element
                return runRuleSetAsync(loadRules);
            }

            return Q.Promise.resolve();
        }

        function initFieldChangeListener() {
            var executor = ds.fieldChangeRuleExecutor(template, ruleSetExecutor),
                qRules = qd.FormsViewer.qRules.qRules(
                    dataConnections,
                    dataSources,
                    template,
                    qfsAccess,
                    xpathEngine,
                    shpAccess,
                    viewManager,
            {
                user: shpAccess.getUser(),
                functions: functions
            }),
                listener = ds.fieldChangeListener(defValues, executor, qRules);

            dataSources.setListener(listener);
        }

        function initQRulesAsync() {
            var qRules = qd.FormsViewer.qRules.qRules(dataConnections, dataSources, template, qfsAccess, xpathEngine, shpAccess, viewManager);

            return qRules.initializeAsync();
        }

        function initAsync() {
            return Q.Promise.resolve()
                .then(initFieldChangeListener)
                .then(initDataSourcesAsync)
                .then(queryOnLoadDataSourcesAsync)
                .then(initQRulesAsync)
                .then(addEvents)
                .then(processInitialDefaultValuesAsync)
                .then(performFormLoadRulesAsync)
                .then(renderViewAsync)
                .catch(handleInitError);
        }

        return {
            initAsync: initAsync
        };
    };
})(Qd, Qd.FormsViewer);