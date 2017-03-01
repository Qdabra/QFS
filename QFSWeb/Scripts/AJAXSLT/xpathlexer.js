// Copyright 2012 Google Inc. All Rights Reserved.

/**
* @fileoverview The lexer class for tokenizing xpath expressions.
*/




/**
* Constructs a lexer.
*
* @param {!Array.<string>} tokens Tokens to iterate over.
* @constructor
*/
xpathlexer = function (tokens) {
    /**
    * @type {!Array.<string>}
    * @private
    */
    this.tokens_ = tokens;

    /**
    * @type {number}
    * @private
    */
    this.index_ = 0;
};


/**
* Tokenizes a source string into an array of tokens.
*
* @param {string} source Source string to tokenize.
* @return {!xpathlexer} Essentially an iterator over the tokens.
*/
xpathlexer.tokenize = function (source) {
    var tokens = source.match(xpathlexer.TOKEN_);

    // Removes tokens starting with whitespace from the array.
    for (var i = 0; i < tokens.length; i++) {
        if (xpathlexer.LEADING_WHITESPACE_.test(tokens[i])) {
            tokens.splice(i, 1);
        }
    }
    return new xpathlexer(tokens);
};


/**
* Regular expressions to match XPath productions.
*
* @const
* @type {!RegExp}
* @private
*/
xpathlexer.TOKEN_ = new RegExp(
    '\\$?(?:(?![0-9-])[\\w-]+:)?(?![0-9-])[\\w-]+' +
// Nodename (possibly with namespace) or variable.
    '|\\/\\/' + // Double slash.
    '|\\.\\.' + // Double dot.
    '|::' + // Double colon.
    '|\\d+(?:\\.\\d*)?' + // Number starting with digit.
    '|\\.\\d+' + // Number starting with decimal point.
    '|"[^"]*"' + // Double quoted string.
    '|\'[^\']*\'' + // Single quoted string.
    '|[!<>]=' + // Operators
    '|\\s+' + // Whitespaces.
    '|.', // Any single character.
    'g');


/**
* Regex to check if a string starts with a whitespace character.
*
* @const
* @type {!RegExp}
* @private
*/
xpathlexer.LEADING_WHITESPACE_ = /^\s/;


/**
* Peeks at the lexer. An optional index can be
* used to specify the token peek at.
*
* @param {number=} opt_i Index to peek at. Defaults to zero.
* @return {string} Token peeked.
*/
xpathlexer.prototype.peek = function (opt_i) {
    return this.tokens_[this.index_ + (opt_i || 0)];
};


/**
* Returns the next token from the lexer and increments the index.
*
* @return {string} The next token.
*/
xpathlexer.prototype.next = function () {
    return this.tokens_[this.index_++];
};


/**
* Decrements the index by one.
*/
xpathlexer.prototype.back = function () {
    this.index_--;
};


/**
* Checks whether the lexer is empty.
*
* @return {boolean} Whether the lexer is empty.
*/
xpathlexer.prototype.empty = function () {
    return this.tokens_.length <= this.index_;
};


