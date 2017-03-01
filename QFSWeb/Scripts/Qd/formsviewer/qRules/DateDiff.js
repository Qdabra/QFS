var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.DateDiff = (function (qd) {
    "use strict";

    var optionalParameters = [{
        name: "component",
        description: 'Desired portion of the date difference (days | weekdays | hours | minutes | seconds |milliseconds | totaldays | totalhours | totalminutes | totalseconds | totalmilliseconds)'
    },
    {
        name: "dsnamehol",
        description: 'If using /component=weekdays, a secondary data source can be included for holidays to exclude. Use with /xpathhol to indicate a location for excluded holiday dates'
    },
    {
        name: "xpathhol",
        description: 'If using /component=weekdays, /xpathhol allows you to include a repeating field or field in a repeating group with holidays that should be excluded in the date math. If the values are in your main data source, /dsnamehol is not needed'
    }],
    requiredParameters = [{
        name: "date1",
        description: 'The start date'
    },
    {
        name: "date2",
        description: 'The date to subtract from date1'
    }],
    date1InvalidErrorMsg = "The first date is invalid.",
    date2InvalidErrorMsg = "The second date is invalid.",
    dateDiffErrorInvalidXpath = "Holidays node could not be selected.",
    datediffErrorInvalidParamCombination = "If /xpathhol is provided, the weekdays component must be used.",
    datediffErrorComponentInvalid = "The component is invalid.";

    function DateDiff(params) {

        function getHolidayList(holidays) {
            var holidayList = [];

            if (!holidays || holidays.length == 0) {
                holidayList.push(new Date(1900, 0, 1));

                return holidayList;
            }

            holidays.forEach(function (holidayNode, index) {
                var dateMilliseconds = Date.parse(holidayNode.value());
                if (!Number.isNaN(dateMilliseconds)) {
                    var date = new Date(dateMilliseconds);

                    date = new Date(date.toDateString());//Remove time from date object

                    holidayList.push(date);
                }
            })

            return holidayList;
        }

        function isWeekendDay(dt) {
            var day = dt.getDay();
            return day === 0 || day === 6;
        }

        function getWeekDays(dt1, dt2, holidays) {
            var holidayList = getHolidayList(holidays),
                weekDays = 0,
                totalDays = getDateDiffbyComponent(dt1, dt2, "days"),
                newDate = dt1,
                direction = totalDays < 0 ? -1 : 1;

            while (totalDays !== 0) {
                newDate.setDate(newDate.getDate() + (-1 * direction));
                newDate = new Date(newDate.toDateString());

                var isHolidayDate = holidayList.some(function (hDate) {
                    return hDate - newDate === 0;
                });
                if (!isWeekendDay(newDate) && !isHolidayDate) {
                    weekDays += direction;
                }

                totalDays -= direction;
            }

            return weekDays;
        }

        function convertDateToLocal(dateTime) {
            return new Date(dateTime.getTime() + dateTime.getTimezoneOffset() * 60 * 1000);
        }

        function getDateDiffbyComponent(dt1, dt2, component, holidays) {
            var milliSeconds = dt1 - dt2,
            dateDiff = convertDateToLocal(new Date(milliSeconds));

            switch (component.toLowerCase()) {
                case "d":
                case "days":
                    return Math.floor(milliSeconds / (1000 * 60 * 60 * 24));

                case "weekdays":
                    //TODO: Check Holiday count.
                    return getWeekDays(dt1, dt2, holidays);

                case "h":
                case "hours":
                    return dateDiff.getHours();

                case "m":
                case "minutes":
                    return dateDiff.getMinutes();

                case "s":
                case "seconds":
                    return dateDiff.getSeconds();

                case "ms":
                case "milliseconds":
                    return dateDiff.getMilliseconds();

                case "td":
                case "totaldays":
                    return milliSeconds / (1000 * 60 * 60 * 24);

                case "th":
                case "totalhours":
                    return milliSeconds / (1000 * 60 * 60);

                case "tm":
                case "totalminutes":
                    return milliSeconds / (1000 * 60);

                case "ts":
                case "totalseconds":
                    return milliSeconds / 1000;

                case "tms":
                case "totalmilliseconds":
                    return milliSeconds;

                default:
                    throw new Error(datediffErrorComponentInvalid);
            }
        }

        function executeAsync() {
            var commonFunction = params.commonFunction,
                dataSources = params.dataSources,
                date1 = commonFunction.getParamValue("date1"),
                date2 = commonFunction.getParamValue("date2"),
                component = commonFunction.getParamValue("component", "weekdays"),
                dsnamehol = commonFunction.getParamValue("dsnamehol"),
                xpathhol = commonFunction.getParamValue("xpathhol"),
                dt1Milliseconds = Date.parse(date1),
                dt2Milliseconds = Date.parse(date2);

            if (Number.isNaN(dt1Milliseconds)) {
                throw new Error(date1InvalidErrorMsg);
            }

            if (Number.isNaN(dt2Milliseconds)) {
                throw new Error(date2InvalidErrorMsg);
            }

            var dt1 = convertDateToLocal(new Date(dt1Milliseconds)),
                dt2 = convertDateToLocal(new Date(dt2Milliseconds)),
                holidays = null;

            if (xpathhol) {
                var dom = dataSources.getDom(dsnamehol);
                holidays = commonFunction.getValidNodeSet(dom, xpathhol, dateDiffErrorInvalidXpath);

                if (component !== "weekdays") {
                    throw new Error(datediffErrorInvalidParamCombination);
                }
            }

            var resultObject = {
                Error: '',
                Result: getDateDiffbyComponent(dt1, dt2, component, holidays),
                Success: true
            };

            return Q(resultObject);
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        }
    }

    return DateDiff;
})(Qd);