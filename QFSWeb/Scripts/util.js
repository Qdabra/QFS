var Qd = Qd || {},
    qd = qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};

(function (window, qd, fv, qdNew) {
    // Based on <http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/
    // core.html#ID-1950641247>
    var DOM_ELEMENT_NODE = 1;
    var DOM_ATTRIBUTE_NODE = 2;
    var DOM_TEXT_NODE = 3;
    var DOM_CDATA_SECTION_NODE = 4;
    var DOM_ENTITY_REFERENCE_NODE = 5;
    var DOM_ENTITY_NODE = 6;
    var DOM_PROCESSING_INSTRUCTION_NODE = 7;
    var DOM_COMMENT_NODE = 8;
    var DOM_DOCUMENT_NODE = 9;
    var DOM_DOCUMENT_TYPE_NODE = 10;
    var DOM_DOCUMENT_FRAGMENT_NODE = 11;
    var DOM_NOTATION_NODE = 12;

    var XSLT_NAMESPACE = "http://www.w3.org/1999/XSL/Transform",
        XSI_NAMESPACE = "http://www.w3.org/2001/XMLSchema-instance",
        XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

    var XPathParser = xpath.XPathParser,
        XPathContext = xpath.XPathContext;

    function parseIsoDate(dateStr) {
        // 0 - full str
        // 1 - year
        // 2 - month
        // 3 - day
        // 4 - time
        // 5 - hours
        // 6 - mins
        // 7 - seconds
        // 8 - offset
        // 9 - Z
        var dateRegex = /^(\d\d\d\d)-(\d\d)-(\d\d)(T(\d\d):(\d\d)(?::(\d\d(?:\.\d+)?))?)?([+-]\d{0,4})?([zZ]?)$/;
        var parts = dateRegex.exec(dateStr);

        if (!parts) {
            return null;
        }

        var containsTime = !!parts[4];
        var year = Number(parts[1]);
        var month = Number(parts[2]) - 1;  // JavaScript months are 0-indexed
        var day = Number(parts[3]);

        var seconds = parts[7] ? Number(parts[7]) : 0;
        var fullSeconds = Math.floor(seconds);
        var milliseconds = Math.floor((seconds - fullSeconds) * 1000);

        var timeStamp = containsTime
            ? Date.UTC(year, month, day, Number(parts[5]), Number(parts[6]), fullSeconds, milliseconds)
            : Date.UTC(year, month, day);

        return {
            date: new Date(timeStamp),
            offset: parts[8] || null,
            z: !!parts[9]
        };
    }

    function makeIsoDate(dateSpec) {
        var isoStr = dateSpec.date.toISOString().replace(/[zZ]$/, '');
        var isoStrMs = dateSpec.omitMilliseconds ? isoStr.replace(/\.\d{3}$/, '') : isoStr;

        var datePart = dateSpec.omitTimeIfZero ? isoStrMs.replace(/T00:00:00(\.000)?$/, '') : isoStrMs;
        var offsetPart = dateSpec.offset || '';
        var zPart = dateSpec.z ? 'Z' : '';

        return [datePart, offsetPart, zPart].join('');
    }

    var utility = {
        parseIsoDate: parseIsoDate,
        makeIsoDate: makeIsoDate
    };

    var FVUtil = utility;

    function makeArray(arrayLikeObject) {
        return Array.prototype.slice.call(arrayLikeObject);
    }

    /**
    * Wrapper function to access the owner document uniformly for document
    * and other nodes: for the document node, the owner document is the
    * node itself, for all others it's the ownerDocument property.
    *
    * @param {Node} node
    * @return {Document}
    */
    FVUtil.ownerDocument = function (node) {
        return node.nodeType === DOM_DOCUMENT_NODE ? node : node.ownerDocument;
    };

    FVUtil.makeTextNode = function (refNode, val) {
        var owner = FVUtil.ownerDocument(refNode);

        return owner.createTextNode(val);
    };


    FVUtil.firstElementChild = function (node) {
        return Array.prototype.slice.call(node.childNodes).filter(function (n) { return n.nodeType === DOM_ELEMENT_NODE; })[0];
    };

    FVUtil.getElement = function (node) {
        return node.nodeType == DOM_DOCUMENT_NODE ? node.documentElement : node;
    };

    FVUtil.getAttribute = function (node, name) {
        return node.getAttribute(name);
    };

    FVUtil.setAttribute = function (node, name, value) {
        node.setAttribute(name, value);
    };

    // Sets the node to the specified value and returns the previous value
    // DomNode, String -> String
    FVUtil.setNodeValue = function (node, value) {
        var nt = node.nodeType,
            valueProperty = FVUtil.findValueProperty(node),
            oldValue = null;

        if (nt === DOM_ELEMENT_NODE ||
            nt === DOM_ATTRIBUTE_NODE) {
            oldValue = node[valueProperty];
            node[valueProperty] = value;

            // TODO: Logic to add nil attribute if needed
            if (nt === DOM_ELEMENT_NODE && value !== "") {
                FVUtil.removeNilIfPresent(node);
            }
        }

        return oldValue;
    };

    FVUtil.copyNodeContent = function (srcNode, destNode) {
        if (!(srcNode && destNode)) {
            return;
        }

        $(destNode).empty();

        var children = qdNew.xmlUtility.getChildNodes(srcNode);

        children.forEach(function (child) {
            destNode.appendChild(child.cloneNode(true));
        });
    };

    FVUtil.getNodeValue = function (node) {
        var valueProperty = FVUtil.findValueProperty(node);

        return node[valueProperty];
    };

    FVUtil.findValueProperty = function (node) {
        var props = ["textContent", "text", "nodeValue", "value"],
            prop,
            i;

        for (i = 0; i < props.length; i += 1) {
            prop = props[i];
            if (typeof node[prop] !== "undefined") {
                return prop;
            }
        }

        FVUtil.logWarning("Unable to find text property for node.");
        return null;
    };

    FVUtil.removeNilIfPresent = function (node) {
        var ats = node.attributes;

        if (ats && ats.getNamedItemNS(XSI_NAMESPACE, "nil")) {
            ats.removeNamedItemNS(XSI_NAMESPACE, "nil");
        }
    };

    function xmlToString(node) {
        return qdNew.xmlUtility.xmlToString(node);
    }

    // 2015-09-17 - Removed manual implementation of xmlToString()

    FVUtil.xmlToString = xmlToString;
    FVUtil.xmlToString2 = xmlToString;

    FVUtil.xmlToStringMulti = function (nodes, separator) {
        nodes = (nodes && Array.prototype.slice.call(nodes)) || [];
        separator = separator || "";

        return nodes.map(FVUtil.xmlToString2).join(separator);
    }

    FVUtil.logWarning = function (text) {
        console.log("[Warning] " + text);
    };

    FVUtil.makeSpaceNonBreaking = function (text) {
        return text.replace(/\s/g, "\xA0");
    };

    // Makes a selector string to match elements with the specified attribute
    FVUtil.makeAttributeSelector = function (attribName) {
        return "*[" + attribName + "]";
    };

    FVUtil.getFirstChildElement = function (node) {
        return node && makeArray(node.childNodes).filter(function (n) { return n.nodeType === DOM_ELEMENT_NODE; })[0];
    }

    FVUtil.getDocumentElement = function (node) {
        return FVUtil.getFirstChildElement(FVUtil.ownerDocument(node));
    };

    // DomNode, Constructor[NamespaceResolver] -> NamespaceResolver
    // Creates a namespace resolver of the indicated type using the namespace declarations on the indicated node.
    FVUtil.buildNamespaceManager = function (node) {
        var nsDec,
            manager;

        if (node.nodeType == DOM_DOCUMENT_NODE) {
            node = FVUtil.getDocumentElement(node);
        }

        nsDec = FVUtil.getNamespaces(node);
        manager = new FVNamespaceResolver();

        $.each(nsDec, function (i, ns) {
            manager.addNamespace(ns.localName || ns.baseName, ns.nodeValue);
        });

        return manager;
    };

    FVUtil.getNamespaces = function (node) {
        return node.attributes ?
               filter(node.attributes, function (attr) {
                   return attr.namespaceURI === "http://www.w3.org/2000/xmlns/" ||
                          attr.prefix === "xmlns";
               }) :
               [];
    }

    FVUtil.getChildNode = function (parent, childName) {
        var found = filter(parent.childNodes, function (n) { return n.localName === childName })[0];

        return found || null;
    };

    FVUtil.nodeValOrNull = function (node) {
        return node ? node.textContent : null;
    };

    FVUtil.appendAttrDataPrefix = function (node, key) {
        return "fvAttr_" + node.nodeName + "_" + key;
    };

    FVUtil.setNodeData = function (node, key, value) {
        if (node && node.nodeType === DOM_ATTRIBUTE_NODE) {
            // $.data() doesn't seem to allow attaching data to an attribute node, so we'll attach
            // it to the attribute's owner element
            FVUtil.setNodeData(node.ownerElement, FVUtil.appendAttrDataPrefix(node, key), value);
        } else {
            $.data(node, key, value);
        }
    };

    FVUtil.getNodeData = function (node, key) {
        if (node && node.nodeType === DOM_ATTRIBUTE_NODE) {
            return FVUtil.getNodeData(node.ownerElement, FVUtil.appendAttrDataPrefix(node, key));
        } else {
            return $.data(node, key);
        }
    };

    FVUtil.createEmptyXmldocument = function () {
        var dom = $.parseXML("<n />");

        dom.removeChild(dom.firstChild);

        return dom;
    }


    FVUtil.parseXmlDateTime = function (strDateTime) {
        var parts = strDateTime.split("T"), date, time;

        date = FVUtil.parseXmlDate(parts[0]);
        if (date && parts[1]) {
            time = FVUtil.parseXmlTime(parts[1]);
            date.setHours(time.getHours());
            date.setMinutes(time.getMinutes());
            date.setSeconds(time.getSeconds());
            date.setMilliseconds(time.getMilliseconds());
        }

        return date;
    };

    // Processing instructions

    // DomNode, String -> ProcessingInstruction
    // Retrieves the child processing instruction with the specified name belonging 
    // to the specified node, or null if no such processing instruction is found
    FVUtil.getProcessingInstruction = function (node, name) {
        return makeArray(node.childNodes).filter(function (n) { return n.nodeType === DOM_PROCESSING_INSTRUCTION_NODE && n.nodeName === name })[0];
    };

    FVUtil.addNewPi = function (node, name) {
        var ownerDoc = FVUtil.ownerDocument(node),
            pi = ownerDoc && ownerDoc.createProcessingInstruction(name, ''),
            firstElement = FVUtil.getFirstChildElement(node);

        if (!pi) {
            return null;
        }

        if (firstElement) {
            node.insertBefore(pi, firstElement);
        } else {
            node.appendChild(pi);
        }

        return pi;
    };

    // DomNode[ProcessingInstruction] -> DomNode[Element]
    // Returns a dom element containing attributes to correspond to the specified
    // processing instruction's pseudo-attributes
    FVUtil.makePiDom = function (processingInstruction) {
        return $.parseXML("<n " + processingInstruction.nodeValue + " />").childNodes[0];
    }

    //  XML <-> Date conversions
    FVUtil.parseXmlDate = function (strDate) {
        var parts = strDate.split("-");

        if (parts.length === 3) {
            return new Date(+parts[0], parts[1] - 1, +parts[2]);
        }

        return null;
    };

    FVUtil.parseXmlTime = function (strTime) {
        var parts = strTime.split(":");

        if (parts.length === 3) {
            //return new Date(1000 * (parts[0] * 3600 + parts[1] * 60 + (+parts[2])));
            return new Date(1970, 0, 1, parts[0], parts[1], parts[2]);
        }

        return null;
    };

    FVUtil.getTopDomain = function (domain) {
        var parts = domain.split(".").reverse();

        if (parts.length >= 2) {
            return parts[1] + "." + parts[0];
        }

        return domain;
    };

    FVUtil.padZeros = function (val, length) {
        val = val.toString();

        while (val.length < length) {
            val = "0" + val;
        }

        return val;
    };

    FVUtil.getXmlDate = function (dt) {
        var year, month, day;

        year = dt.getFullYear();
        month = FVUtil.padZeros(dt.getMonth() + 1, 2);
        day = FVUtil.padZeros(dt.getDate(), 2);

        return year + "-" + month + "-" + day;
    };

    FVUtil.getXmlTime = function (dt) {
        var hours, minutes, seconds;

        hours = FVUtil.padZeros(dt.getHours(), 2);
        minutes = FVUtil.padZeros(dt.getMinutes(), 2);
        seconds = FVUtil.padZeros(dt.getSeconds(), 2);

        return hours + ":" + minutes + ":" + seconds;
    };

    FVUtil.getParameterByName = function (name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(window.location.search);
        return results == null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
    };

    FVUtil.ensureMember = function (obj, key, constructor) {
        var member = obj[key];

        if (!member) {
            member = new constructor();
            obj[key] = member;
        }

        return member;
    };

    FVUtil.xPathParser = null;
    FVUtil.evaluateXPath = function (node, path, options) {
        var parser = FVUtil.xPathParser || new XPathParser(),
            parsed = parser.parse(path),
            execContext = new XPathContext(options.variables, options.namespaces, options.functions),
            result;
        FVUtil.xPathParser = parser;

        execContext.expressionContextNode = node;

        result = parsed.evaluate(execContext);

        return result;
    };

    /**
     * Determines the name and size of the file stored in the specified node
     * Handles caching of these values and retrieves them from the cache if available.
     * @param node - DOMNode
     */
    FVUtil.getFileProperties = function (node) {
        var fileName = "",
            fileSize = 0,
            fcf = fv.Constants.Files,
            fileNameProp = fcf.FileNameProperty,
            fileSizeProp = fcf.FileSizeProperty,
            fileBase64,
            decoded;

        if (node) {
            fileName = FVUtil.getNodeData(node, fileNameProp);
            if (fileName) {
                fileSize = FVUtil.getNodeData(node, fileSizeProp);
            } else {
                fileBase64 = FVUtil.getNodeValue(node);
                decoded = FVUtil.File.decodeBase64Attachment(fileBase64);
                fileName = decoded.name;
                fileSize = decoded.bytes.length;
                FVUtil.setNodeData(node, fileNameProp, fileName);
                FVUtil.setNodeData(node, fileSizeProp, fileSize);
            }
        }

        return { name: fileName, size: fileSize };
    };


    FVUtil.File = (function () {
        var attachmentSignature = 'x0lG',
            gifSignature = 'R0lG',
            jpgSignature = "/9j/",
            pngSignature = "iVBO",
            tifSignature = "SUkq",
            pictureFilename = "Picture";

        var fLib = {};

        function validateFileInput(filePicker) {
            if (!(filePicker && filePicker.files)) {
                return Error("Not a valid file picker.");
            }
            if (!filePicker.files[0]) {
                return Error("No file selected.");
            }

            return null;
        };

        function checkFileApis() {
            if (!(window.File && window.FileReader)) {
                return Error("File upload is not supported for this browser.");
            }

            return null;
        }

        function addReaderEvents(fileReader, resolve, reject, progress, fileName) {
            fileReader.onload = function (e) {
                resolve({ name: fileName, bytes: new Uint8Array(e.target.result) });
            };

            fileReader.onerror = function (e) {
                reject(Error("An error occurred loading the file."));
            };

            fileReader.onabort = function (e) {
                reject(Error("File load was aborted."));
            };

            fileReader.onprogress = function (e) {
                progress({ loaded: e.loaded, total: e.total });
            };
        };

        // FileInput -> Promise[ArrayBuffer]
        fLib.loadFromFileInputAsync = function (filePicker) {
            var failure = checkFileApis() || validateFileInput(filePicker);
            if (failure) {
                return Q.Promise.reject(failure);
            }

            return this.loadFileAsync(filePicker.files[0]);
        };

        fLib.loadFileAsync = function (file) {
            return new Q.Promise(function (resolve, reject, progress) {
                var reader = new FileReader(),
                    error = checkFileApis();

                if (error) {
                    reject(error);
                }

                addReaderEvents(reader, resolve, reject, progress, file.name);

                reader.readAsArrayBuffer(file);
            });
        };

        // ArrayBuffer -> String
        fLib.arrayBufferToBase64 = function (buffer) {
            return this.byteArrayToBase64(new Uint8Array(buffer));
        };

        function byteArrayToBase64(bytes) {
            var chArray = Array.prototype.map.call(bytes,
                            function (byte) { return String.fromCharCode(byte); });

            return window.btoa(chArray.join(""));
        }

        fLib.byteArrayToBase64 = byteArrayToBase64;

        // String -> Uint8Array
        function stringToUnicodeBytes(str) {
            var bytes = new Uint8Array(str.length * 2),
                i = 0,
                charCode;

            for (; i < str.length; i += 1) {
                charCode = str.charCodeAt(i);
                bytes[i * 2] = charCode & 0xFF;
                bytes[i * 2 + 1] = charCode >> 8;
            }

            return bytes;
        }

        // Uint8Array, Number, Number -> void
        // Writes the specified value as an int32 value to the byteArray at the specified offset
        function writeInt32(byteArray, offset, value) {
            var i = 0;

            for (; i < 4; i += 1) {
                byteArray[offset + i] = (value >> 8 * i) & 0xFF;
            }
        }

        // Uint8Array, String -> Uint8Array
        function getBase64Attachment(fileBytes, fileName) {
            // size needed is 4 (signature) + 20 (header) + 2 * (fileName.length + 1) + fileBytes.length
            var totalFileNameLength = fileName.length + 1,
                encodedSize = 24 + totalFileNameLength * 2 + fileBytes.length,
                bytes = new Uint8Array(encodedSize),
                offset = 16;

            $.each([0xC7, 0x49, 0x46, 0x41], function (i) {
                bytes[i] = this;
            });

            bytes[4] = 0x14; // header length
            bytes[8] = 0x01; // version

            writeInt32(bytes, offset, fileBytes.length);
            offset += 4;

            writeInt32(bytes, offset, totalFileNameLength);
            offset += 4;

            bytes.set(stringToUnicodeBytes(fileName), offset);
            offset += totalFileNameLength * 2;

            bytes.set(fileBytes, offset);

            return bytes;
        }

        fLib.getBase64Attachment = function (fileBytes, fileName) {
            return this.byteArrayToBase64(getBase64Attachment(fileBytes, fileName));
        }

        function b64ToUint6(nChr) {

            return nChr > 64 && nChr < 91 ?
                nChr - 65
              : nChr > 96 && nChr < 123 ?
                nChr - 71
              : nChr > 47 && nChr < 58 ?
                nChr + 4
              : nChr === 43 ?
                62
              : nChr === 47 ?
                63
              :
                0;

        }

        function base64DecToArr(sBase64, nBlocksSize) {
            var sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, ""),
                nInLen = sB64Enc.length,
                nOutLen = nBlocksSize ? Math.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize) * nBlocksSize : nInLen * 3 + 1 >> 2,
                taBytes = new Uint8Array(nOutLen);

            for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
                nMod4 = nInIdx & 3;
                nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 18 - 6 * nMod4;
                if (nMod4 === 3 || nInLen - nInIdx === 1) {
                    for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
                        taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
                    }
                    nUint24 = 0;
                }
            }

            return taBytes;
        }

        function getInt32(byteArray, offset) {
            var value = 0,
                i = 0;

            for (; i < 4; i += 1) {
                value |= byteArray[offset + i] << i * 8;
            }

            return value;
        }

        function getUnicodeString(byteArray, length, offset) {
            var charCodes = new Array(length),
                i = 0,
                currentOffset;

            for (; i < length; i += 1) {
                currentOffset = offset + i * 2;
                charCodes[i] = byteArray[currentOffset] | (byteArray[currentOffset + 1] << 8);
            }

            return String.fromCharCode.apply(String, charCodes);
        }

        function getAttachmentExtension(signature) {
            switch (signature) {
                case gifSignature:
                    return '.gif';
                case jpgSignature:
                    return '.jpg';
                case pngSignature:
                    return '.png';
                default:
                    return '.bmp';
            }
        }

        fLib.decodeBase64Attachment = function (attachment) {
            var signature = attachment.substr(0, 4),
                fileName,
                fileBytes;

            if (signature !== attachmentSignature) {
                fileName = pictureFilename + getAttachmentExtension(signature);
                fileBytes = base64DecToArr(attachment);
            }
            else {
                var bytes = base64DecToArr(attachment),
                    fileSize = getInt32(bytes, 16),
                    fileNameLength = getInt32(bytes, 20);

                fileName = getUnicodeString(bytes, fileNameLength - 1, 24),
                fileBytes = bytes.subarray(24 + fileNameLength * 2);
            }

            return { name: fileName, bytes: fileBytes };
        };

        var octetStreamMimeType = "application/octet-stream";

        function tryAnchorDownload(fileBytes, fileName) {
            var aElement = document.createElement("a"),
                event;

            if ("download" in aElement) {
                aElement.setAttribute("download", fileName);
                aElement.href = "data:" + octetStreamMimeType + ";base64," + byteArrayToBase64(fileBytes);

                document.body.appendChild(aElement);
                event = document.createEvent("MouseEvents");
                event.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0,
                                 false, false, false, false, 0, null);
                aElement.dispatchEvent(event);
                document.body.removeChild(aElement);

                return true;
            }

            return false;
        }

        function trySaveAsDownload(fileBytes, fileName) {
            var blob;
            if (window.saveAs) {
                blob = new Blob([fileBytes], { type: octetStreamMimeType });

                saveAs(blob, fileName);

                return true;
            }

            return false;
        }

        // fileBytes is a Uint8Array
        function initiateFileDownload(fileBytes, fileName) {
            return trySaveAsDownload(fileBytes, fileName) ||
                    tryAnchorDownload(fileBytes, fileName);
        }

        fLib.initiateFileDownload = initiateFileDownload;

        return fLib;
    })();

    // Splits a string s at all occurrences of character c. This is like
    // the split() method of the string object, but IE omits empty
    // strings, which violates the invariant (s.split(x).join(x) == s).
    function stringSplit(s, c) {
        var a = s.indexOf(c);
        if (a == -1) {
            return [s];
        }
        var parts = [];
        parts.push(s.substr(0, a));
        while (a != -1) {
            var a1 = s.indexOf(c, a + 1);
            if (a1 != -1) {
                parts.push(s.substr(a + 1, a1 - a - 1));
            } else {
                parts.push(s.substr(a + 1));
            }
            a = a1;
        }
        return parts;
    }

    // Returns the text value of a node; for nodes without children this
    // is the nodeValue, for nodes with children this is the concatenation
    // of the value of all children. Browser-specific optimizations are used by
    // default; they can be disabled by passing "true" in as the second parameter.
    function xmlValue(node, disallowBrowserSpecificOptimization) {
        var nt = node.nodeType;
        if (!node) {
            return '';
        }

        var ret = '';
        if (node.nodeType == DOM_TEXT_NODE ||
          node.nodeType == DOM_CDATA_SECTION_NODE) {
            ret += node.nodeValue;
        } else if (node.nodeType == DOM_ATTRIBUTE_NODE) {
            ret += FVUtil.getNodeValue(node);
        } else if (node.nodeType == DOM_ELEMENT_NODE ||
                 node.nodeType == DOM_DOCUMENT_NODE ||
                 node.nodeType == DOM_DOCUMENT_FRAGMENT_NODE) {
            if (!disallowBrowserSpecificOptimization) {
                return FVUtil.getNodeValue(node);
            }
            // pobrecito!
            var len = node.childNodes.length;
            for (var i = 0; i < len; ++i) {
                ret += xmlValue(node.childNodes[i]);
            }
        }
        return ret;
    }

    function isFunction(obj) {
        return !!(obj && obj.constructor && obj.call && obj.apply);
    }

    function makeAssoc(ary, keyFunc, valFunc) {
        var obj = {};
        $.each(ary, function (i, val) {
            obj[keyFunc(val)] = valFunc ? valFunc(val) : val;
        });
        return obj;
    }

    function groupBy(items, keyFunc) {
        var obj = {};

        $.each(items, function (i, val) {
            var key = keyFunc(val);
            if (!obj[key]) {
                obj[key] = [];
            }
            obj[key].push(val);
        });

        return obj;
    }

    // Array higher order functions

    // X[], (X -> Boolean) -> X[]
    // Returns an array of the members of items where predicate(item) is true
    function filter(items, predicate) {
        var result = [], i;

        forEach(items, function (i) { if (predicate(i)) { result.push(i); } });

        return result;
    }

    // Object, ( (Key, Value) -> Z) -> Z[]
    // Maps each of the members of o to a new value and returns the values in an array
    function mapObject(o, mapping) {
        var k, result = [];

        for (k in o) {
            if (o.hasOwnProperty(k)) {
                result.push(mapping(k, o[k]));
            }
        }

        return result;
    }

    // X[], (X -> Y) -> Y[]
    // Converts each of the members of items to another form using the specified mapping function
    function map(items, mapping) {
        var result = new Array(items.length);

        forEach(items, function (item, idx) { result[idx] = mapping(item); });

        return result;
    }

    // X[], (X -> Y[]) -> Y[]
    function flatMap(items, mapping) {
        var result = [], i;

        forEach(items, function (item) {
            result = result.concat(mapping(item));
        });

        return result;
    }

    // X[], (X, Y -> Y) -> Y
    function foldRight(items, combinator, seed) {
        forEach(items, function (item) {
            seed = combinator(seed, item);
        });

        return seed;
    }

    // Executes action on each element of items, sequentially
    // X[], (X [, Int] -> Any) -> undefined
    function forEach(items, action) {
        var i;

        for (i = 0; i < items.length; i += 1) {
            action(items[i], i);
        }
    }

    // Returns the combination of a1 concatenated with a2. The original
    // arrays are not modified.
    // (Any[] [, Any[] [, ...]] -> Any[]
    function concat() {
        var result = [],
            nonEmptyArgs = filter(arguments, function (ar) { return ar && ar.length; });

        $.each(nonEmptyArgs, function (i, ar) {
            $.each(ar, function (i, item) { result.push(item); });
        });

        return result;
    }

    function mergeObjects(obj1, obj2) {
        var merged = {},
            prop;

        $.each([obj1, obj2], function (i, o) {
            for (prop in o) {
                if (o.hasOwnProperty(prop)) {
                    merged[prop] = o[prop];
                }
            }
        });

        return merged;
    }

    function benchmark(msg, f) {
        var d1, diff, result;

        d1 = new Date();
        result = f();
        diff = new Date() - d1;

        alert(msg + ": " + diff);

        return result;
    }

    function runPromiseSequence(values, action, errorHandler) {
        return values.reduce(function (last, value) {
            return last.then(function (lastResult) {
                return action(lastResult, value);
            })
            .catch(function (error) {
                if (errorHandler) {
                    return errorHandler(error, value);
                }
                throw error;
            });
        }, Q.Promise.resolve());
    }

    function getDsName(node) {
        return FVUtil.getNodeData(node, 'fvDs');
    }

    var measuringPerf = false;

    function perfMark(name) {
        if (measuringPerf && window.performance && window.performance.mark) {
            window.performance.mark(name);
        }
    }

    function perfMeasure() {
        if (measuringPerf && window.performance && window.performance.measure) {
            window.performance.measure.apply(window.performance, arguments);
        }
    }

    function getTwoDigitFormat(digit) {
        return digit <= 9
            ? '0' + digit
            : digit;
    }

    function needToAddNamespace() {
        if (!('lazy' in needToAddNamespace)) {
            var xtree = $.parseXML('<n/>');
            $(xtree).find('n').append($('<p>'));

            var xstr = qdNew.xmlUtility.xmlToString(xtree);

            needToAddNamespace.lazy = xstr.indexOf(XHTML_NAMESPACE) === -1;
        }

        return needToAddNamespace.lazy;
    }

    function setRichTextString(node, string) {
        var richText = $($.parseHTML(string));

        if (needToAddNamespace()) {
            richText
                .filter(function (i, nd) {
                    return nd.nodeType === 1;
                })
                .each(function (i, el) {
                    el.setAttribute('xmlns', XHTML_NAMESPACE);
                });
        }

        $(node)
            .empty()
            .append(richText);
    }


    FVUtil.getDsName = getDsName;
    FVUtil.mapObject = mapObject;
    FVUtil.makeAssoc = makeAssoc;
    FVUtil.runPromiseSequence = runPromiseSequence;

    FVUtil.perfMark = perfMark;
    FVUtil.perfMeasure = perfMeasure;

    FVUtil.getTwoDigitFormat = getTwoDigitFormat;

    FVUtil.setRichTextString = setRichTextString;

    qd.util = FVUtil;
    qdNew.util = FVUtil;

    // TODO: phase these out of the global scope
    window.FVUtil = FVUtil;
    window.stringSplit = stringSplit;
    window.xmlValue = xmlValue;
    window.isFunction = isFunction;
    window.groupBy = groupBy;
    window.filter = filter;
    window.map = map;
    window.flatMap = flatMap;
    window.foldRight = foldRight;
    window.forEach = forEach;
    window.concat = concat;
    window.mergeObjects = mergeObjects;
    window.benchmark = benchmark;

    window.XSLT_NAMESPACE = XSLT_NAMESPACE;
    window.XSI_NAMESPACE = XSI_NAMESPACE;

    window.DOM_ELEMENT_NODE = window.DOM_ELEMENT_NODE || DOM_ELEMENT_NODE;
    window.DOM_ATTRIBUTE_NODE = window.DOM_ATTRIBUTE_NODE || DOM_ATTRIBUTE_NODE;
    window.DOM_TEXT_NODE = window.DOM_TEXT_NODE || DOM_TEXT_NODE;
    window.DOM_CDATA_SECTION_NODE = window.DOM_CDATA_SECTION_NODE || DOM_CDATA_SECTION_NODE;
    window.DOM_PROCESSING_INSTRUCTION_NODE = window.DOM_PROCESSING_INSTRUCTION_NODE || DOM_PROCESSING_INSTRUCTION_NODE;
    window.DOM_COMMENT_NODE = window.DOM_COMMENT_NODE || DOM_COMMENT_NODE;
    window.DOM_DOCUMENT_NODE = window.DOM_DOCUMENT_NODE || DOM_DOCUMENT_NODE;
    window.DOM_DOCUMENT_FRAGMENT_NODE = window.DOM_DOCUMENT_FRAGMENT_NODE || DOM_DOCUMENT_FRAGMENT_NODE;
})(window, Qd, Qd.FormsViewer, qd);



(function ($) {
    $.fn.animateWaitText = function () {
        this.each(function () {
            var count = 0,
                me = $(this),
                origText = me.text();

            setInterval(function () {
                me.text(origText + Array(count + 1).join("."));
                count = (count + 1) % 4;
            }, 500);
        });
        return this;
    }
}(jQuery));