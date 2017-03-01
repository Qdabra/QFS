var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.DateAdd = (function (qd) {
    "use strict";

    var cnt = qd.FormsViewer.qRules.Constants,
        optionalParameters = [{
            name: cnt.paramDsName,
            description: "Data Source Name"
        },
        {
            name: cnt.paramSeconds,
            description: "(+/-) Seconds to add"
        },
        {
            name: cnt.paramMinutes,
            description: "(+/-) Minutes to add"
        },
        {
            name: cnt.paramHours,
            description: "(+/-) Hours to add"
        },
        {
            name: cnt.paramDays,
            description: "(+/-) Days to add"
        },
        {
            name: cnt.paramWeekdays,
            description: "(+/-) Weekdays to add"
        },
        {
            name: cnt.paramWeeks,
            description: "(+/-) Weeks to add"
        },
        {
            name: cnt.paramMonths,
            description: "(+/-) Months to add"
        },
        {
            name: cnt.paramYears,
            description: "(+/-) Years to add"
        },
        {
            name: cnt.paramDsNameHol,
            description: "If using /weekdays parameter, can include a secondary data source for holidays to exclude."
        },
        {
            name: cnt.paramXpathHol,
            description: "If using /weekdays parameter, can include an xpath with holidays to exclude."
        }],
        requiredParameters = [{
            name: cnt.paramXPath,
            description: "XPath to starting Date or DateTime field"
        }],
        dateAddErrorFailedToSelectField = "Failed to select the field specified by the XPath.",
        dateAddErrorNothingToDo = "You must specify at least one part to add to the date.",
        dateAddErrorInvalidParamCombination = "If /xpathhol is provided, the weekdays parameter must be used.",
        dateAddErrorInvalidDate = "The field does not contain a valid Date or DateTime value.",
        dateAddErrorInvalidSeconds = "The value specified for Seconds is not a valid whole number value.",
		dateAddErrorInvalidMinutes = "The value specified for Minutes is not a valid whole number value.",
		dateAddErrorInvalidHours = "The value specified for Hours is not a valid whole number value.",
		dateAddErrorInvalidDays = "The value specified for Days is not a valid whole number value.",
        dateAddErrorInvalidWeekdays = "The value specified for Days is not a valid whole number value.",
		dateAddErrorInvalidWeeks = "The value specified for Weeks is not a valid whole number value.",
		dateAddErrorInvalidMonths = "The value specified for Months is not a valid whole number value.",
		dateAddErrorInvalidYears = "The value specified for Years is not a valid whole number value.",
        dateAddErrorInvalidXpath = "Holidays node could not be selected.";

    function getErrorMessage(datePart) {
        switch (datePart) {
            case "s":
                return dateAddErrorInvalidSeconds;

            case "mi":
                return dateAddErrorInvalidMinutes;

            case "hr":
                return dateAddErrorInvalidHours;

            case "da":
                return dateAddErrorInvalidDays;

            case "wd":
                return dateAddErrorInvalidWeekdays;

            case "w":
                return dateAddErrorInvalidWeeks;

            case "mo":
                return dateAddErrorInvalidMonths;

            case "yr":
                return dateAddErrorInvalidYears;
        }
    }

    function addWeekDays(cf, dt, weekDays, holidays) {
        var holidayList = cf.getHolidayList(holidays),
            direction = weekDays < 0 ? -1 : 1;

        while (weekDays != 0) {
            dt.setDate(dt.getDate() + direction);

            var isHolidayDate = holidayList.some(function (hDate) {
                return hDate - new Date(dt.toDateString()) === 0;
            });

            if (!cf.isWeekendDay(dt) && !isHolidayDate) {
                weekDays -= direction;
            }
        }
    }

    function addDatePart(cf, value, datePart, dt, holidays) {
        var intValue = cf.getIntegerValue(value);

        if (intValue === null || Number.isNaN(intValue)) {
            throw new Error(getErrorMessage(datePart));
        }


        switch (datePart) {
            case "s":
                dt.setSeconds(dt.getSeconds() + intValue);
                break;

            case "mi":
                dt.setMinutes(dt.getMinutes() + intValue);
                break;

            case "hr":
                dt.setHours(dt.getHours() + intValue);
                break;

            case "da":
                dt.setDate(dt.getDate() + intValue);
                break;

            case "wd":
                addWeekDays(cf, dt, intValue, holidays);
                break;

            case "w":
                dt.setDate(dt.getDate() + (intValue * 7));
                break;

            case "mo":
                dt.setMonth(dt.getMonth() + intValue);
                break;

            case "yr":
                dt.setFullYear(dt.getFullYear() + intValue);
                break;
        }
    }

    function DateAdd(params) {

        function executeAsync() {
            var cf = params.commonFunction,
                dsName = cf.getParamValue("dsname"),
                xpath = cf.getParamValue("xpath"),
                seconds = cf.getParamValue("seconds"),
                minutes = cf.getParamValue("minutes"),
                hours = cf.getParamValue("hours"),
                days = cf.getParamValue("days"),
                weekdays = cf.getParamValue("weekdays"),
                weeks = cf.getParamValue("weeks"),
                months = cf.getParamValue("months"),
                years = cf.getParamValue("years"),
                dsNameHol = cf.getParamValue("dsnamehol"),
                xpathHol = cf.getParamValue("xpathhol"),
                dom = cf.getDataSource(dsName),
                field = cf.getValidNode(dom, xpath, dateAddErrorFailedToSelectField);

            // Make sure there is something to do.
            if (!seconds && !minutes && !hours && !days && !weekdays && !weeks && !months && !years) {
                return {
                    Error: dateAddErrorNothingToDo
                };
            }

            //if providing holidays, must use the weekdays component
            if (xpathHol && !weekdays) {
                return {
                    Error: dateAddErrorInvalidParamCombination
                };
            }
            var fieldValue = field.value(),
                dt = cf.getValidDate(fieldValue);

            if (!dt) {
                return {
                    Error: dateAddErrorInvalidDate
                }
            }

            try {
                // Validate and process all parameters.
                if (seconds) {
                    addDatePart(cf, seconds, "s", dt);
                }
                if (minutes) {
                    addDatePart(cf, minutes, "mi", dt);
                }
                if (hours) {
                    addDatePart(cf, hours, "hr", dt);
                }
                if (days) {
                    addDatePart(cf, days, "da", dt);
                }
                if (weekdays) {
                    var holidays = null;
                    if (xpathHol) {
                        holidays = cf.getValidNodeSet(cf.getDataSource(dsNameHol), xpathHol, dateAddErrorInvalidXpath);
                    }

                    addDatePart(cf, weekdays, "wd", dt, holidays);
                }
                if (weeks) {
                    addDatePart(cf, weeks, "w", dt);
                }
                if (months) {
                    addDatePart(cf, months, "mo", dt);
                }
                if (years) {
                    addDatePart(cf, years, "yr", dt);
                }
            } catch (e) {
                return {
                    Error: e.message
                };
            }

            //replace extra to get date in hh:mm:ss
            var dtString = dt.toISOString().replace('.000Z', '');

            if (fieldValue.indexOf("T") < 0) {
                dtString = dtString.substr(0, 10);
            }

            return {
                Result: dtString,
                Success: true
            };
        }

        return {
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters,
            executeAsync: executeAsync
        };
    }

    return DateAdd;
})(Qd);