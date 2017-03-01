(function ($, ui) {
    "use strict";
    var stdTok,
        customerLineChartOptions = {
            height: 500,
            hAxis: {
                title: 'Month'
                //,
                //format: 'MMMM, yyyy'
            },
            vAxis: {
                title: 'Opens'
            },
            pointSize: 4
        },
        customerColumnChartOptions = customerLineChartOptions,
        prevCustomer = null,
        prevSite = null,
        prevForm = null,
        promise = Q.Promise,
        uiLoader = ui.uiLoader();

    customerLineChartOptions['series'] = {
        1: { curveType: 'function' }
    };


    google.charts.load('current', { 'packages': ['line', 'corechart'] });

    function showWaitScreenAsync(promise, text) {
        if (!promise) {
            return;
        }

        return uiLoader.showWaitScreen(promise, text);
    }

    function getSelect2SelectedValue(control) {
        if (!control) {
            return null;
        }

        var selectedData = $(control).select2('data'),
            selectedValue = selectedData && selectedData.length
            ? selectedData[0].id
            : null;

        return selectedValue;
    }

    function getChartTypeById(controlName) {
        return $('input[name="' + controlName + '"]:checked').val();
    }

    function callGetAsync(url) {
        return $.get(url);
    }

    function drawPieChart(options, cData, chartControl) {
        var chart = new google.visualization.PieChart(document.getElementById(chartControl));
        chart.draw(google.visualization.arrayToDataTable(cData), options);
    }

    function drawColumnChart(chartControl, cData, options) {
        var chart = new google.visualization.ColumnChart(document.getElementById(chartControl));
        chart.draw(cData, options);
    }

    function drawLineChart(chartControl, cData, options) {
        var chart = new google.visualization.LineChart(document.getElementById(chartControl));
        chart.draw(cData, options);
    }

    function createColumnChartData(data) {
        if (!data || !data.map) {
            return [];
        }

        var chartData = data.map(function (item) {
            return item.map(function (val) {
                if (typeof val === 'number') {
                    return val;
                }

                var startDateString = val.substr(6);
                startDateString = startDateString.substr(0, startDateString.indexOf(')/'));

                return new Date(new Number(startDateString));
            });
        });

        return chartData;
    }

    function drawCustomerChartSuccessCallback(data) {
        if (data && data.Customers && data.Data) {
            var chartDiv = document.getElementById('divChartCustomer'),
                cData = new google.visualization.DataTable(),
                chartData = createColumnChartData(data.Data);

            cData.addColumn('date', 'Month');

            data.Customers.forEach(function (cust) {
                cData.addColumn('number', cust);
            });

            cData.addRows(chartData);

            var chartType = getChartTypeById('rbtnCustChartType');

            //    customerChart = chartType === 'C'
            //    ? new google.visualization.ColumnChart(chartDiv)
            //    : new google.visualization.LineChart(chartDiv),
            //    chartOptions = chartType === 'C'
            //    ? customerColumnChartOptions
            //    : customerLineChartOptions;

            //customerChart.draw(cData, chartOptions);

            if (chartType === 'C') {
                drawColumnChart('divChartCustomer', cData, customerColumnChartOptions);
            }
            else {
                //var materialChart = new google.visualization.LineChart(chartDiv);
                //materialChart.draw(cData, customerLineChartOptions);

                drawLineChart('divChartCustomer', cData, customerLineChartOptions);
            }
        }
    }

    function drawCustomerChart(customer) {
        return callGetAsync('/FormsViewer/CustomerData?customer=' + customer)
            .success(drawCustomerChartSuccessCallback)
            .error(function (data) {

            });
    }

    function getCustomerInfo(customer) {
        return callGetAsync('/FormsViewer/CustomerInfo?customer=' + customer)
            .success(function (data) {
                if (data) {
                    $('#divCustomerInfo').html(data);
                }
            })
            .error(function (data) {

            });
    }

    function customerSitesSuccessCallback(data, targetControl) {
        $(targetControl).html(data);

        $('.sites', $(targetControl)).select2({
            width: '100%',
            placeholder: 'Search site',
            allowClear: true,
            height: '34px'
        });
    }

    function getCustomerSites(customer, targetControl, searchControl, isForm) {
        if (!customer) {
            $(targetControl).html('');
            $(searchControl).addClass('disabled');
            return Q();
        }
        else {
            $(searchControl).removeClass('disabled');
        }

        return callGetAsync('/FormsViewer/GetCustomerSites?customer=' + customer + '&isForm=' + isForm)
            .success(function (data) {
                customerSitesSuccessCallback(data, targetControl);
            });
    }

    function customerSitesDataSuccessCallback(data) {
        if (data && data.Type) {

            if (data.Type === 'P') {
                var options = {
                    is3D: true,
                };

                var cData = [['Sites', 'Opens']].concat(data.Data);
                drawPieChart(options, cData, 'divChartSites');
            }
            else {
                var cData = new google.visualization.DataTable();
                cData.addColumn('date', 'Month');

                data.Sites.forEach(function (site) {
                    cData.addColumn('number', site);
                });

                var chartData = createColumnChartData(data.Data);

                cData.addRows(chartData);
                drawColumnChart('divChartSites', cData, customerColumnChartOptions);
            }
        }
    }

    function drawSiteChart(customer, site, chartType) {
        return callGetAsync('/Formsviewer/CustomerSitesData?customer=' + customer + '&site=' + site + '&type=' + chartType)
            .then(customerSitesDataSuccessCallback);
    }

    function getSiteInfo(customer, site) {
        return callGetAsync('/FormsViewer/SiteInfo?customer=' + customer + '&site=' + site)
            .success(function (data) {
                if (data) {
                    $('#divSiteInfo').html(data);
                }
            })
            .error(function (data) {

            });
    }

    function getSiteForms(customer, site) {
        if (!site) {
            $('#divForms').html('');
            $('#btnSearchForms').addClass('disabled');
            return Q();
        }
        $('#btnSearchForms').removeClass('disabled');


        return callGetAsync('/Formsviewer/GetSiteForms?customer=' + customer + '&site=' + site)
            .success(function (data) {
                $('#divForms').html(data);

                $('.forms', $('#divForms')).select2({
                    width: '100%',
                    placeholder: 'Search Form',
                    allowClear: true,
                    height: '34px'
                });
            });
    }

    function drawFormChart(customer, site, templateName, chartType) {
        return callGetAsync('/Formsviewer/SiteFormsData?customer=' + customer + '&site=' + site + '&templateName=' + templateName + '&type=' + chartType)
            .then(function (data) {
                if (data && data.Type) {

                    if (data.Type === 'P') {
                        var options = {
                            //title: 'Site Forms',
                            is3D: true,
                        };

                        var cData = [['Sites', 'Opens']].concat(data.Data);

                        drawPieChart(options, cData, 'divChartForms');
                        //var chart = new google.visualization.PieChart(document.getElementById('divChartForms'));
                        //chart.draw(google.visualization.arrayToDataTable(cData), options);
                    }
                    else {
                        var cData = new google.visualization.DataTable(),
                            chartData = createColumnChartData(data.Data);
                        cData.addColumn('date', 'Month');

                        data.Sites.forEach(function (site) {
                            cData.addColumn('number', site);
                        });

                        //var chartData = data.Data.map(function (item) {
                        //    return item.map(function (val) {
                        //        if (typeof val === 'number') {
                        //            return val;
                        //        }

                        //        var startDateString = val.substr(6);
                        //        startDateString = startDateString.substr(0, startDateString.indexOf(')/'));

                        //        return new Date(new Number(startDateString));
                        //    });
                        //});

                        cData.addRows(chartData);

                        drawColumnChart('divChartForms', cData, customerColumnChartOptions);
                        //var materialChart = new google.visualization.ColumnChart(document.getElementById('divChartForms'));
                        //materialChart.draw(cData, customerColumnChartOptions);
                    }
                }
            });
    }

    function getFormInfo(customer, site, templateName) {
        return callGetAsync('/FormsViewer/FormInfo?customer=' + customer + '&site=' + site + '&templateName=' + templateName)
            .success(function (data) {
                if (data) {
                    $('#divFormInfo').html(data);
                }
            })
            .error(function (data) {

            });
    }

    function getQueryObj() {
        return {
            Query: $.trim($('#txtbxSearch').val())
        };
    }

    function isValidQuery(queryObj) {
        if (!queryObj.Query) {
            $('.search-text').removeClass('hidden');
            return false;
        }
        else {
            $('.search-text').addClass('hidden');
        }

        return true;
    }

    function searchSitesAsync(url, data) {
        $.post(url + '?' + stdTok, data)
            .then(function (data) {
                $('#divLocations').html(data);

                $('.location-item').each(function () {
                    $(this).attr('href', '/FormsViewer/LocationDetail?' + stdTok + '&location=' + $(this).data('location'));
                });
            })
            .fail(function (x, h, r) {
                alert('There was an error while searching site');
            });
    }

    function handleSearchCustomerClick() {

        var selectedCustomer = getSelect2SelectedValue('#divSearchCustomer .customers');

        return showWaitScreenAsync(promise.all(drawCustomerChart(selectedCustomer), getCustomerInfo(selectedCustomer)));

        //if (prevCustomer !== selectedCustomer) {
        //    prevCustomer = selectedCustomer;
        //    getCustomerSites(selectedCustomer);
        //}
    }

    function handleSearchSiteClick() {
        var customer = getSelect2SelectedValue('#divSearchSite .customers'),
            site = getSelect2SelectedValue('#divSearchSite .sites'),
            chartType = getChartTypeById("rbtnSiteChartType");

        if (!customer) {
            return;
        }

        return showWaitScreenAsync(promise.all(drawSiteChart(customer, site, chartType),
            getSiteInfo(customer, site)));

        //if (prevSite !== site) {
        //    prevSite = site;

        //    getSiteForms(site);
        //}
    }

    function handleSearchFormClick() {
        var customer = getSelect2SelectedValue('#divSearchForm .customers'),
            site = getSelect2SelectedValue('#divSearchForm .sites'),
            templateName = getSelect2SelectedValue('#divSearchForm .forms'),
            chartType = getChartTypeById("rbtnFormChartType");

        return showWaitScreenAsync(promise.all(drawFormChart(customer, site, templateName, chartType),
            getFormInfo(customer, site, templateName)));
    }

    $(function () {
        stdTok = decodeURIComponent(standardTokens());
        preparePageAsync(true);

        $('#btnSearchLocation').click(function () {
            var queryObj = getQueryObj();
            if (!isValidQuery(queryObj)) {
                return;
            }

            searchSitesAsync('/Formsviewer/SearchSites', queryObj);
        });

        $('#btnSearchExpired').click(function () {
            $('.search-text').addClass('hidden');
            searchSitesAsync('/Formsviewer/SearchExpiredSites', null);
        });

        $('#divFilters').tabs({
            collapsible: true
        });

        $('.customers').select2({
            width: '100%',
            placeholder: 'Search customer',
            allowClear: true,
            height: '34px'
        });

        $('#btnSearchCustomer').click(handleSearchCustomerClick);

        $('#divSearchSite .customers').change(function (e) {
            var customer = getSelect2SelectedValue(e.target);
            return showWaitScreenAsync(promise.resolve(getCustomerSites(customer, '#divSitesCustomer', '#btnSearchSites', false)));
        });

        $('#divSearchForm')
            .on('change', '.customers', function (e) {
                $('#divForms').html('');
                var customer = getSelect2SelectedValue(e.target);
                return showWaitScreenAsync(promise.resolve(getCustomerSites(customer, '#divSitesForm', '#btnSearchForms', true)))
                .then(function () {
                    $('#btnSearchForms').addClass('disabled');
                });
            })
            .on('change', '.sites', function (e) {
                var customer = getSelect2SelectedValue('#divSearchForm .customers'),
                    site = getSelect2SelectedValue(e.target);

                return showWaitScreenAsync(promise.resolve(getSiteForms(customer, site)));
            });

        //$('#divSearchForm .sites').change(function (e) {
        //    debugger;
        //    var site = getSelect2SelectedValue(e.target);
        //    getSiteForms(site);
        //});

        $('#divFilters')
            .on('click', '#btnSearchSites', handleSearchSiteClick)
            .on('click', '#btnSearchForms', handleSearchFormClick);
    });

})(jQuery, Qd.FormsViewer.UI);