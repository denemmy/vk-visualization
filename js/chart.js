
function Chart() {

    var chart = this;
    
    var canvas = null;
    var context = null;

    var canvasChart = null;
    var contextChart = null;

    var canvasGrid = null;
    var contextGrid = null;

    var centerX = 0;
    var centerY = 0;

    var containerH = 0;
    var containerW = 0;

    var inited = false;

    var minDate;
    var maxDate;

    var stepWidth = 10; //in pixels
    var periodLen;

    var timeStepSec; //in seconds
    var time = 1377632385;

    var msgStep = 200;
    var stepHeight = 20;

    var curMonth = -1;
    var prevMonth = -1;
    var nextMonth = -1;

    var daysInMonth = 0;
    var daysInPrevMonth = 0;

    var canvasGridWidth;
    var canvasGridHeight;
    var canvasChartWidth;
    var canvasChartHeight;

    var requireChartPrerender;
    var requireGridPrerender;

    var intervals;
    var maxValue;
    var color;

    function preRenderChart() {

        requireChartPrerender = false;
        canvasChart = document.createElement("canvas");       

        //var stepsNum = Math.floor(periodLen / timeStepSec) + 1;
        var stepsNum = intervals.length;          

        canvasChart.width = stepWidth * stepsNum;
        canvasChart.height = containerH;
        canvasChartWidth = canvasChart.width;
        canvasChartHeight = canvasChart.height;
        contextChart = canvasChart.getContext("2d");
        //optimizeQuality(canvasChart, contextChart);

        var maxY = containerH - 40;
        
        var meanValue = 1;
        maxValue = Array.max(intervals);
        var coeff = 1 / meanValue / maxY;      
        contextChart.fillStyle = color;
        contextChart.strokeStyle = color;
        contextChart.lineWidth = 1;
        contextChart.beginPath();
        contextChart.moveTo(0, containerH);
        for(var i = 0; i < intervals.length; i++) {
            var x = stepWidth * i;
            var h = intervals[i] / maxValue * maxY;
            var y = containerH - h;
            contextChart.lineTo(x, y);
        }
        contextChart.lineTo(x, containerH);
        contextChart.lineTo(0, containerH);
        contextChart.globalAlpha = 0.1;
        contextChart.fill();
        contextChart.globalAlpha = 1;
        contextChart.stroke();

        /*contextChart.fillStyle = "#658AB0";
        for(var i = 0; i < stepsNum; i++) {
            minX = stepWidth * i;
            maxX = minX + stepWidth;
            h = 30 * Math.log(1 + 0.05 * intervals[i]);
            minY = 200 - h - 1;
            maxY = 200;
            contextChart.fillRect(minX, minY, stepWidth-1, maxY - minY);
            //contextChart.fillRect(minX, maxY-50, 4, 50);
        }*/
    }

    function preRenderGrid() {
        
        requireGridPrerender = false;

        var monthWidth = 31 * 24 * 3600 / timeStepSec * stepWidth;
        canvasGrid = document.createElement('canvas');
        canvasGrid.width = monthWidth * 12;
        canvasGrid.height = containerH;
        canvasGridWidth = canvasGrid.width;
        canvasGridHeight = canvasGrid.height;
        contextGrid = canvasGrid.getContext('2d');
        optimizeQuality(canvasGrid, contextGrid);
        contextGrid.lineWidth = 0.3;
        contextGrid.strokeStyle = "#658AB0";
        contextGrid.fillStyle = "#658AB0";
        contextGrid.textAlign = "center";
        contextGrid.font = "10pt tahoma";

        //vertical lines
        var y1 = 0;
        var y2 = containerW;
        contextGrid.beginPath();
        for(var i = 0; i < 13; i++) {
            var x = monthWidth * i;
            contextGrid.moveTo(x, y1);
            contextGrid.lineTo(x, y2);

            if(i < 12) {
                var x0 = x + monthWidth / 2;
                var y0 = 25;
                contextGrid.fillText(months[i], x0, y0);
            }
        }

        //horizontal lines
        var x1 = 0;
        var x2 = canvasGridWidth;
        var verticalLinesNum = Math.floor((containerH - 20) / stepHeight);
        for(var i = 0; i < verticalLinesNum; i++) {
            var y = containerH - stepHeight * i;
            contextGrid.moveTo(x1, y);
            contextGrid.lineTo(x2, y);
        }

        contextGrid.stroke();
    }

    chart.render = function() {
        if(requireGridPrerender) {
            preRenderGrid();
        }
        if(requireChartPrerender) {
            preRenderChart();
        }
    }

    chart.setColor = function(colorNew) {
        color = colorNew;
    }

    chart.setSize = function(width, height) {
        containerH = height;
        containerW = width;
        centerX = containerW / 2;
        centerY = containerH / 2;
        canvas.width = containerW > 300 ? containerW : 300;
        canvas.height = containerH > 300 ? containerH : 300;
        context = canvas.getContext("2d");
        optimizeQuality(canvas, context);
        requireChartPrerender = true;
        requireGridPrerender = true;
    }

    chart.setData = function(data, _minDate, _maxDate, _timeStepSec) {
        if(data.length == 0) {
            return;
        }
        if(maxDate < minDate) {
            return;
        }
        minDate = _minDate;
        maxDate = _maxDate;
        periodLen = maxDate - minDate;
        intervals = data;
        timeStepSec = _timeStepSec;
        
        maxValue = Array.max(data);
        requireChartPrerender = true;
        requireGridPrerender = true;
    }

    chart.init = function(canvasId, width, height) {
        canvas = document.getElementById(canvasId);
        chart.setSize(width, height);
        inited = true;
        requireChartPrerender = true;
        requireGridPrerender = true;
        time = 1377632385;
        curMonth = -1;
        prevMonth = -1;
        nextMonth = -1;
    }

    chart.setTime = function(timeNew) {        
        time = timeNew;
    }
    chart.draw = function() {

        if(!inited) return;
        if(requireGridPrerender || requireChartPrerender) return;

        context.globalAlpha = 1;
        context.clearRect(0, 0, canvas.width, canvas.height);

        //draw grid
        var date = new Date(time * 1000);
        var year = date.getFullYear();
        var month = date.getMonth();    /*0-11*/
        var day = date.getDate() - 1;   /*0-30*/
        var hour = date.getHours();

        if(month != curMonth) {
            //month changed
            prevMonth = (month - 1) % 12;;
            curMonth = month;
            nextMonth = (month + 1) % 12;
            daysInMonth = getDaysInMonth(nextMonth, year);
        }

        var dayM = day * 31.0 / daysInMonth;
        var monthOffset = ((month * 31 + dayM) * 24 + hour);
        var maxMonthOffset = 12 * 31 * 24;

        var offsetX = -canvasGridWidth * monthOffset / maxMonthOffset + centerX;
        var offsetY = 0;

        if(offsetX > 0) {
            //draw previous years's months
            var offsetPrevX = offsetX - canvasGridWidth;
            context.drawImage(canvasGrid, offsetPrevX, offsetY, canvasGridWidth, canvasGridHeight);
        }

        context.drawImage(canvasGrid, offsetX, offsetY, canvasGridWidth, canvasGridHeight);

        if(offsetX + canvasGridWidth < containerW) {
            //draw next years's months
            offsetNextX = offsetX + canvasGridWidth;
            context.drawImage(canvasGrid, offsetNextX, offsetY, canvasGridWidth, canvasGridHeight);
        }


        //draw chart
        var offsetX = -(time - minDate) / periodLen * canvasChartWidth + centerX;
        var offsetY = 0;

        var isVisible = offsetX < containerW;
        var isVisible = isVisible && offsetX + canvasChartWidth > 0;
        if(isVisible) {
            context.drawImage(canvasChart, offsetX, offsetY, canvasChartWidth, canvasChartHeight);
        }
    }

    chart.getContext = function() {
        return context;
    }

    chart.getTimeStepSec = function() {
        return timeStepSec;
    }

    chart.getStepWidth = function() {
        return stepWidth;
    }

    return chart;
}


