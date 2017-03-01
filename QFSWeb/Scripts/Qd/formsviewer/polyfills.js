(function() {
    "use strict";

    Number.isNaN = Number.isNaN || function(value) {
        return typeof value === "number" && isNaN(value);
    };

    if (typeof Object.create !== 'function') {
        Object.create = (function() {
            var temp = function() {};
            return function(prototype) {
                if (arguments.length > 1) {
                    throw Error('Second argument not supported');
                }
                if (typeof prototype !== 'object') {
                    throw TypeError('Argument must be an object');
                }
                temp.prototype = prototype;
                var result = new temp();
                temp.prototype = null;
                return result;
            };
        })();
    }

    if (!Array.prototype.some) {
        Array.prototype.some = function (fun /*, thisp */) {
            "use strict";

            if (this == null) throw new TypeError();

            var t = Object(this),
                len = t.length >>> 0;

            if (typeof fun != "function") throw new TypeError();

            var thisp = arguments[1];

            for (var i = 0; i < len; i++) {
                if (i in t && fun.call(thisp, t[i], i, t))
                    return true;
            }

            return false;
        };
    }

    if (!Function.prototype.bind) {
        Function.prototype.bind = function(oThis) {
            if (typeof this !== 'function') {
                // closest thing possible to the ECMAScript 5
                // internal IsCallable function
                throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
            }

            var aArgs = Array.prototype.slice.call(arguments, 1),
                fToBind = this,
                fNOP = function() {},
                fBound = function() {
                    return fToBind.apply(this instanceof fNOP
                        ? this
                        : oThis,
                        aArgs.concat(Array.prototype.slice.call(arguments)));
                };

            if (this.prototype) {
                // native functions don't have a prototype
                fNOP.prototype = this.prototype;
            }
            fBound.prototype = new fNOP();

            return fBound;
        };
    }

    // From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
    if (!Object.keys) {
        Object.keys = (function () {
            'use strict';
            var hasOwnProperty = Object.prototype.hasOwnProperty,
                hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
                dontEnums = [
                  'toString',
                  'toLocaleString',
                  'valueOf',
                  'hasOwnProperty',
                  'isPrototypeOf',
                  'propertyIsEnumerable',
                  'constructor'
                ],
                dontEnumsLength = dontEnums.length;

            return function (obj) {
                if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
                    throw new TypeError('Object.keys called on non-object');
                }

                var result = [], prop, i;

                for (prop in obj) {
                    if (hasOwnProperty.call(obj, prop)) {
                        result.push(prop);
                    }
                }

                if (hasDontEnumBug) {
                    for (i = 0; i < dontEnumsLength; i++) {
                        if (hasOwnProperty.call(obj, dontEnums[i])) {
                            result.push(dontEnums[i]);
                        }
                    }
                }
                return result;
            };
        }());
    }
})();

