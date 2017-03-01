var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.LoadResource = (function (qd) {

    var constant = qd.FormsViewer.qRules.Constants,
        requiredParameters = [
            {
                name: constant.paramName,
                description: 'The name of resource'
            }
        ],
        optionalParameters = [
            {
                name: constant.paramType,
                description: 'If specified, must be either "script" or "style" - the type of the resource'
            },
            {
                name: constant.paramUnload,
                description: 'If true, indicates that the resource should be unloaded (defaults - false)'
            },
            {
                name: constant.paramAllowExternal,
                description: 'If true, loads the name value as an external resource (defaults - false)'
            }
        ],
        validExtension = ['css', 'js'],
        validType = ['style', 'script'],
        attrResourceName = 'data-fv-resource-name',
        errorInvalidNameMessage = 'Could not load resource invalid name:{0}',
        errorUnloadMessage = 'Could not unload resource with name:{0}',
        errorInvalidPathMessage = 'Could not load resource invalid path in name:{0}',
        errorInvalidTypeMessage = 'Could not load resource invalid type:{0}';

    function getType(name) {
        if (!name.indexOf('.')) {
            throw new Error(String.format(errorInvalidNameMessage, name));
        }
        var extension = name.split('.').pop().toLowerCase();

        switch (extension) {
            case validExtension[0]:
                return validType[0];
            case validExtension[1]:
                return validType[1];
            default:
                return '';
        }
    }

    function getChildByType(type, name, url) {
        var tagName = '',
            attributes = [];
        switch (type) {
            case 'script':
                tagName = 'script';
                attributes = [
                    {
                        key: 'type',
                        value: 'text/javascript'
                    },
                    {
                        key: 'src',
                        value: url
                    }
                ];
                break;

            case 'style':
                tagName = 'link';
                attributes = [
                    {
                        key: 'type',
                        value: 'text/css'
                    },
                    {
                        key: 'rel',
                        value: 'Stylesheet'
                    },
                    {
                        key: 'href',
                        value: url
                    }
                ];
                break;
        }

        var child = $('<' + tagName + '/>')
            .attr(attrResourceName, name);

        attributes.forEach(function (attribute) {
            child.attr(attribute.key, attribute.value);
        });

        return child;
    }

    function unloadResource(head, name) {
        var resources = head.find(String.format('[{0}="{1}"]', attrResourceName, name));

        if (!resources.length) {
            throw new Error(String.format(errorUnloadMessage, name));
        }

        resources.remove();
        return Q({
            Success: true
        });
    }

    function LoadResource(params) {

        function executeAsync() {
            var cf = params.commonFunction,
                name = cf.getParamValue(constant.paramName),
                type = cf.getParamValue(constant.paramType),
                unload = cf.getBoolParamValue(constant.paramUnload, false),
                allowExternal = cf.getBoolParamValue(constant.paramAllowExternal, false),
                isExternal = allowExternal && name.indexOf('/') >= 0;

            if (!isExternal && !unload && (name.indexOf('\\') >= 0 || name.indexOf('/') >= 0)) {
                throw new Error(String.format(errorInvalidPathMessage, name));
            }

            var doc = $(document).find('head'),
                head = $(doc);

            if (unload) {
                return unloadResource(head, name);
            }

            if (!type) {
                type = getType(name);
            }

            if (!type) {
                throw new Error(String.format(errorInvalidNameMessage, name));
            }

            if (validType.indexOf(type) < 0) {
                throw new Error(String.format(errorInvalidTypeMessage, type));
            }

            type = type.toLowerCase();

            var resourceUrl = isExternal
                ? name
                : params.template.getResourceAbsoluteUrl(name),
                child = getChildByType(type, name, resourceUrl);

            try {
                head.append(child);
            } catch (e) {
                throw new Error('Could not load resource at this moment.')
            }

            return Q({
                Success: true
            });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    return LoadResource;
})(Qd);