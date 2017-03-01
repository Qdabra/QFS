var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};

// MenuHandler - Responsible for handling events related to view menus and 
//               updating the HTML view accordingly
(function (fv) {
    "use strict";

    var cMenuClass = ".fv-menu";
    var cMenuWidgetClass = fv.Constants.MenuWidgetClass;

    var constants = fv.Constants;
    var formAttributes = fv.FormAttributes;

    function getRepeaterFromEventTarget($target) {
        return $target.closest(formAttributes.REPEATER)[0];
    }

    function getPropsForRepeater(repeaterNode) {
        var props = fv.viewWatcher.getEventNodeProps(repeaterNode);

        // The ctrlId will not be present on repeating table <tr> nodes, so we need to go higher up to retrive it
        props.ctrlId = props.ctrlId || $(repeaterNode).closest("table").attr(fv.FormAttributes.CTRL_ID);

        return props;
    }

    function shouldShowInMenu(item) {
        return item.action !== "xCollection::insert";
    }

    function widgetManager(template, viewManager, domNodeProvider) {

        function getEditableComponentForEventProps(props, targetDsNode) {
            var domNode = targetDsNode && targetDsNode.getNode(),
                xmlToEdits = domNode && template.getXmlToEdits(domNode, viewManager.getCurrentView());

            return xmlToEdits && xmlToEdits.filter(function (xte) { return xte.viewContext === props.ctrlId; })[0];
        }

        // DomNode -> XmlToEdit
        // Retrieves the XmlToEdit object corresponding to the provided repeating control HTML DOM node
        function getEditableComponentForRepeater(repeaterNode) {
            var props = getPropsForRepeater(repeaterNode),
                targetDomNode = domNodeProvider.getNodeForNodeId(props.nodeId);

            return getEditableComponentForEventProps(props, targetDomNode);
        }

        function getMenuItems($widget) {
            var repeaterNode = getRepeaterFromEventTarget($widget),
                editableComponent = repeaterNode && getEditableComponentForRepeater(repeaterNode),
                menuItems = editableComponent && template.getContextMenuItems(viewManager.getCurrentView(), editableComponent.name);

            return menuItems;
        }

        // jQuery -> jQuery
        // Adds the widget menu to the specified menu widget dom node and returns
        // a jQuery container for the newly created menu node
        function appendWidgetMenu($widget) {
            var $menu = $('<ul class="fv-menu" />'),
                menuItems = getMenuItems($widget);

            function appendItem(item) {
                var $li = $("<li>").attr(fv.FormAttributes.XMLACTION, item.action).text(item.caption);
                $menu.append($li);
            }

            if (menuItems) {
                menuItems.filter(shouldShowInMenu).forEach(appendItem);

                $('<div class="fv-menu-holder" />').append($menu).appendTo($widget);

                return $menu;
            }

            // assume no menu for this particular repeater
            return null;
        }

        function showWidgetMenu(eventInfo) {
            var targ = $(eventInfo.target),
                myMenu = targ.find(cMenuClass),
                allMenuWidgets = $(cMenuWidgetClass),
                allMenus = allMenuWidgets.find(cMenuClass);

            allMenus.not(myMenu)
                    .add(allMenuWidgets.not(targ))
                    .hide();

            myMenu.toggle();
        }

        // Ensures that there is a menu attatched to the targ DOM node,
        // creating one if necessary
        function ensureMenu($targ) {
            var menu = $targ.find(constants.MenuClass);

            if (!menu.length) {
                menu = appendWidgetMenu($targ);
            }

            return !!menu;
        }

        function showDropdownWidget(eventInfo) {
            var $targ = $(eventInfo.target),
                $toShow = $targ.add($targ.parents(formAttributes.REPEATER))
                    .children(".fv-menu-widget-holder")
                    .children(constants.MenuWidgetClass);

            $(constants.MenuWidgetClass).not($toShow).hide();

            if (ensureMenu($toShow)) {
                $toShow.show();
            }
        }

        // Duplicated from ViewWatcher - reconcile this
        function processMenuItemClick(eventInfo) {
            var targ = $(eventInfo.target),
                action = eventInfo.action,
                repeater = getRepeaterFromEventTarget(targ),
                props = repeater && getPropsForRepeater(repeater),
                targetDomNode = props && domNodeProvider.getNodeForNodeId(props.nodeId),
                xmlToEdit = targetDomNode && getEditableComponentForEventProps(props, targetDomNode);

            if (xmlToEdit) {
                return { target: targetDomNode, action: action, xmlToEdit: xmlToEdit };
            } else {
                throw Error("Unable to carry out the specified action.");
            }
        }

        return {
            showDropdownWidget: showDropdownWidget,
            showWidgetMenu: showWidgetMenu,
            processMenuItemClick: processMenuItemClick
        };
    }

    fv.widgetManager = widgetManager;
})(Qd.FormsViewer);

