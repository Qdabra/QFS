var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};

// Keeps track of the current view, the view templates, and
// carries out the rendering of the view on the page
(function ($, qd, fv, xslt, xu) {
    var h = virtualDom.h,
        createElement = virtualDom.create,
        diff = virtualDom.diff,
        patch = virtualDom.patch;

    function viewManager(template, renderTarget, richTextManager, dataSources) {
        var views = {},
            currentView,
            lastRendered,
            rootNode;

        richTextManager = fv.richTextManager();

        function setTarget(target) {
            renderTarget = $(target);
        }

        function convertTo12Hr(digit) {
            if (digit === 0) {
                return 12;
            }

            if (digit < 13) {
                return digit;
            }

            return digit - 12;
        }

        function convertToTwoDigit(digit) {
            var prefix = digit >= 10 ? '' : '0';

            return prefix + digit;
        }

        function utcTimeString(date) {
            var utcHours = date.getHours(),
                isAM = utcHours < 12;
            utcHours = convertToTwoDigit(convertTo12Hr(utcHours));

            var utcMinutes = convertToTwoDigit(date.getMinutes()),
            utcSeconds = convertToTwoDigit(date.getSeconds());

            return String.format('{0}:{1}:{2} {3}', utcHours, utcMinutes, utcSeconds,
                (isAM ? 'AM' : 'PM'));
        }

        function formatDateString(dateString) {
            if (!dateString) {
                return null;
            }

            if (dateString.length > 19) {
                dateString = dateString.substring(0, 19);
            }

            var endDateString = dateString[dateString.length - 1];
            if (endDateString !== 'Z' || endDateString !== 'z') {
                dateString += 'Z';
            }

            return dateString;
        }

        function addDatePickers() {
            //changeMonth, changeYear: allow user to select month and year.

            renderTarget.find(".xdDTPicker > input")
                .datepicker({
                    showOn: "button",
                    changeMonth: true,
                    changeYear: true,
                    buttonImage: "/images/calendar.gif",
                    buttonImageOnly: true,
                    buttonText: "Select date",
                    beforeShow: function (input, inst) {
                        var contentEdit = $(input).attr('contenteditable');
                        return contentEdit !== 'false';
                    }
                    //,
                    //defaultDate: 0
                    //,dateFormat: "yy-mm-dd" //Set incase we use FVUtil.parseXmlDateTime
                })
                .each(function (i, el) {
                    var $el = $(el),
                        timeElement = $el.parent().next('.xdTimeTextBoxWrap').find('input');

                    var hasTimeElement = (timeElement.length > 0);

                    var dateValue = $el.attr('data-fv-value');
                    var origValue = dateValue;

                    dateValue = formatDateString(dateValue);

                    var dateParsed = dateValue ? Date.parse(dateValue) : null,
                        date = dateParsed && dateParsed > 0 && !Number.isNaN(dateParsed)
                        ? new Date(dateParsed)
                        : null;

                    //date = FVUtil.parseXmlDateTime($el.val());TODO:Check parse required ??

                    if (!date) {
                        if (hasTimeElement) {
                            timeElement.val(origValue);
                        }
                        $el.val(origValue);
                        return;
                    }

                    date = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
                    $el.datepicker("setDate", date);

                    if (hasTimeElement) {
                        timeElement.val(utcTimeString(date));
                    }
                });
        }

        function addAutoSizeTextboxes() {
            renderTarget.find("textarea")
                        .css("white-space", "pre-wrap")
                        .filter("[data-auto-height = true]")
                        .autosize({ append: "" })
                        .trigger("autosize.resize");
        }

        /// <summary>Function to render Richtext box control using CkEditor</summary>
        function addRichTextBox() {
            richTextManager.ensureRichText(renderTarget);
        }

        function addPeoplePickers() {
            var select2Options = {
                width: '88%',
                placeholder: '',
                allowClear: true
            },
            select2MultOptions = {
                width: '88%'
            };

            $('.ppl-picker')
                .each(function () {
                    var $this = $(this);
                    if (!!$this.data('select2')) {
                        return;
                    }

                    var fvDs = $this.data('fvDs'),
                        fvId = $this.data('fvId'),
                        elmBinding = $this.attr('binding'),
                        isMulti = JSON.parse($this.attr('allowMultiple')),
                        options = isMulti ? select2MultOptions : select2Options;

                    options.data = null;

                    if (fvId) {
                        var bindingNode = dataSources.getNodeById({ id: fvId, ds: fvDs });
                        if (bindingNode) {
                            var personNodes = bindingNode.selectNodes('pc:Person');
                            if (personNodes.length) {
                                var data = personNodes
                                    .map(function (pNode) {
                                        var displayName = pNode.selectSingle('pc:DisplayName').value(),
                                            accountId = pNode.selectSingle('pc:AccountId').value(),
                                            accountType = pNode.selectSingle('pc:AccountType').value();

                                        return {
                                            id: accountId,
                                            text: displayName,
                                            DisplayName: displayName,
                                            AccountId: accountId,
                                            AccountType: accountType
                                        };
                                    })
                                    .filter(function (pNode) {
                                        return !!pNode.id;
                                    });

                                if (data.length) {
                                    options.data = data;
                                }
                            }
                        }
                    }

                    $this.html("");

                    $this.select2(options);

                    if (options.data && options.data.length) {
                        var selectedIds = options.data.map(function (item) {
                            return item.id;
                        });

                        $this.val(selectedIds).trigger('change');
                    }
                });
        }

        function modifyDefaultSelect() {
            $('select:not([class*="ppl-picker"])').select2();
        }

        function makeAttrMap(attributes) {
            var attrs = {
            };

            Object.keys(attributes).forEach(function (key) {
                attrs[attributes[key].name] = attributes[key].value;
            });

            return attrs;
        }

        function findSelectedIndex(selectNode) {
            var options = selectNode.children.filter(function (c) {
                return c.type === xu.DOM_ELEMENT_NODE && c.name.toLowerCase() === 'option';
            });

            for (var i = 0; i < options.length; i += 1) {
                options[i].attrMap = makeAttrMap(options[i].attributes);
                if ('selected' in options[i].attrMap) {
                    return i;
                }
            }

            return 0;
        }

        function hasAttribute(rawEl, name) {
            return Object.keys(rawEl.attributes).some(function (key) {
                return rawEl.attributes[key].name === name;
            });
        }

        function selectHasBlankOption(options) {
            return options.some(function (el) {
                return Object.keys(el.attributes).some(function (key) {
                    return el.attributes[key].name === 'value' && el.attributes[key].value === '';
                });
            });
        }

        function selectedIndex(options) {
            var bits = options.map(function (el) {
                return hasAttribute(el, 'selected');
            });

            var selectedIdx = bits.indexOf(true);

            return selectedIdx >= 0 ? selectedIdx : 0;
        }

        function selectedIndexHook(index) {
            var hook = function () { };
            hook.prototype.hook = function (node) {
                node.selectedIndex = index;
            };
            return new hook();
        }

        function fixupSelect(rawNode, props) {
            var options = rawNode.children.filter(function (el) {
                return el.name.toLowerCase() === 'option';
            });

            if (selectHasBlankOption(options)) {
                rawNode.children = rawNode.children.filter(function (el) {
                    return el.name !== 'option' || hasAttribute(el, 'value');
                });
            }

            props.selectedIndex = selectedIndexHook(selectedIndex(options));
        }

        function renderVNode(rawNode) {
            if (rawNode.type === xu.DOM_ELEMENT_NODE) {
                var attributes = rawNode.attrMap || makeAttrMap(rawNode.attributes),
                    props = { attributes: attributes },
                    lowerName = rawNode.name.toLowerCase(),
                    children;

                // case 41047 - changes to textbox value are not reflected in view
                // setting .value property on <select> elements can cause a blank value to be incorrectly selected
                if ('value' in attributes) {
                    if (lowerName !== 'select') {
                        props.value = attributes.value;
                    }
                }

                if (lowerName === 'select') {
                    fixupSelect(rawNode, props);
                }

                if (lowerName === 'input' &&
                    (attributes.type === 'checkbox' || attributes.type === 'radio') &&
                    ('checked' in attributes || 'CHECKED' in attributes)
                    ) {
                    props.checked = true;
                }


                // case 41077 - multiline text box's value gets duplicated
                if (lowerName === 'textarea') {
                    children = [];
                    props.value = rawNode.children
                        .filter(function (n) {
                            return n.type === xu.DOM_TEXT_NODE;
                        })
                        .map(function (n) {
                            return n.value;
                        })
                        .join('');
                } else {
                    children = rawNode.children.map(renderVNode).filter(function (n) {
                        return n !== null;
                    });
                }

                return h(rawNode.name, props, children);
            }
            if (rawNode.type === xu.DOM_TEXT_NODE) {
                return rawNode.value;
            }
            return null;
        }

        function renderView(viewBody, formDom, functions) {
            var result = viewBody.transformRaw(formDom, {
                functions: functions
            }),
                tree = renderVNode(result[0]);

            if (lastRendered) {
                var patches = diff(lastRendered, tree);

                rootNode = patch(rootNode, patches);
            } else {
                rootNode = createElement(tree);
                renderTarget.empty();
                renderTarget.append(rootNode);
            }

            lastRendered = tree;

            addDatePickers();
            addRichTextBox();
            addPeoplePickers();
            addAutoSizeTextboxes();
            //modifyDefaultSelect();
        }

        function loadView(viewName) {
            return template.getViewDefinitionAsync(viewName)
            .then(function (data) {
                var body = $.parseXML(data.Main),
                    viewData = {
                        head: $.parseXML(data.Head),
                        body: xslt.compile(body)
                    };

                views[viewName] = viewData;

                return viewData;
            });
        }

        function removeStyles($pageHead) {
            var items = $pageHead.children("style[data-creator=formsViewer]");
            items.remove();
        };

        function prepareStyle(element) {
            var ss1 = document.createElement('style'),
                def = element.textContent,
                tt1;

            ss1.setAttribute("type", "text/css");
            ss1.setAttribute("data-creator", "formsViewer");

            if (ss1.styleSheet) {   // IE
                ss1.styleSheet.cssText = def;
            } else {                // others
                tt1 = document.createTextNode(def);
                ss1.appendChild(tt1);
            }

            return ss1;
        }

        function setStyles(viewHead) {
            var pageHead = document.head || $("head")[0],
                $pageHead = $(pageHead),
                styles = $(viewHead).find("style");

            removeStyles($pageHead);

            styles.each(function (_, e) {
                $pageHead.append(prepareStyle(e));
            });
        }

        function prepareViewAsync(viewName) {
            return loadView(viewName)
            .then(function (viewData) {
                setStyles(viewData.head);
                return viewData;
            });
        }

        // todo: don't require passing in functions?
        function startRenderViewAsync(formDom, functions) {
            var view = views[currentView],
                p = view ? Q.Promise.resolve(view) : prepareViewAsync(currentView);

            qd.util.perfMark('formsviewer_view_render_start');
            return p
                .then(function (viewData) {
                    qd.util.perfMark('formsviewer_view_rendering');
                    renderView(viewData.body, formDom, functions);
                })
                .finally(function () {
                    qd.util.perfMark('formsviewer_view_rendered');
                    qd.util.perfMeasure('formsviewer_view_file', 'formsviewer_view_render_start', 'formsviewer_view_rendering');
                    qd.util.perfMeasure('formsviewer_view_render', 'formsviewer_view_rendering', 'formsviewer_view_rendered');
                });

        }

        function getCurrentView() {
            return currentView;
        }

        function setCurrentView(view) {
            var views = template.getViews();
            if (!views || !views.length || views.indexOf(view) < 0) {
                throw new Error('Cannot set view, invalid view.');
            }

            var viewData = views[view];

            currentView = view;

            if (viewData) {
                setStyles(viewData.head);
            }
        }

        setCurrentView(template.getDefaultView());

        // interface
        return {
            getCurrentView: getCurrentView,
            setCurrentView: setCurrentView,
            startRenderViewAsync: startRenderViewAsync,
            setTarget: setTarget
        };
    }

    fv.viewManager = viewManager;
})(jQuery, Qd, Qd.FormsViewer, qd.xslt, qd.xmlUtility);

