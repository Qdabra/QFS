// =========
// RuleStack
// =========

function RuleStack() {
    var stack = [];

    this.push = function (item) { stack.push(item) };

    this.peek = function () {
        return this.isEmpty() ? stack[stack.length - 1] : null;
    };

    this.pop = function () { return stack.pop(); }

    this.clear = function () {
        stack.length = 0;
    };

    this.isEmpty = function () {
        return !stack.length;
    };
}

RuleStack.prototype.takeNext = function () {
    var topItem, next;
    if (!this.isEmpty()) {
        topItem = this.pop();
        next = topItem.takeNext();

        if (!topItem.isEmpty()) {
            this.push(topItem);
        }

        return next;
    } else {
        return null;
    }
};

// RuleSet, DomNode -> void
RuleStack.prototype.addRuleSet = function (ruleSet, context) {
    this.push(new RuleSetQueue(ruleSet, context));
};

// RuleInstance -> void
RuleStack.prototype.addRuleInstance = function (ruleInstance) {
    this.push(ruleInstance);
}

// DomNode[], String -> void
RuleStack.prototype.addFieldsToSet = function (fields, value) {
    this.push(new FieldsToSet(fields, value));
};

// FieldsToSet[] -> void
RuleStack.prototype.addFieldsToSetGroup = function (fieldsToSetList) {
    this.push(new FieldsToSetGroup(fieldsToSetList));
};

// =========
// RuleQueue
// =========
// Base object for other types of "queue"

function RuleQueue(type) {

    this.takeNext = function () {
        if (!this.isEmpty()) {
            return this.retrieveNext();
        } else {
            return null;
        }
    };

    this.getType = function () {
        return type;
    };

}

// ==================
// RuleActionInstance
// ==================

// Represents a single rule action and its DomNode context

function RuleActionInstance(ruleAction, context) {
    this.ruleAction = ruleAction;

    this.getContext = function () {
        return context;
    }
}

RuleActionInstance.prototype.getType = function () { return "action"; };


// ============
// RuleInstance
// ============

// Represents a single rule instance and its DomNode context

function RuleInstance(rule, context) {
    var pos = 0, actions = rule.getActions();

    this.isEmpty = function () { return pos >= actions.length; }

    this.retrieveNext = function () {
        var action = actions[pos];
        pos += 1;

        return new RuleActionInstance(action, context);
    };

    this.getCondition = function () {
        return rule.condition;
    }

    this.getIsEnabled = function () {
        return rule.isEnabled;
    };

    this.getContext = function () {
        return context;
    };
}

RuleInstance.prototype = new RuleQueue("rule");
RuleInstance.prototype.constructor = RuleInstance;


// ============
// RuleSetQueue
// ============

// Represents a single rule set and its DomNode context

function RuleSetQueue(ruleSet, context) {
    var pos = 0, rules = ruleSet.getRules();

    this.isEmpty = function () { return pos >= rules.length; }

    this.retrieveNext = function () {
        var rule = rules[pos];
        pos += 1;

        return new RuleInstance(rule, context);
    };
}

RuleSetQueue.prototype = new RuleQueue("ruleSet");
RuleSetQueue.prototype.constructor = RuleSetQueue;


// ==========
// FieldToSet
// ==========

// Represents a DOM node to be set
// field is a DomNode, value is the String value, 
// isDefaultValue is a boolean indicating whether this is being set as the result of a default value action

function FieldToSet(field, value, isDefaultValue) {
    this.getField = function () { return field; };

    this.getValue = function () { return value; };

    this.getIsDefaultValue = function () { return isDefaultValue; };
}

FieldToSet.prototype.getType = function () { return "fieldToSet"; }



// ===========
// FieldsToSet
// ===========

// Represents a list of fields that need to be set to a given value
// fields is an array of DomNodes, value is the String value

function FieldsToSet(fields, value, isDefaultValue) {
    // Copy the fields array to avoid modifying the original
    var fieldList = fields.slice();

    this.isEmpty = function () { return !(fieldList.length); }

    this.retrieveNext = function () {
        var next = fieldList.shift();
        return new FieldToSet(next, value, isDefaultValue);
    };
}

FieldsToSet.prototype = new RuleQueue("fieldsToSet");
FieldsToSet.prototype.constructor = FieldsToSet;


// ===========
// FieldsToSet
// ===========

// Represents a list of fields that need to be set to a given value
// fields is an array of DomNodes, value is the String value

function FieldsToSetGroup(fieldsToSetItems) {
    // Copy the fields array to avoid modifying the original
    var items = fieldsToSetItems.slice();

    this.isEmpty = function () { return !(items.length); }

    this.retrieveNext = function () {
        var next = items.shift();
        return next;
    };
}

FieldsToSetGroup.prototype = new RuleQueue("fieldsToSetGroup");
FieldsToSetGroup.prototype.constructor = FieldsToSetGroup;
