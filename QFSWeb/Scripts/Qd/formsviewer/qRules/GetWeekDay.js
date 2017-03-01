var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.GetWeekDay = (function (qd) {
    'use strict';

    var optionalParameters = [{
        name: 'date',
        description: 'Date for the week'
    }],
    requiredParameters = [{
        name: 'day',
        description: 'Day to get week for'
    }],
    getWeekdayErrorFailedToGetDate = "Failed to get date.",
    getWeekdayErrorInvalidDay = "Invalid day parameter -- please use either complete day name or two letter abbreviation";

    function getDayOfWeek(day) {
        switch (day.toLowerCase()) {
            case "monday":
            case "mo":
                return 1;

            case "tuesday":
            case "tu":
                return 2;

            case "wednesday":
            case "we":
                return 3;

            case "thursday":
            case "th":
                return 4;

            case "friday":
            case "fr":
                return 5;

            case "saturday":
            case "sa":
                return 6;

            case "sunday":
            case "su":
                return 0;

            default:
                return -1;
        }
    }

    function validateAndParseDate(date) {
        var parseDate = Date.parse(date);

        if (Number.isNaN(parseDate)) {
            return {
                Error: getWeekdayErrorFailedToGetDate
            };
        }

        return new Date(parseDate);
    }
    
    function calculateWeekDay(date, dayOfWeek) {
        var dateValue = date
            ? validateAndParseDate(date)
            : new Date(),
            util = qd.util,
            diff = dateValue.getDay() - dayOfWeek,
            newDateValue = new Date(dateValue.setDate(dateValue.getDate() + (-1 * diff))),
            resultDate = String.format('{0}-{1}-{2}',
            newDateValue.getFullYear(),
            util.getTwoDigitFormat(newDateValue.getMonth() + 1),
            util.getTwoDigitFormat(newDateValue.getDate()));

        return {
            Result: resultDate,
            Success: true
        };
    }

    function GetWeekDay(params) {

        function executeAsync() {
            var cf = params.commonFunction,
                date = cf.getParamValue('date'),
                day = cf.getParamValue('day'),
                dayOfWeek = getDayOfWeek(day);

            return Q()
                .then(function () {

                    if (dayOfWeek < 0) {
                        return {
                            Error: getWeekdayErrorInvalidDay
                        };
                    }

                    return calculateWeekDay(date, dayOfWeek);
                })
                .catch(function () {
                    return {
                        Error: getWeekdayErrorFailedToGetDate
                    };
                });
        }

        return {
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters,
            executeAsync: executeAsync
        };
    }

    return GetWeekDay;
})(Qd);