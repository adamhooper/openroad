(function() {
  var AccidentFinder, AccidentsMarkerRenderer, AccidentsTableRenderer, CITIES, COLORS, ChartSeriesMaker, DEFAULT_MAX_YEAR, DEFAULT_MIN_YEAR, Manager, RouteFinder, RouteRenderer, State, TrendChartRenderer, URL, WORST_ACCIDENT_RADIUS, WorstLocationsRenderer, keepMapInStateBounds, originalClusterIconCreateCss, selectText, show_accidents_dialog, syncOriginDestinationMarkers, _address_form_abort_clicking_on_map,
    __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  URL = 'http://localhost:8000/%{city}';

  DEFAULT_MIN_YEAR = 2007;

  DEFAULT_MAX_YEAR = 2011;

  COLORS = {
    driving: '#0e3b5d',
    bicycling: '#a73438',
    both: '#f9f298'
  };

  CITIES = {
    vancouver: {
      latitude: 49.2505,
      longitude: -123.1119,
      zoom: 12,
      minYear: 2006,
      maxYear: 2010,
      bounds: new google.maps.LatLngBounds(new google.maps.LatLng(49.131859, -123.264954), new google.maps.LatLng(49.352188, -122.985718))
    },
    calgary: {
      latitude: 51.0451,
      longitude: -114.0569,
      zoom: 12,
      minYear: 1996,
      maxYear: 2011,
      bounds: new google.maps.LatLngBounds(new google.maps.LatLng(50.842941, -114.613968), new google.maps.LatLng(51.343868, -113.901817))
    },
    toronto: {
      latitude: 43.6517,
      longitude: -79.3827,
      zoom: 13,
      minYear: 1986,
      maxYear: 2010,
      bounds: new google.maps.LatLngBounds(new google.maps.LatLng(43.584740, -79.639297), new google.maps.LatLng(43.855419, -79.115623))
    },
    ottawa: {
      latitude: 45.4214,
      longitude: -75.6919,
      zoom: 13,
      minYear: 2001,
      maxYear: 2010,
      bounds: new google.maps.LatLngBounds(new google.maps.LatLng(44.962002, -76.355766), new google.maps.LatLng(45.536541, -75.246033))
    },
    montreal: {
      latitude: 45.5081,
      longitude: -73.5550,
      zoom: 13,
      minYear: 2006,
      maxYear: 2010,
      bounds: new google.maps.LatLngBounds(new google.maps.LatLng(45.413479, -73.976608), new google.maps.LatLng(45.704788, -73.476418))
    },
    halifax: {
      latitude: 44.6479,
      longitude: -63.5744,
      zoom: 13,
      minYear: 2007,
      maxYear: 2010,
      bounds: new google.maps.LatLngBounds(new google.maps.LatLng(44.434570, -64.237190), new google.maps.LatLng(45.276489, -62.160469))
    }
  };

  WORST_ACCIDENT_RADIUS = 7;

  originalClusterIconCreateCss = ClusterIcon.prototype.createCss;

  ClusterIcon.prototype.createCss = function(pos) {
    var style;
    style = originalClusterIconCreateCss.call(this, pos);
    return "" + style + " z-index: 2000;";
  };

  selectText = function(element) {
    var range, selection;
    if (document.body.createTextRange != null) {
      range = document.body.createTextRange();
      range.moveToElementText(element);
      return range.select();
    } else if (window.getSelection != null) {
      selection = window.getSelection();
      range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      return selection.addRange(range);
    }
  };

  State = (function() {

    function State(options) {
      if (options == null) options = {};
      this.city = options.city || 'toronto';
      this.mode = 'bicycling';
      this.origin = options.origin;
      this.destination = options.destination;
      this.minYear = this._clampYear('min', options.minYear || DEFAULT_MIN_YEAR);
      this.maxYear = this._clampYear('max', options.maxYear || DEFAULT_MAX_YEAR);
      this.routes = {};
      this.accidents = {};
      this.listeners = {};
      this.frozen = {};
    }

    State.prototype.onChange = function(key, callback) {
      var _base;
      (_base = this.listeners)[key] || (_base[key] = []);
      return this.listeners[key].push(callback);
    };

    State.prototype.freeze = function(key) {
      if (!(this.frozen[key] != null)) return this.frozen[key] = true;
    };

    State.prototype.thaw = function(key) {
      var arg1;
      if (!(this.frozen[key] != null)) return;
      if (this.frozen[key] === true) {
        return delete this.frozen[key];
      } else {
        arg1 = this.frozen[key][0];
        delete this.frozen[key];
        return this._changed(key, arg1);
      }
    };

    State.prototype._changed = function(key, arg1) {
      var callback, callbacks, _i, _len, _results;
      if (arg1 == null) arg1 = void 0;
      if (this.frozen[key] != null) {
        return this.frozen[key] = [arg1];
      } else {
        callbacks = this.listeners[key] || [];
        _results = [];
        for (_i = 0, _len = callbacks.length; _i < _len; _i++) {
          callback = callbacks[_i];
          _results.push(callback(arg1));
        }
        return _results;
      }
    };

    State.prototype.setCity = function(city) {
      if (this.city === city) return;
      this.clearAccidents();
      this.clearRoutes();
      this.setDestination(void 0);
      this.setOrigin(void 0);
      this.city = city;
      this.setMinYear(this.minYear);
      this.setMaxYear(this.maxYear);
      return this._changed('city', this.city);
    };

    State.prototype.setMode = function(mode) {
      if (this.mode === mode) return;
      this.mode = mode;
      return this._changed('mode', this.mode);
    };

    State.prototype.setOrigin = function(latlng) {
      if (latlng === this.origin) return;
      this.clearAccidents();
      this.clearRoutes();
      this.origin = latlng;
      return this._changed('origin', this.origin);
    };

    State.prototype.setDestination = function(latlng) {
      if (latlng === this.destination) return;
      this.clearAccidents();
      this.clearRoutes();
      this.destination = latlng;
      return this._changed('destination', this.destination);
    };

    State.prototype._clampYear = function(minOrMax, year) {
      var clamp, property;
      property = "" + minOrMax + "Year";
      clamp = CITIES[this.city][property];
      if (!year) return clamp;
      if (minOrMax === 'min' && year < clamp) return clamp;
      if (minOrMax === 'max' && year > clamp) return clamp;
      return year;
    };

    State.prototype.setMinYear = function(year) {
      var clampedYear;
      clampedYear = this._clampYear('min', year);
      if (clampedYear !== this.minYear) {
        this.clearAccidents();
        this.minYear = clampedYear;
        return this._changed('minYear', this.minYear);
      }
    };

    State.prototype.setMaxYear = function(year) {
      var clampedYear;
      clampedYear = this._clampYear('max', year);
      if (clampedYear !== this.maxYear) {
        this.clearAccidents();
        this.maxYear = clampedYear;
        return this._changed('maxYear', this.maxYear);
      }
    };

    State.prototype.setRoute = function(key, directions) {
      if (this.accidents[key] != null) {
        delete this.accidents[key];
        this._changed('accidents', this.accidents);
      }
      this.routes[key] = directions;
      return this._changed('routes', this.routes);
    };

    State.prototype.clearRoutes = function() {
      this.routes = {};
      return this._changed('routes', this.routes);
    };

    State.prototype.setAccidents = function(key, accidents) {
      this.accidents[key] = accidents;
      return this._changed('accidents', this.accidents);
    };

    State.prototype.clearAccidents = function() {
      this.accidents = {};
      return this._changed('accidents', this.accidents);
    };

    return State;

  })();

  window.State = State;

  RouteFinder = (function() {

    function RouteFinder(state) {
      var _this = this;
      this.state = state;
      this.state.onChange('city', function() {
        return _this.refresh();
      });
      this.state.onChange('origin', function() {
        return _this.refresh();
      });
      this.state.onChange('destination', function() {
        return _this.refresh();
      });
      this.state.onChange('mode', function() {
        return _this.refresh();
      });
      this._activeRequestIds = {};
      this._activeRequestIds[google.maps.TravelMode.BICYCLING] = 0;
      this._activeRequestIds[google.maps.TravelMode.DRIVING] = 0;
    }

    RouteFinder.prototype._getCityBounds = function() {
      return CITIES[this.state.city].bounds;
    };

    RouteFinder.prototype._modeToGoogleModes = function(mode) {
      return {
        driving: [google.maps.TravelMode.DRIVING],
        bicycling: [google.maps.TravelMode.BICYCLING],
        both: [google.maps.TravelMode.BICYCLING, google.maps.TravelMode.DRIVING]
      }[mode];
    };

    RouteFinder.prototype._googleModeToMode = function(mode) {
      if (mode === google.maps.TravelMode.DRIVING) {
        return 'driving';
      } else {
        return 'bicycling';
      }
    };

    RouteFinder.prototype._getDirectionsRequestForMode = function(mode) {
      var googleMode, _i, _len, _ref, _results;
      _ref = _modeToGoogleModes(mode);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        googleMode = _ref[_i];
        _results.push(this._getDirectionsRequestForGoogleMode(googleMode));
      }
      return _results;
    };

    RouteFinder.prototype._getDirectionsRequestForGoogleMode = function(googleMode) {
      return {
        origin: this.state.origin,
        destination: this.state.destination,
        travelMode: googleMode,
        provideRouteAlternatives: false,
        unitSystem: google.maps.UnitSystem.METRIC,
        region: 'ca'
      };
    };

    RouteFinder.prototype._getDirectionsService = function() {
      return this.directionsService || (this.directionsService = new google.maps.DirectionsService());
    };

    RouteFinder.prototype.refresh = function() {
      var googleMode, _i, _len, _ref, _results;
      if (!(this.state.origin != null) || !(this.state.destination != null)) {
        this.state.clearRoutes();
        return;
      }
      _ref = this._modeToGoogleModes(this.state.mode);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        googleMode = _ref[_i];
        _results.push(this._refreshGoogleModeRoute(googleMode));
      }
      return _results;
    };

    RouteFinder.prototype._refreshGoogleModeRoute = function(googleMode) {
      var mode, request, requestId, service,
        _this = this;
      mode = this._googleModeToMode(googleMode);
      if (this.state.routes[mode]) return;
      service = this._getDirectionsService();
      request = this._getDirectionsRequestForGoogleMode(googleMode);
      requestId = (this._activeRequestIds[googleMode] += 1);
      return service.route(request, function(result, status) {
        if (_this._activeRequestIds[googleMode] !== requestId) return;
        if (status !== google.maps.DirectionsStatus.OK) return;
        return _this.state.setRoute(mode, result);
      });
    };

    return RouteFinder;

  })();

  RouteRenderer = (function() {

    function RouteRenderer(state, map) {
      var mode, _i, _len, _ref,
        _this = this;
      this.state = state;
      this.renderers = {};
      this._blockingStateChanges = {};
      _ref = ['bicycling', 'driving'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        mode = _ref[_i];
        this._blockingStateChanges[mode] = false;
        this.renderers[mode] = this._createDirectionsRendererForMode(mode, map);
      }
      this.state.onChange('routes', function() {
        return _this.refresh();
      });
      this.state.onChange('mode', function() {
        return _this.refresh();
      });
    }

    RouteRenderer.prototype.refresh = function() {
      var mode, route, _i, _len, _ref, _results;
      _ref = ['bicycling', 'driving'];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        mode = _ref[_i];
        if (this._blockingStateChanges[mode]) continue;
        route = this.state.routes[mode];
        if (route && (this.state.mode === 'both' || mode === this.state.mode)) {
          this._blockingStateChanges[mode] = true;
          this.renderers[mode].setDirections(route);
          this.renderers[mode].setMap(map);
          _results.push(this._blockingStateChanges[mode] = false);
        } else {
          _results.push(this.renderers[mode].setMap(null));
        }
      }
      return _results;
    };

    RouteRenderer.prototype._createDirectionsRendererForMode = function(mode) {
      var color, renderer,
        _this = this;
      color = COLORS[mode];
      renderer = new google.maps.DirectionsRenderer({
        draggable: true,
        polylineOptions: {
          strokeColor: color
        },
        preserveViewport: true,
        suppressInfoWindows: true,
        suppressMarkers: true,
        suppressBicyclingLayer: true
      });
      google.maps.event.addListener(renderer, 'directions_changed', function() {
        if (_this._blockingStateChanges[mode]) return;
        _this._blockingStateChanges[mode] = true;
        _this.state.setRoute(mode, renderer.getDirections());
        return _this._blockingStateChanges[mode] = false;
      });
      return renderer;
    };

    return RouteRenderer;

  })();

  AccidentFinder = (function() {

    function AccidentFinder(state) {
      var _this = this;
      this.state = state;
      this._requests = {};
      this.state.onChange('routes', function() {
        return _this.refresh();
      });
      this.state.onChange('minYear', function() {
        return _this.refresh();
      });
      this.state.onChange('maxYear', function() {
        return _this.refresh();
      });
    }

    AccidentFinder.prototype.refresh = function() {
      var mode, _i, _len, _ref, _results;
      _ref = this.state.mode !== 'both' && [this.state.mode] || ['bicycling', 'driving'];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        mode = _ref[_i];
        _results.push(this._refreshAccidents(mode));
      }
      return _results;
    };

    AccidentFinder.prototype._refreshAccidents = function(mode) {
      var encodedPolyline, postData, route, url,
        _this = this;
      if (this._requests[mode] != null) {
        this._requests[mode].abort();
        delete this._requests[mode];
      }
      route = this.state.routes[mode];
      if (!(route != null)) return;
      encodedPolyline = route.routes[0].overview_polyline.points;
      postData = {
        min_date: "" + this.state.minYear + "-01-01",
        max_date: "" + this.state.maxYear + "-12-31",
        encoded_polyline: encodedPolyline
      };
      url = URL.replace(/%\{city}/, this.state.city);
      return this._requests[mode] = $.ajax({
        url: url,
        type: 'POST',
        data: postData,
        dataType: 'json',
        success: function(data) {
          delete _this._requests[mode];
          return _this.state.setAccidents(mode, data);
        }
      });
    };

    return AccidentFinder;

  })();

  ChartSeriesMaker = (function() {

    function ChartSeriesMaker() {
      this.data = {};
    }

    ChartSeriesMaker.prototype.add = function(year) {
      var y, _base;
      y = year.toString();
      (_base = this.data)[y] || (_base[y] = 0);
      return this.data[y] += 1;
    };

    ChartSeriesMaker.prototype.getSeries = function() {
      var k, v, _ref, _results;
      _ref = this.data;
      _results = [];
      for (k in _ref) {
        v = _ref[k];
        _results.push([+k, v]);
      }
      return _results;
    };

    return ChartSeriesMaker;

  })();

  show_accidents_dialog = function(state, onlyIds) {
    var $div, $p, $tr, accidents, id, render_table, theseAre, _i, _len;
    this.state = state;
    if (onlyIds == null) onlyIds = void 0;
    render_table = function() {
      var $table, $tbody, $tds, $th, $theadTr, $tr, accident, accidents, heading, headings, i, key, keys, mode, modeAccidents, text, textNode, trClass, value, _i, _len, _len2, _len3, _ref, _ref2, _ref3;
      accidents = [];
      _ref = state.accidents;
      for (mode in _ref) {
        modeAccidents = _ref[mode];
        accidents = accidents.concat(modeAccidents);
      }
      if (!(accidents.length > 0)) return;
      $table = $('<table><thead><tr><th class="id">ID</th><th class="distance_along_path">Odometer</th></tr></thead><tbody></tbody></table>');
      headings = [];
      _ref2 = accidents[0];
      for (heading in _ref2) {
        value = _ref2[heading];
        if (heading === 'id') continue;
        if (heading === 'distance_along_path') continue;
        if (heading === 'Time') continue;
        if (state.city !== 'Toronto') {
          if (heading === 'Latitude') continue;
          if (heading === 'Longitude') continue;
        }
        headings.push(heading);
      }
      headings.sort();
      headings.unshift('Time');
      keys = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = headings.length; _i < _len; _i++) {
          heading = headings[_i];
          _results.push(heading.toLowerCase().replace(/\s/g, '-'));
        }
        return _results;
      })();
      keys.unshift('distance_along_path');
      keys.unshift('id');
      $theadTr = $table.find('thead').children();
      for (i = 0, _len = headings.length; i < _len; i++) {
        heading = headings[i];
        $th = $('<th></th>');
        $th.attr('class', keys[i + 2]);
        $th.text(heading);
        $theadTr.append($th);
      }
      $tbody = $table.find('tbody');
      trClass = 'odd';
      _ref3 = state.accidents;
      for (mode in _ref3) {
        modeAccidents = _ref3[mode];
        for (_i = 0, _len2 = modeAccidents.length; _i < _len2; _i++) {
          accident = modeAccidents[_i];
          $tr = $(("<tr class=\"" + mode + "\">") + [
            (function() {
              var _j, _len3, _results;
              _results = [];
              for (_j = 0, _len3 = keys.length; _j < _len3; _j++) {
                key = keys[_j];
                _results.push('<td></td>');
              }
              return _results;
            })()
          ].join('') + '</tr>');
          $tr.attr('class', trClass);
          $tr.attr('class', "accident-" + accident.id);
          $tr.attr('id', "accident-" + mode + "-" + accident.id);
          $tds = $tr.children();
          if (trClass === 'odd') {
            trClass = 'even';
          } else {
            trClass = 'odd';
          }
          for (i = 0, _len3 = keys.length; i < _len3; i++) {
            key = keys[i];
            heading = headings[i - 2];
            $tds[i].className = key;
            text = accident[heading] || accident[key];
            if (key === 'distance_along_path') {
              text = "" + text + "m (" + mode + ")";
            }
            textNode = document.createTextNode(text || '');
            $tds[i].appendChild(textNode);
          }
          $tbody.append($tr);
        }
      }
      $table.on('dblclick', function(e) {
        return selectText($dataDiv[0]);
      });
      return $table;
    };
    $div = $('<div id="data-dialog"><p class="blurb">Data geeks, this is for you. Here is our raw data: every detail we know about the accidents you found. We\'ve hidden addresses to save space, but you\'ll see them if you copy this data and paste it somewhere else. The more ambitious among you may see and download <a target="_blank" href="https://github.com/adamhooper/openroad/data">our entire datasets</a>, too.</p><div id="data-dialog-inner"></div></div>');
    $div.find('#data-dialog-inner').append(render_table());
    if ((onlyIds != null) && onlyIds.length > 0) {
      $div.find('table').addClass('with-highlights');
      for (_i = 0, _len = onlyIds.length; _i < _len; _i++) {
        id = onlyIds[_i];
        $tr = $div.find("tr.accident-" + id);
        $tr.addClass('highlighted');
        $tr.show();
      }
      theseAre = onlyIds.length === 1 && 'This is' || 'These are';
      accidents = onlyIds.length === 1 && 'accident' || 'accidents';
      $p = $("<p>" + theseAre + " just the " + accidents + " you clicked. You may also see <a href=\"#\">all accidents along your route</a>.</p>");
      $div.append($p);
      $p.find('a').on('click', function(e) {
        e.preventDefault();
        $div.find('table').removeClass('with-highlights');
        return $p.remove();
      });
    }
    return $div.dialog({
      buttons: [
        {
          text: 'Close',
          click: function() {
            $(this).dialog('destroy');
            return $div.remove();
          }
        }
      ],
      dialogClass: 'dialog-accident-data',
      draggable: false,
      modal: true,
      resizable: false,
      position: 'center',
      title: 'Detailed accident reports',
      width: $(window).width() * 0.9,
      height: $(window).height() * 0.9
    });
  };

  AccidentsTableRenderer = (function() {

    function AccidentsTableRenderer(state, link) {
      var _this = this;
      this.state = state;
      $(link).on('click', function(e) {
        e.preventDefault();
        return show_accidents_dialog(_this.state);
      });
    }

    return AccidentsTableRenderer;

  })();

  TrendChartRenderer = (function() {

    function TrendChartRenderer(state, link) {
      var _this = this;
      this.state = state;
      $(link).on('click', function(e) {
        var $div;
        e.preventDefault();
        $div = _this.renderChartContainer();
        $div.dialog({
          buttons: [
            {
              text: 'Close',
              click: function() {
                $(this).dialog('destroy');
                return $div.remove();
              }
            }
          ],
          dialogClass: 'dialog-accidents-by-year',
          draggable: false,
          modal: true,
          resizable: false,
          position: 'center',
          title: 'Accidents per year along your route',
          width: $(window).width() * 0.8,
          height: $(window).height() * 0.8
        });
        return window.setTimeout(function() {
          return _this.renderChartInChartContainer($div);
        }, 50);
      });
    }

    TrendChartRenderer.prototype.renderChartContainer = function() {
      return $('<div id="chart-dialog"><p class="blurb">Is there a trend along your route? Many events can correlate: construction, a new bike lane, more attentive police or dumb luck. Here we show, for each year, the number of reported collisions between car and bike.</p><div id="chart-dialog-inner"></div></div>');
    };

    TrendChartRenderer.prototype._modeToColor = function(mode) {
      return COLORS[mode];
    };

    TrendChartRenderer.prototype.renderChartInChartContainer = function($div) {
      var accident, accidentTickInterval, accidents, color, innerId, maxAccidents, mode, modeSeries, plotSeries, plotSeriesOptions, series, seriesEntry, seriesMaker, tuple, yearTickInterval, _i, _j, _len, _len2, _ref;
      series = {};
      _ref = this.state.accidents;
      for (mode in _ref) {
        accidents = _ref[mode];
        seriesMaker = new ChartSeriesMaker();
        for (_i = 0, _len = accidents.length; _i < _len; _i++) {
          accident = accidents[_i];
          seriesMaker.add(accident.Time.split(/-/)[0]);
        }
        series[mode] = seriesMaker.getSeries();
      }
      maxAccidents = 1;
      for (mode in series) {
        modeSeries = series[mode];
        for (_j = 0, _len2 = modeSeries.length; _j < _len2; _j++) {
          tuple = modeSeries[_j];
          if (tuple[1] > maxAccidents) maxAccidents = tuple[1];
        }
      }
      plotSeries = [];
      plotSeriesOptions = [];
      for (mode in series) {
        seriesEntry = series[mode];
        color = this._modeToColor(mode);
        plotSeries.push(seriesEntry);
        plotSeriesOptions.push({
          color: color,
          label: mode.substring(0, 1).toUpperCase() + mode.substring(1)
        });
      }
      innerId = $div.children('div').attr('id');
      yearTickInterval = Math.floor((this.state.maxYear - this.state.minYear + 1) / 10) + 1;
      accidentTickInterval = Math.floor(maxAccidents / 10) + 1;
      return $.jqplot(innerId, plotSeries, {
        highlighter: {
          show: true,
          sizeAdjust: 12
        },
        cursor: {
          show: false
        },
        axes: {
          xaxis: {
            min: this.state.minYear - 1,
            max: this.state.maxYear,
            tickInterval: yearTickInterval,
            showTickMarks: false,
            tickOptions: {
              showGridline: false,
              showMark: false
            }
          },
          yaxis: {
            min: 0,
            tickInterval: accidentTickInterval,
            showTickMarks: false,
            tickOptions: {
              showMark: false
            }
          }
        },
        grid: {
          gridLineColor: 'white',
          background: '#f9f298',
          shadow: false,
          borderWidth: 0
        },
        seriesDefaults: {
          shadow: false,
          markerOptions: {
            size: 12,
            shadow: false
          }
        },
        series: plotSeriesOptions,
        legend: {
          show: this.state.mode === 'both',
          location: 'sw'
        }
      });
    };

    return TrendChartRenderer;

  })();

  AccidentsMarkerRenderer = (function() {

    function AccidentsMarkerRenderer(state, map) {
      var _this = this;
      this.state = state;
      this.map = map;
      this.markerArrays = {};
      this.markers = [];
      this.clusterer = this._createClusterer();
      this.state.onChange('accidents', function() {
        return _this.refresh();
      });
      this.state.onChange('mode', function() {
        return _this.refresh();
      });
      google.maps.event.addListener(this.clusterer, 'click', function(cluster) {
        var marker;
        return show_accidents_dialog(_this.state, (function() {
          var _i, _len, _ref, _results;
          _ref = cluster.getMarkers();
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            marker = _ref[_i];
            _results.push(marker.accidentUniqueKey);
          }
          return _results;
        })());
      });
    }

    AccidentsMarkerRenderer.prototype._createClusterer = function() {
      var calculateMarkerStyleIndex, clusterUrlRoot, iconStyles;
      iconStyles = [];
      clusterUrlRoot = "" + window.location.protocol + "//" + window.location.host + (window.location.pathname.replace(/[^\/]*$/, '')) + "/icons";
      calculateMarkerStyleIndex = function(markers, nIconStyles) {
        var text;
        text = "" + markers.length;
        if (markers.length === 1) text = ' ';
        return {
          text: text,
          index: 1
        };
      };
      iconStyles = [
        {
          width: 18,
          height: 18,
          textSize: 10,
          textColor: '#000000',
          url: "" + clusterUrlRoot + "/marker-accident.png"
        }
      ];
      return new MarkerClusterer(this.map, [], {
        averageCenter: true,
        gridSize: 13,
        styles: iconStyles,
        calculator: calculateMarkerStyleIndex,
        minimumClusterSize: 1,
        printable: true,
        zoomOnClick: false
      });
    };

    AccidentsMarkerRenderer.prototype._createMarkerArray = function(mode, accidents) {
      var accident, arr, latLng, latitude, longitude, marker, _i, _len;
      arr = [];
      for (_i = 0, _len = accidents.length; _i < _len; _i++) {
        accident = accidents[_i];
        latitude = accident.Latitude;
        longitude = accident.Longitude;
        latLng = new google.maps.LatLng(latitude, longitude);
        marker = new google.maps.Marker({
          position: latLng,
          flat: true
        });
        marker.accidentUniqueKey = "" + accident.id;
        arr.push(marker);
      }
      return arr;
    };

    AccidentsMarkerRenderer.prototype._refreshMarkerModes = function() {
      var accidentKeyToMode, key, marker, markers, mode, _, _i, _len, _ref, _ref2, _results;
      accidentKeyToMode = {};
      _ref = this.markerArrays;
      for (mode in _ref) {
        markers = _ref[mode];
        for (_i = 0, _len = markers.length; _i < _len; _i++) {
          marker = markers[_i];
          key = marker.accidentUniqueKey;
          if ((accidentKeyToMode[key] != null) && accidentKeyToMode[key] !== mode) {
            accidentKeyToMode[key] = 'both';
          } else {
            accidentKeyToMode[key] = mode;
          }
        }
      }
      _ref2 = this.markerArrays;
      _results = [];
      for (_ in _ref2) {
        markers = _ref2[_];
        _results.push((function() {
          var _j, _len2, _results2;
          _results2 = [];
          for (_j = 0, _len2 = markers.length; _j < _len2; _j++) {
            marker = markers[_j];
            key = marker.accidentUniqueKey;
            _results2.push(marker.accidentPath = accidentKeyToMode[key]);
          }
          return _results2;
        })());
      }
      return _results;
    };

    AccidentsMarkerRenderer.prototype.refresh = function() {
      var marker, markerKeys, mode, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3;
      this.clusterer.removeMarkers(this.markers, true);
      this.markers = [];
      _ref = ['bicycling', 'driving'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        mode = _ref[_i];
        if ((this.state.accidents[mode] != null) && (this.state.mode === 'both' || this.state.mode === mode)) {
          if (!(this.markerArrays[mode] != null)) {
            this.markerArrays[mode] = this._createMarkerArray(mode, this.state.accidents[mode]);
          }
        } else {
          if (this.markerArrays[mode] != null) delete this.markerArrays[mode];
        }
      }
      this._refreshMarkerModes();
      markerKeys = {};
      _ref2 = ['bicycling', 'driving'];
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        mode = _ref2[_j];
        if (!(this.markerArrays[mode] != null)) continue;
        _ref3 = this.markerArrays[mode];
        for (_k = 0, _len3 = _ref3.length; _k < _len3; _k++) {
          marker = _ref3[_k];
          if (!(markerKeys[marker.accidentUniqueKey] != null)) {
            markerKeys[marker.accidentUniqueKey] = true;
            this.markers.push(marker);
          }
        }
      }
      this.clusterer.addMarkers(this.markers, true);
      return this.clusterer.repaint();
    };

    return AccidentsMarkerRenderer;

  })();

  WorstLocationsRenderer = (function() {

    function WorstLocationsRenderer(state, div, map) {
      var _this = this;
      this.state = state;
      this.div = div;
      this.map = map;
      this.topGroupsByMode = {};
      this.maxLocations = 3;
      this.markers = [];
      this.state.onChange('accidents', function() {
        return _this.refresh();
      });
      this.state.onChange('mode', function() {
        return _this.refresh();
      });
    }

    WorstLocationsRenderer.prototype._accidentsToTopGroups = function(accidents) {
      var a, accident, d, distance_along_path, i, objs, results, sorted, topGroup, _i, _j, _len, _len2, _len3, _ref, _ref2, _ref3, _ref4, _ref5;
      objs = [];
      results = [];
      for (_i = 0, _len = accidents.length; _i < _len; _i++) {
        accident = accidents[_i];
        distance_along_path = +('' + accident.distance_along_path).replace(/[^\d]*/g, '');
        for (d = _ref = distance_along_path - WORST_ACCIDENT_RADIUS, _ref2 = distance_along_path + WORST_ACCIDENT_RADIUS; _ref <= _ref2 ? d <= _ref2 : d >= _ref2; _ref <= _ref2 ? d++ : d--) {
          if (d < 0) continue;
          objs[d] || (objs[d] = []);
          objs[d].push(accident);
        }
      }
      sorted = objs.slice();
      while (results.length < this.maxLocations) {
        sorted.sort(function(a, b) {
          return b.length - a.length;
        });
        if (sorted.length === 0 || sorted[0].length === 0) break;
        topGroup = sorted[0].slice();
        results.push(topGroup);
        for (_j = 0, _len2 = topGroup.length; _j < _len2; _j++) {
          accident = topGroup[_j];
          distance_along_path = +('' + accident.distance_along_path).replace(/[^\d]*/g, '');
          for (d = _ref3 = distance_along_path - WORST_ACCIDENT_RADIUS, _ref4 = distance_along_path + WORST_ACCIDENT_RADIUS; _ref3 <= _ref4 ? d <= _ref4 : d >= _ref4; _ref3 <= _ref4 ? d++ : d--) {
            if (d < 0 || d >= objs.length) continue;
            _ref5 = objs[d];
            for (i = 0, _len3 = _ref5.length; i < _len3; i++) {
              a = _ref5[i];
              if (a.distance_along_path === accident.distance_along_path) {
                objs[d].splice(i, 1);
                break;
              }
            }
          }
        }
      }
      return results;
    };

    WorstLocationsRenderer.prototype._getActiveModes = function() {
      if (this.state.mode === 'both') {
        return ['bicycling', 'driving'];
      } else {
        return [this.state.mode];
      }
    };

    WorstLocationsRenderer.prototype._getTopSpots = function() {
      var accident, idToSpot, mode, topGroup, topSpot, topSpots, _i, _j, _k, _l, _len, _len2, _len3, _len4, _len5, _m, _ref, _ref2;
      idToSpot = {};
      topSpots = [];
      _ref = this._getActiveModes();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        mode = _ref[_i];
        if (this.topGroupsByMode[mode] == null) continue;
        _ref2 = this.topGroupsByMode[mode];
        for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
          topGroup = _ref2[_j];
          topSpot = void 0;
          for (_k = 0, _len3 = topGroup.length; _k < _len3; _k++) {
            accident = topGroup[_k];
            if (idToSpot[accident.id] != null) {
              topSpot = idToSpot[accident.id];
              topSpot.mode = 'both';
              break;
            }
          }
          if (!(topSpot != null)) {
            topSpot = {
              mode: mode,
              accidents: []
            };
            topSpots.push(topSpot);
          }
          for (_l = 0, _len4 = topGroup.length; _l < _len4; _l++) {
            accident = topGroup[_l];
            if (!(idToSpot[accident.id] != null)) {
              idToSpot[accident.id] = topSpot;
              topSpot.accidents.push(accident);
            }
          }
        }
      }
      topSpots.sort(function(a, b) {
        return b.length - a.length;
      });
      topSpots = topSpots.slice(0, 3);
      for (_m = 0, _len5 = topSpots.length; _m < _len5; _m++) {
        topSpot = topSpots[_m];
        this._fillLocation(topSpot);
      }
      return topSpots;
    };

    WorstLocationsRenderer.prototype._fillLocation = function(topSpot) {
      var accident, sumLatitude, sumLongitude, _i, _len, _ref;
      sumLatitude = 0;
      sumLongitude = 0;
      _ref = topSpot.accidents;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        accident = _ref[_i];
        sumLatitude += accident.Latitude;
        sumLongitude += accident.Longitude;
      }
      topSpot.Latitude = sumLatitude / topSpot.accidents.length;
      return topSpot.Longitude = sumLongitude / topSpot.accidents.length;
    };

    WorstLocationsRenderer.prototype._getHeadingString = function(topSpots) {
      var locations, routes;
      locations = topSpots.length === 1 && 'location' || 'locations';
      routes = (this.topGroupsByMode.bicycling != null) && (this.topGroupsByMode.driving != null) && 'routes' || 'route';
      return "Most accident-prone " + locations + " along your " + routes;
    };

    WorstLocationsRenderer.prototype._getTopSpotString = function(topSpot) {
      var accidents;
      accidents = topSpot.accidents.length === 1 && 'accident' || 'accidents';
      if (topSpot.mode === 'both') {
        return "" + topSpot.accidents.length + " " + accidents + " along your driving and bicycling routes";
      } else {
        return "" + topSpot.accidents.length + " " + accidents + " along your " + topSpot.mode + " route";
      }
    };

    WorstLocationsRenderer.prototype._getGeocoder = function() {
      return this.geocoder || (this.geocoder = new google.maps.Geocoder());
    };

    WorstLocationsRenderer.prototype._geocoderResultsToAddress = function(results) {
      var result, type, _i, _j, _len, _len2, _ref;
      _ref = ['intersection', 'bus_station', 'transit_station', 'neighborhood'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        type = _ref[_i];
        for (_j = 0, _len2 = results.length; _j < _len2; _j++) {
          result = results[_j];
          if (__indexOf.call(result.types, type) >= 0) {
            return result.formatted_address.split(/,/)[0];
          }
        }
      }
      return results[0].formatted_address.split(/,/)[0];
    };

    WorstLocationsRenderer.prototype._renderTopSpot = function(topSpot) {
      var $html,
        _this = this;
      $html = $('<li><div class="image-container"><img src="" alt="" /></div><div class="address"></div><div class="count"></div></li>');
      $html.find('.address').text("" + topSpot.Latitude + "," + topSpot.Longitude);
      $html.find('.count').text(this._getTopSpotString(topSpot));
      this._getGeocoder().geocode({
        latLng: new google.maps.LatLng(topSpot.Latitude, topSpot.Longitude)
      }, function(results, status) {
        var address;
        if (status === google.maps.GeocoderStatus.OK) {
          address = _this._geocoderResultsToAddress(results);
          return $html.find('.address').text(address);
        }
      });
      window.setTimeout(function() {
        var $img, url;
        $img = $html.find('img');
        url = "http://maps.googleapis.com/maps/api/streetview?sensor=false&size=" + ($img.width()) + "x" + ($img.height()) + "&location=" + topSpot.Latitude + "," + topSpot.Longitude;
        return $img.attr('src', url);
      }, 50);
      return $html;
    };

    WorstLocationsRenderer.prototype._fillDiv = function(topSpots) {
      var $div, $h2, $li, $ul, h2String, i, topSpot, _len;
      $div = $(this.div);
      $div.empty();
      if (!topSpots.length) {
        $div.hide();
        return;
      }
      h2String = this._getHeadingString(topSpots);
      $h2 = $('<h2></h2>');
      $h2.text(h2String);
      $div.append($h2);
      $ul = $('<ul></ul>');
      for (i = 0, _len = topSpots.length; i < _len; i++) {
        topSpot = topSpots[i];
        $li = this._renderTopSpot(topSpot, i);
        $li.addClass("top-spot-" + i);
        $ul.append($li);
      }
      $div.append($ul);
      return $div.show();
    };

    WorstLocationsRenderer.prototype._topSpotsToMarkers = function(topSpots) {
      var marker, markers, max, topSpot, _i, _len;
      markers = [];
      if (!topSpots.length) return [];
      max = topSpots[0].accidents.length;
      for (_i = 0, _len = topSpots.length; _i < _len; _i++) {
        topSpot = topSpots[_i];
        if (topSpot.accidents.length !== max) break;
        marker = new google.maps.Marker({
          clickable: false,
          flat: true,
          optimized: false,
          position: new google.maps.LatLng(topSpot.Latitude, topSpot.Longitude),
          icon: new google.maps.MarkerImage('./icons/marker-top-spot.png', new google.maps.Size(37, 28), void 0, new google.maps.Point(19, 14)),
          title: 'Accident-prone location'
        });
        markers.push(marker);
      }
      return markers;
    };

    WorstLocationsRenderer.prototype.refresh = function() {
      var changed, marker, mode, topSpots, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3, _results;
      changed = false;
      _ref = ['bicycling', 'driving'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        mode = _ref[_i];
        if ((this.state.accidents[mode] != null) && (this.state.mode === 'both' || this.state.mode === mode)) {
          if (!(this.topGroupsByMode[mode] != null)) {
            this.topGroupsByMode[mode] = this._accidentsToTopGroups(this.state.accidents[mode]);
            changed = true;
          }
        } else {
          if (this.topGroupsByMode[mode] != null) {
            delete this.topGroupsByMode[mode];
            changed = true;
          }
        }
      }
      if (changed) {
        _ref2 = this.markers;
        for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
          marker = _ref2[_j];
          marker.setMap(null);
        }
        topSpots = this._getTopSpots();
        this._fillDiv(topSpots);
        this.markers = this._topSpotsToMarkers(topSpots);
        _ref3 = this.markers;
        _results = [];
        for (_k = 0, _len3 = _ref3.length; _k < _len3; _k++) {
          marker = _ref3[_k];
          _results.push(marker.setMap(this.map));
        }
        return _results;
      }
    };

    return WorstLocationsRenderer;

  })();

  keepMapInStateBounds = function(map, state) {
    var extendMapBoundsToFitPosition, fitMapToCityBounds, key, _i, _len, _ref, _results;
    fitMapToCityBounds = function(city) {
      var cityData, latLng;
      cityData = CITIES[city];
      latLng = new google.maps.LatLng(cityData.latitude, cityData.longitude);
      map.setCenter(latLng);
      return map.setZoom(cityData.zoom);
    };
    state.onChange('city', function(city) {
      return fitMapToCityBounds(city);
    });
    fitMapToCityBounds(state.city);
    extendMapBoundsToFitPosition = function(latLng) {
      var bounds;
      bounds = map.getBounds();
      if (!bounds.contains(latLng)) {
        bounds.extend(latLng);
        return map.fitBounds(bounds);
      }
    };
    _ref = ['origin', 'destination'];
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      key = _ref[_i];
      state.onChange(key, function(position) {
        if (position != null) return extendMapBoundsToFitPosition(position);
      });
      if (state[key] != null) {
        _results.push(extendMapBoundsToFitPosition(state[key]));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  syncOriginDestinationMarkers = function(state, map) {
    var key, keys, markers, movedByUs, sync, _i, _len;
    keys = ['origin', 'destination'];
    markers = {};
    movedByUs = false;
    sync = function(key, position) {
      if (movedByUs) return;
      if (position != null) {
        markers[key].setPosition(position);
        return markers[key].setMap(map);
      } else {
        return markers[key].setMap(null);
      }
    };
    for (_i = 0, _len = keys.length; _i < _len; _i++) {
      key = keys[_i];
      markers[key] = new google.maps.Marker({
        clickable: false,
        draggable: true,
        flat: true,
        icon: new google.maps.MarkerImage("icons/marker-" + key + ".png"),
        title: key === 'origin' && 'Start point' || 'End point'
      });
      google.maps.event.addListener(markers[key], 'dragstart', function() {
        return state.freeze('routes');
      });
      google.maps.event.addListener(markers[key], 'dragend', function() {
        return state.thaw('routes');
      });
    }
    google.maps.event.addListener(markers.origin, 'position_changed', function() {
      movedByUs = true;
      state.setOrigin(markers.origin.getPosition());
      return movedByUs = false;
    });
    google.maps.event.addListener(markers.destination, 'position_changed', function() {
      movedByUs = true;
      state.setDestination(markers.destination.getPosition());
      return movedByUs = false;
    });
    state.onChange('origin', function(position) {
      return sync('origin', position);
    });
    state.onChange('destination', function(position) {
      return sync('destination', position);
    });
    sync('origin', state.origin);
    return sync('destination', state.destination);
  };

  Manager = (function() {

    function Manager(map, state, chartLink, dataLink, worstLocationsDiv) {
      new RouteFinder(state);
      new RouteRenderer(state, map);
      new AccidentFinder(state);
      new AccidentsMarkerRenderer(state, map);
      if (chartLink != null) new TrendChartRenderer(state, chartLink);
      if (dataLink != null) new AccidentsTableRenderer(state, dataLink);
      new WorstLocationsRenderer(state, worstLocationsDiv, map);
      keepMapInStateBounds(map, state);
      syncOriginDestinationMarkers(state, map);
    }

    return Manager;

  })();

  window.Manager = Manager;

  _address_form_abort_clicking_on_map = void 0;

  $.fn.address_form = function(originOrDestination, state, map, callback) {
    var $a, $error, $form, $input, $status, aPointString, aText, geocoder, get, getCityBounds, handleGeocoderResult, handleReverseGeocoderResult, lastAddressTyped, lookupLatLng, maybeLookupAddress, onTypeAddress, property, set, setByGeocoder, setError, setStatus, setter;
    if (callback == null) callback = void 0;
    property = originOrDestination;
    setByGeocoder = false;
    setter = originOrDestination === 'origin' && 'setOrigin' || 'setDestination';
    aPointString = originOrDestination === 'origin' && 'a start point' || 'an end point';
    $form = $(this);
    $a = $form.find('a');
    aText = $a.text();
    $input = $form.find('input[type=text]');
    $error = $form.find('.error');
    $status = $form.find('.status');
    lastAddressTyped = $input.val();
    geocoder = new google.maps.Geocoder();
    getCityBounds = function() {
      return CITIES[state.city].bounds;
    };
    get = function() {
      return state[property];
    };
    set = function(value) {
      return state[setter](value);
    };
    setStatus = function(status) {
      $status.text(status || '');
      return (status != null) && $status.show() || $status.hide();
    };
    setError = function(error) {
      $error.text(error || '');
      return (error != null) && $error.show() || $error.hide();
    };
    maybeLookupAddress = function() {
      var addressTyped;
      addressTyped = $input.val();
      if (addressTyped === lastAddressTyped) return;
      if ($.trim(addressTyped || '').length > 0) {
        setError(void 0);
        setStatus('Looking up address');
        lastAddressTyped = addressTyped;
        return geocoder.geocode({
          'address': addressTyped,
          'bounds': getCityBounds()
        }, function(results, status) {
          return handleGeocoderResult(results, status);
        });
      }
    };
    handleGeocoderResult = function(results, status) {
      setByGeocoder = true;
      setStatus(void 0);
      if (status === google.maps.GeocoderStatus.ZERO_RESULTS || (status === google.maps.GeocoderStatus.OK && !getCityBounds().contains(results[0].geometry.location))) {
        setError('Not found');
        set(null);
      } else if (status === google.maps.GeocoderStatus.OK) {
        set(results[0].geometry.location);
        if (typeof callback === "function") callback();
        true;
      } else {
        setError('Failed to look up address');
        set(null);
      }
      return setByGeocoder = false;
    };
    lookupLatLng = function(latlng) {
      setError(void 0);
      if (latlng != null) {
        lastAddressTyped = '…';
        $input.val(lastAddressTyped);
        setStatus('Looking up address');
        return geocoder.geocode({
          latLng: latlng
        }, function(results, status) {
          return handleReverseGeocoderResult(results, status);
        });
      } else {
        lastAddressTyped = void 0;
        $input.val('');
        return setStatus(void 0);
      }
    };
    handleReverseGeocoderResult = function(results, status) {
      setStatus(void 0);
      if (status === google.maps.GeocoderStatus.OK) {
        lastAddressTyped = results[0].formatted_address;
      } else {
        lastAddressTyped = '(point on map)';
      }
      return $input.val(lastAddressTyped);
    };
    onTypeAddress = function(e) {
      e.preventDefault();
      if (typeof _address_form_abort_clicking_on_map === "function") {
        _address_form_abort_clicking_on_map();
      }
      _address_form_abort_clicking_on_map = void 0;
      return maybeLookupAddress();
    };
    $form.on('submit', onTypeAddress);
    $input.on('blur', onTypeAddress);
    $a.on('click', function(e) {
      var mapListener;
      e.preventDefault();
      if (typeof _address_form_abort_clicking_on_map === "function") {
        _address_form_abort_clicking_on_map();
      }
      _address_form_abort_clicking_on_map = void 0;
      if ($a.hasClass('clicking')) {
        $a.removeClass('clicking');
        return;
      }
      mapListener = google.maps.event.addListenerOnce(map, 'click', function(e) {
        _address_form_abort_clicking_on_map();
        set(e.latLng);
        if (typeof callback === "function") callback();
        return true;
      });
      _address_form_abort_clicking_on_map = function() {
        google.maps.event.removeListener(mapListener);
        $a.text(aText);
        return $a.removeClass('clicking');
      };
      $a.text("click " + aPointString + " on the map");
      return $a.addClass('clicking');
    });
    return state.onChange(originOrDestination, function(position) {
      if (setByGeocoder) return;
      return lookupLatLng(position);
    });
  };

  $.fn.mode_form = function(state) {
    return $.each(this, function() {
      var $form;
      $form = $(this);
      $form.on('click change', function(e) {
        var mode, s;
        s = $form.serialize();
        mode = s.split(/[=]/)[1];
        return state.setMode(mode);
      });
      return state.onChange('mode', function() {
        var $input;
        $input = $form.find("input[value=" + state.mode + "]");
        $form.find('label').removeClass('selected');
        $input.attr('checked', 'checked');
        return $input.closest('label').addClass('selected');
      });
    });
  };

  $.fn.year_range_slider = function(state) {
    var getRange, getSelectedRange, init, updateState, updateText,
      _this = this;
    getRange = function() {
      var city;
      city = CITIES[state.city];
      return [city.minYear, city.maxYear];
    };
    getSelectedRange = function() {
      return [state.minYear, state.maxYear];
    };
    init = function() {
      var range;
      range = getRange();
      return $(_this).slider({
        min: getRange()[0],
        max: getRange()[1],
        range: true,
        values: getSelectedRange(),
        animate: true
      });
    };
    updateState = function() {
      var maxYear, minYear;
      minYear = $(_this).slider('values', 0);
      maxYear = $(_this).slider('values', 1);
      state.setMinYear(minYear);
      return state.setMaxYear(maxYear);
    };
    updateText = function() {
      var selectedRange, text;
      selectedRange = getSelectedRange();
      if (selectedRange[0] === selectedRange[1]) {
        text = "" + selectedRange[0];
      } else {
        text = "" + selectedRange[0] + "–" + selectedRange[1];
      }
      return $(_this).next().text(text);
    };
    state.onChange('minYear', function(year) {
      if (year !== $(_this).slider('values', 0)) {
        updateText();
        return $(_this).slider('values', 0, year);
      }
    });
    state.onChange('maxYear', function(year) {
      if (year !== $(_this).slider('values', 1)) {
        updateText();
        return $(_this).slider('values', 1, year);
      }
    });
    state.onChange('city', function(city) {
      $(_this).slider('destroy');
      return init();
    });
    $(this).on('slidechange', function() {
      updateState();
      return updateText();
    });
    init();
    return updateText();
  };

}).call(this);
