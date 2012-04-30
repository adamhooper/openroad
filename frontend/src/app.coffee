URL = 'http://localhost:8000/%{city}'
DEFAULT_MIN_YEAR = 2007
DEFAULT_MAX_YEAR = 2011

COLORS = {
  driving: '#0e3b5d',
  bicycling: '#a73438',
  both: '#f9f298',
}

CITIES = {
  vancouver: {
    latitude: 49.2505,
    longitude: -123.1119,
    zoom: 12,
    minYear: 2006,
    maxYear: 2010,
    fusionTableId: 3731863,
    bounds: new google.maps.LatLngBounds(
      new google.maps.LatLng(49.131859, -123.264954),
      new google.maps.LatLng(49.352188, -122.985718)
    ),
  },
  calgary: {
    latitude: 51.0451,
    longitude: -114.0569,
    zoom: 12,
    minYear: 1996,
    maxYear: 2011,
    fusionTableId: 3733170,
    bounds: new google.maps.LatLngBounds(
      new google.maps.LatLng(50.842941, -114.613968),
      new google.maps.LatLng(51.343868, -113.901817)
    ),
  },
  toronto: {
    latitude: 43.6517,
    longitude: -79.3827,
    zoom: 13,
    minYear: 1986,
    maxYear: 2010,
    fusionTableId: 3733171,
    bounds: new google.maps.LatLngBounds(
      new google.maps.LatLng(43.584740, -79.639297),
      new google.maps.LatLng(43.855419, -79.115623)
    ),
  },
  ottawa: {
    latitude: 45.4214,
    longitude: -75.6919,
    zoom: 13,
    minYear: 2001,
    maxYear: 2010,
    fusionTableId: 3734609,
    bounds: new google.maps.LatLngBounds(
      new google.maps.LatLng(44.962002, -76.355766),
      new google.maps.LatLng(45.536541, -75.246033)
    ),
  },
  montreal: {
    latitude: 45.5081,
    longitude: -73.5550,
    zoom: 13,
    minYear: 2006,
    maxYear: 2010,
    fusionTableId: 3731866,
    bounds: new google.maps.LatLngBounds(
      new google.maps.LatLng(45.413479, -73.976608),
      new google.maps.LatLng(45.704788, -73.476418)
    ),
  },
  halifax: {
    latitude: 44.6479,
    longitude: -63.5744,
    zoom: 13,
    minYear: 2007,
    maxYear: 2010,
    fusionTableId: 3733175,
    bounds: new google.maps.LatLngBounds(
      new google.maps.LatLng(44.434570, -64.237190),
      new google.maps.LatLng(45.276489, -62.160469)
    ),
  },
}

WORST_ACCIDENT_RADIUS = 7 # metres.
# Two accidents can be double this apart and count as one location.


# Monkey-patch MarkerClusterer to stay above DirectionsRenderer
originalClusterIconCreateCss = ClusterIcon.prototype.createCss
ClusterIcon.prototype.createCss = (pos) ->
  style = originalClusterIconCreateCss.call(this, pos)
  "#{style} z-index: 2000;"

selectText = (element) ->
  if document.body.createTextRange?
    range = document.body.createTextRange()
    range.moveToElementText(element)
    range.select()
  else if window.getSelection?
    selection = window.getSelection()
    range = document.createRange()
    range.selectNodeContents(element)
    selection.removeAllRanges()
    selection.addRange(range)

class State
  constructor: (options = {}) ->
    @city = options.city || 'toronto'
    @mode = 'bicycling'
    @origin = options.origin
    @destination = options.destination
    @minYear = this._clampYear('min', options.minYear || DEFAULT_MIN_YEAR)
    @maxYear = this._clampYear('max', options.maxYear || DEFAULT_MAX_YEAR)
    @routes = {} # keyed by 'bicycling' and 'driving'
    @accidents = {} # keyed by 'bicycling' and 'driving'
    @listeners = {}
    @frozen = {}
    @entireCity = false
    # @routes is always set before @accidents

  onChange: (key, callback) ->
    @listeners[key] ||= []
    @listeners[key].push(callback)

  # Delay running onChange callbacks on this key until thaw()
  freeze: (key) ->
    @frozen[key] = true if !@frozen[key]?

  # Allow onChange callbacks to run on this key. If the property changed
  # after freeze() was called, run them now.
  thaw: (key) ->
    return if !@frozen[key]?

    if @frozen[key] is true
      delete @frozen[key]
    else
      arg1 = @frozen[key][0]
      delete @frozen[key]
      this._changed(key, arg1)

  _changed: (key, arg1 = undefined) ->
    if @frozen[key]?
      @frozen[key] = [ arg1 ]
    else
      callbacks = @listeners[key] || []
      for callback in callbacks
        callback(arg1)

  setCity: (city) ->
    return if @city == city
    this.clearAccidents()
    this.clearRoutes()
    this.setDestination(undefined)
    this.setOrigin(undefined)
    this.setEntireCity(false)
    @city = city
    # clamp date range
    this.setMinYear(@minYear)
    this.setMaxYear(@maxYear)
    this._changed('city', @city)

  setMode: (mode) ->
    return if @mode == mode
    @mode = mode
    this._changed('mode', @mode)
    this.setEntireCity(false)

  setOrigin: (latlng) ->
    return if latlng == @origin
    this.clearAccidents()
    this.clearRoutes()
    this.setEntireCity(false)
    @origin = latlng
    this._changed('origin', @origin)

  setDestination: (latlng) ->
    return if latlng == @destination
    this.clearAccidents()
    this.clearRoutes()
    this.setEntireCity(false)
    @destination = latlng
    this._changed('destination', @destination)

  _clampYear: (minOrMax, year) ->
    property = "#{minOrMax}Year" # minYear or maxYear
    clamp = CITIES[@city][property]
    return clamp if !year
    return clamp if minOrMax == 'min' && year < clamp
    return clamp if minOrMax == 'max' && year > clamp
    year

  setMinYear: (year) ->
    clampedYear = this._clampYear('min', year)
    if clampedYear != @minYear
      this.clearAccidents()
      @minYear = clampedYear
      this._changed('minYear', @minYear)

  setMaxYear: (year) ->
    clampedYear = this._clampYear('max', year)
    if clampedYear != @maxYear
      this.clearAccidents()
      @maxYear = clampedYear
      this._changed('maxYear', @maxYear)

  setRoute: (key, directions) ->
    if @accidents[key]?
      delete @accidents[key]
      this._changed('accidents', @accidents)

    @routes[key] = directions
    this._changed('routes', @routes)

  clearRoutes: () ->
    @routes = {}
    this._changed('routes', @routes)

  setAccidents: (key, accidents) ->
    @accidents[key] = accidents
    this._changed('accidents', @accidents)

  clearAccidents: () ->
    @accidents = {}
    this._changed('accidents', @accidents)

  setEntireCity: (entireCity) ->
    return if entireCity == @entireCity
    @entireCity = entireCity
    this._changed('entireCity', @entireCity)

window.State = State

class RouteFinder
  constructor: (@state) ->
    @state.onChange('city', () => this.refresh())
    @state.onChange('origin', () => this.refresh())
    @state.onChange('destination', () => this.refresh())
    @state.onChange('mode', () => this.refresh())
    @_activeRequestIds = {}
    @_activeRequestIds[google.maps.TravelMode.BICYCLING] = 0
    @_activeRequestIds[google.maps.TravelMode.DRIVING] = 0

  _getCityBounds: () ->
    CITIES[@state.city].bounds

  _modeToGoogleModes: (mode) ->
    {
      driving: [ google.maps.TravelMode.DRIVING ],
      bicycling: [ google.maps.TravelMode.BICYCLING ],
      both: [ google.maps.TravelMode.BICYCLING, google.maps.TravelMode.DRIVING ],
    }[mode]

  _googleModeToMode: (mode) ->
    if mode == google.maps.TravelMode.DRIVING
      return 'driving'
    else
      return 'bicycling'

  _getDirectionsRequestForMode: (mode) ->
    for googleMode in _modeToGoogleModes(mode)
      this._getDirectionsRequestForGoogleMode(googleMode)

  _getDirectionsRequestForGoogleMode: (googleMode) ->
    {
      origin: @state.origin,
      destination: @state.destination,
      travelMode: googleMode,
      provideRouteAlternatives: false,
      unitSystem: google.maps.UnitSystem.METRIC,
      region: 'ca',
    }

  _getDirectionsService: () ->
    @directionsService ||= new google.maps.DirectionsService()

  refresh: () ->
    if !@state.origin? || !@state.destination?
      @state.clearRoutes()
      return

    for googleMode in this._modeToGoogleModes(@state.mode)
      this._refreshGoogleModeRoute(googleMode)

  _refreshGoogleModeRoute: (googleMode) ->
    mode = this._googleModeToMode(googleMode)
    return if @state.routes[mode]

    service = this._getDirectionsService()
    request = this._getDirectionsRequestForGoogleMode(googleMode)
    requestId = (@_activeRequestIds[googleMode] += 1)
    service.route request, (result, status) =>
      return if @_activeRequestIds[googleMode] != requestId
      return if status != google.maps.DirectionsStatus.OK # FIXME handle error
      @state.setRoute(mode, result)

class RouteRenderer
  constructor: (@state, @map) ->
    @renderers = {}
    @_blockingStateChanges = {}
    for mode in [ 'bicycling', 'driving' ]
      @_blockingStateChanges[mode] = false
      @renderers[mode] = this._createDirectionsRendererForMode(mode, map)

    @state.onChange('routes', () => this.refresh())
    @state.onChange('mode', () => this.refresh())
    @state.onChange('entireCity', () => this.refresh())

  refresh: () ->
    for mode in [ 'bicycling', 'driving' ]
      continue if @_blockingStateChanges[mode]
      route = @state.routes[mode]
      if route && (@state.mode == 'both' || mode == @state.mode)
        @_blockingStateChanges[mode] = true
        @renderers[mode].setDirections(route)
        @renderers[mode].setMap(!@state.entireCity && @map || null)
        @_blockingStateChanges[mode] = false
      else
        @renderers[mode].setMap(null)

  _createDirectionsRendererForMode: (mode) ->
    color = COLORS[mode]

    renderer = new google.maps.DirectionsRenderer({
      draggable: true,
      polylineOptions: { strokeColor: color },
      preserveViewport: true,
      suppressInfoWindows: true,
      suppressMarkers: true,
      suppressBicyclingLayer: true,
    })
    google.maps.event.addListener renderer, 'directions_changed', () =>
      return if @_blockingStateChanges[mode]
      @_blockingStateChanges[mode] = true
      @state.setRoute(mode, renderer.getDirections())
      @_blockingStateChanges[mode] = false
    renderer

class AccidentFinder
  constructor: (@state) ->
    @_requests = {} # mode => ajax
    @state.onChange('routes', () => this.refresh())
    @state.onChange('minYear', () => this.refresh())
    @state.onChange('maxYear', () => this.refresh())

  refresh: () ->
    for mode in (@state.mode != 'both' && [@state.mode] || ['bicycling', 'driving'])
      this._refreshAccidents(mode)

  _refreshAccidents: (mode) ->
    if @_requests[mode]?
      @_requests[mode].abort()
      delete @_requests[mode]

    route = @state.routes[mode]
    return if !route?

    encodedPolyline = route.routes[0].overview_polyline.points
    postData = {
      min_date: "#{@state.minYear}-01-01",
      max_date: "#{@state.maxYear}-12-31",
      encoded_polyline: encodedPolyline
    }
    url = URL.replace(/%\{city}/, @state.city)

    @_requests[mode] = $.ajax({ url: url, type: 'POST', data: postData, dataType: 'json', success: (data) =>
      delete @_requests[mode]
      @state.setAccidents(mode, data)
    })

class ChartSeriesMaker
  constructor: () ->
    @data = {}

  add: (year) ->
    y = year.toString()
    @data[y] ||= 0
    @data[y] += 1

  getSeries: () ->
    ([ +k, v ] for k, v of @data)

show_accidents_dialog = (@state, onlyIds=undefined) ->
  render_table = () ->
    accidents = []
    for mode, modeAccidents of state.accidents
      accidents = accidents.concat(modeAccidents)

    return unless accidents.length > 0

    $table = $('<table><thead><tr><th class="id">ID</th><th class="distance_along_path">Odometer</th></tr></thead><tbody></tbody></table>')

    headings = []

    for heading, value of accidents[0]
      continue if heading == 'id'
      continue if heading == 'distance_along_path'
      continue if heading == 'Time'

      # We can't give Google-provided geocoded data (all cities but Toronto)
      if state.city != 'Toronto'
        continue if heading == 'Latitude'
        continue if heading == 'Longitude'

      headings.push(heading)

    headings.sort()
    headings.unshift('Time')

    keys = ( heading.toLowerCase().replace(/\s/g, '-') for heading in headings )
    keys.unshift('distance_along_path')
    keys.unshift('id')

    $theadTr = $table.find('thead').children()
    for heading, i in headings
      $th = $('<th></th>')
      $th.attr('class', keys[i+2])
      $th.text(heading)
      $theadTr.append($th)

    $tbody = $table.find('tbody')
    trClass = 'odd'

    for mode, modeAccidents of state.accidents
      for accident in modeAccidents
        $tr = $("<tr class=\"#{mode}\">" + ['<td></td>' for key in keys].join('') + '</tr>')
        $tr.attr('class', trClass)
        $tr.attr('class', "accident-#{accident.id}")
        $tr.attr('id', "accident-#{mode}-#{accident.id}")
        $tds = $tr.children()

        if trClass == 'odd' then trClass = 'even' else trClass = 'odd'

        for key, i in keys
          heading = headings[i-2]
          $tds[i].className = key
          text = accident[heading] || accident[key]
          text = "#{text}m (#{mode})" if key == 'distance_along_path'
          textNode = document.createTextNode(text || '')
          $tds[i].appendChild(textNode)

        $tbody.append($tr)

    $table.on 'dblclick', (e) ->
      selectText($table[0])

    $table

  $div = $('<div id="data-dialog"><p class="blurb">Data geeks, this is for you. Here is our raw data: every detail we know about the accidents you found. We\'ve hidden addresses to save space, but you\'ll see them if you copy this data and paste it somewhere else. The more ambitious among you may see and download <a target="_blank" href="https://github.com/adamhooper/openroad/tree/master/data">our entire datasets</a>, too.</p><div id="data-dialog-inner"></div></div>')
  $div.find('#data-dialog-inner').append(render_table())

  if onlyIds? && onlyIds.length > 0
    $div.find('table').addClass('with-highlights')
    for id in onlyIds
      $tr = $div.find("tr.accident-#{id}")
      $tr.addClass('highlighted')
      $tr.show()

    theseAre = onlyIds.length == 1 && 'This is' || 'These are'
    accidents = onlyIds.length == 1 && 'accident' || 'accidents'

    $p = $("<p>#{theseAre} just the #{accidents} you clicked. You may also see <a href=\"#\">all accidents along your route</a>.</p>")
    $div.append($p)
    $p.find('a').on 'click', (e) ->
      e.preventDefault()
      $div.find('table').removeClass('with-highlights')
      $p.remove()

  $div.dialog({
    buttons: [ { text: 'Close', click: () -> $(this).dialog('destroy'); $div.remove() } ],
    dialogClass: 'dialog-accident-data',
    draggable: false,
    modal: true,
    resizable: false,
    position: 'center',
    title: 'Detailed accident reports',
    width: $(window).width() * 0.9,
    height: $(window).height() * 0.9,
  })

class AccidentsTableRenderer
  constructor: (@state, link) ->
    $(link).on 'click', (e) =>
      e.preventDefault()
      show_accidents_dialog(@state)

class TrendChartRenderer
  constructor: (@state, link) ->
    $(link).on 'click', (e) =>
      e.preventDefault()

      $div = this.renderChartContainer()
      $div.dialog({
        buttons: [ { text: 'Close', click: () -> $(this).dialog('destroy'); $div.remove() } ],
        dialogClass: 'dialog-accidents-by-year',
        draggable: false,
        modal: true,
        resizable: false,
        position: 'center',
        title: 'Accidents per year along your route',
        width: $(window).width() * 0.8,
        height: $(window).height() * 0.8,
      })
      window.setTimeout( () =>
        # Need to be positioned first
        this.renderChartInChartContainer($div)
      , 50)

  renderChartContainer: () ->
    $('<div id="chart-dialog"><p class="blurb">Is there a trend along your route? Many events can correlate: construction, a new bike lane, more attentive police or dumb luck. Here we show, for each year, the number of reported collisions between car and bike.</p><div id="chart-dialog-inner"></div></div>')

  _modeToColor: (mode) ->
    COLORS[mode]

  renderChartInChartContainer: ($div) ->
    series = {}
    for mode, accidents of @state.accidents
      seriesMaker = new ChartSeriesMaker()
      for accident in accidents
        seriesMaker.add(accident.Time.split(/-/)[0]) # year
      series[mode] = seriesMaker.getSeries()

    maxAccidents = 1
    for mode, modeSeries of series
      for tuple in modeSeries
        maxAccidents = tuple[1] if tuple[1] > maxAccidents

    plotSeries = []
    plotSeriesOptions = []

    for mode, seriesEntry of series
      color = this._modeToColor(mode)
      plotSeries.push(seriesEntry)
      plotSeriesOptions.push({color: color, label: mode.substring(0, 1).toUpperCase() + mode.substring(1) })

    innerId = $div.children('div').attr('id')

    # No more than 10 ticks horizontally
    yearTickInterval = Math.floor((@state.maxYear - @state.minYear + 1) / 10) + 1

    # No more than 10 ticks vertically
    accidentTickInterval = Math.floor(maxAccidents / 10) + 1

    $.jqplot(innerId, plotSeries, {
      highlighter: {
        show: true,
        sizeAdjust: 12,
      },
      cursor: { show: false },
      axes: {
        xaxis: {
          min: @state.minYear - 1,
          max: @state.maxYear,
          tickInterval: yearTickInterval,
          showTickMarks: false,
          tickOptions: {
            showGridline: false,
            showMark: false,
          },
        },
        yaxis: {
          min: 0,
          tickInterval: accidentTickInterval,
          showTickMarks: false,
          tickOptions: {
            showMark: false,
          },
        },
      },
      grid: {
        gridLineColor: 'white',
        background: '#f9f298',
        shadow: false,
        borderWidth: 0,
      },
      seriesDefaults: {
        shadow: false,
        markerOptions: {
          size: 12,
          shadow: false,
        },
      },
      series: plotSeriesOptions,
      legend: {
        show: (@state.mode == 'both'),
        location: 'sw',
      },
    })

class AccidentsMarkerRenderer
  constructor: (@state, @map) ->
    @markerArrays = {}
    @markers = []
    @clusterer = this._createClusterer()

    @state.onChange('accidents', () => this.refresh())
    @state.onChange('mode', () => this.refresh())
    @state.onChange('entireCity', () => this.refresh())

    google.maps.event.addListener @clusterer, 'click', (cluster) =>
      show_accidents_dialog(@state, ( marker.accidentUniqueKey for marker in cluster.getMarkers() ))

  _createClusterer: () ->
    iconStyles = []

    clusterUrlRoot = "#{window.location.protocol}//#{window.location.host}#{window.location.pathname.replace(/[^\/]*$/, '')}/icons"

    calculateMarkerStyleIndex = (markers, nIconStyles) ->
      text = "#{markers.length}"
      text = ' ' if markers.length == 1
      { text: text, index: 1 }

    iconStyles = [
      {
        width: 18,
        height: 18,
        textSize: 10,
        textColor: '#000000',
        url: "#{clusterUrlRoot}/marker-accident.png",
      }
    ]

    new MarkerClusterer(@map, [], {
      averageCenter: true,
      gridSize: 13,
      styles: iconStyles,
      calculator: calculateMarkerStyleIndex,
      minimumClusterSize: 1,
      printable: true,
      zoomOnClick: false,
    })

  _createMarkerArray: (mode, accidents) ->
    arr = []
    for accident in accidents
      latitude = accident.Latitude
      longitude = accident.Longitude
      latLng = new google.maps.LatLng(latitude, longitude)
      marker = new google.maps.Marker({
        position: latLng,
        flat: true,
      })
      marker.accidentUniqueKey = "#{accident.id}"
      arr.push(marker)

    arr

  _refreshMarkerModes: () ->
    # for each marker, sets marker.accidentPath to 'bicycling', 'driving' or 'both'
    accidentKeyToMode = {}
    for mode, markers of @markerArrays
      for marker in markers
        key = marker.accidentUniqueKey
        if accidentKeyToMode[key]? && accidentKeyToMode[key] != mode
          accidentKeyToMode[key] = 'both'
        else
          accidentKeyToMode[key] = mode

    for _, markers of @markerArrays
      for marker in markers
        key = marker.accidentUniqueKey
        marker.accidentPath = accidentKeyToMode[key]

  refresh: () ->
    @clusterer.removeMarkers(@markers, true)
    @markers = []

    if @state.entireCity
      @markerArrays = {}
      @clusterer.repaint()
      return

    for mode in [ 'bicycling', 'driving' ]
      if @state.accidents[mode]? && (@state.mode == 'both' || @state.mode == mode)
        # There are accidents we want to render
        if !@markerArrays[mode]?
          # And we aren't rendering them
          @markerArrays[mode] = this._createMarkerArray(mode, @state.accidents[mode])
      else
        # There's a lack of accidents to render
        if @markerArrays[mode]?
          # But we're rendering them
          delete @markerArrays[mode]

    this._refreshMarkerModes()

    markerKeys = {}

    for mode in [ 'bicycling', 'driving' ]
      continue if !@markerArrays[mode]?
      for marker in @markerArrays[mode]
        if !markerKeys[marker.accidentUniqueKey]?
          markerKeys[marker.accidentUniqueKey] = true
          @markers.push(marker)

    @clusterer.addMarkers(@markers, true)

    @clusterer.repaint()

class WorstLocationsRenderer
  constructor: (@state, @div, @map) ->
    @topGroupsByMode = {}
    @maxLocations = 3
    @markers = []

    @state.onChange('accidents', () => this.refresh())
    @state.onChange('mode', () => this.refresh())
    @state.onChange('entireCity', () => this.refresh())

  _accidentsToTopGroups: (accidents) ->
    objs = []
    results = []

    # We define a "spot" as a [x-7..x+7] stretch along the "distance_along_path" axis.

    # 1. Calculate all those stretches, in a sparse array of arrays, indexed by meter
    for accident in accidents
      distance_along_path = + ('' + accident.distance_along_path).replace(/[^\d]*/g, '')

      for d in [(distance_along_path - WORST_ACCIDENT_RADIUS) .. (distance_along_path + WORST_ACCIDENT_RADIUS)]
        continue if d < 0
        objs[d] ||= []
        objs[d].push(accident)

    # 2. Calculate results
    # Select the largest slot, and repeat as needed
    sorted = objs.slice()
    while results.length < @maxLocations
      sorted.sort((a, b) -> b.length - a.length)
      break if sorted.length == 0 or sorted[0].length == 0

      topGroup = sorted[0].slice()

      results.push(topGroup)

      # Remove these accidents from our "worst accident spot" contendors
      for accident in topGroup
        distance_along_path = + ('' + accident.distance_along_path).replace(/[^\d]*/g, '')

        for d in [(distance_along_path - WORST_ACCIDENT_RADIUS) .. (distance_along_path + WORST_ACCIDENT_RADIUS)]
          continue if d < 0 || d >= objs.length
          for a, i in objs[d]
            if a.distance_along_path == accident.distance_along_path
              # We don't need to check for equality: if one accident at this
              # distance matches, they'll all match and they'll all be removed
              objs[d].splice(i, 1)
              break

    results

  _getActiveModes: () ->
    if @state.mode == 'both'
      [ 'bicycling', 'driving' ]
    else
      [ @state.mode ]

  _getTopSpots: () ->
    idToSpot = {}
    topSpots = []

    for mode in this._getActiveModes()
      continue unless @topGroupsByMode[mode]?
      for topGroup in @topGroupsByMode[mode]
        # If two groups (one per mode) contain the same accident, merge them.
        topSpot = undefined

        # Search for the duplicates
        for accident in topGroup
          if idToSpot[accident.id]?
            topSpot = idToSpot[accident.id]
            topSpot.mode = 'both'
            break

        # If we're not merging, initialize an empty array
        if !topSpot?
          topSpot = { mode: mode, accidents: [] }
          topSpots.push(topSpot)

        # Merge/copy into the array
        for accident in topGroup
          if !idToSpot[accident.id]?
            idToSpot[accident.id] = topSpot
            topSpot.accidents.push(accident)

    topSpots.sort((a, b) -> b.length - a.length)

    topSpots = topSpots.slice(0, 3)

    for topSpot in topSpots
      this._fillLocation(topSpot)

    topSpots

  _fillLocation: (topSpot) ->
    sumLatitude = 0
    sumLongitude = 0
    for accident in topSpot.accidents
      sumLatitude += accident.Latitude
      sumLongitude += accident.Longitude

    topSpot.Latitude = sumLatitude / topSpot.accidents.length
    topSpot.Longitude = sumLongitude / topSpot.accidents.length

  _getHeadingString: (topSpots) ->
    locations = (topSpots.length == 1 && 'location' || 'locations')
    routes = (@topGroupsByMode.bicycling? && @topGroupsByMode.driving? && 'routes' || 'route')

    "Most accident-prone #{locations} along your #{routes}"

  _getTopSpotString: (topSpot) ->
    accidents = topSpot.accidents.length == 1 && 'accident' || 'accidents'
    if topSpot.mode == 'both'
      "#{topSpot.accidents.length} #{accidents} along your driving and bicycling routes"
    else
      "#{topSpot.accidents.length} #{accidents} along your #{topSpot.mode} route"

  _getGeocoder: () ->
    @geocoder ||= new google.maps.Geocoder()

  _geocoderResultsToAddress: (results) ->
    for type in [ 'intersection', 'bus_station', 'transit_station', 'neighborhood' ]
      for result in results
        if type in result.types
          return result.formatted_address.split(/,/)[0]

    results[0].formatted_address.split(/,/)[0]

  _renderTopSpot: (topSpot) ->
    $html = $('<li><div class="image-container"><img src="" alt="" /></div><div class="address"></div><div class="count"></div></li>')
    $html.find('.address').text("#{topSpot.Latitude},#{topSpot.Longitude}")
    $html.find('.count').text(this._getTopSpotString(topSpot))

    this._getGeocoder().geocode({
      latLng: new google.maps.LatLng(topSpot.Latitude, topSpot.Longitude)
    }, (results, status) =>
      if status == google.maps.GeocoderStatus.OK
        address = this._geocoderResultsToAddress(results)
        $html.find('.address').text(address)
    )

    # Wait for the image to be drawn so we know its height
    window.setTimeout(() ->
      $img = $html.find('img')
      url = "http://maps.googleapis.com/maps/api/streetview?sensor=false&size=#{$img.width()}x#{$img.height()}&location=#{topSpot.Latitude},#{topSpot.Longitude}"
      $img.attr('src', url)
    , 50)

    $html

  _fillDiv: (topSpots) ->
    $div = $(@div)

    $div.empty()

    if !topSpots.length
      $div.hide()
      return

    h2String = this._getHeadingString(topSpots)
    $h2 = $('<h2></h2>')
    $h2.text(h2String)
    $div.append($h2)

    $ul = $('<ul></ul>')

    for topSpot, i in topSpots
      $li = this._renderTopSpot(topSpot, i)
      $li.addClass("top-spot-#{i}")
      $ul.append($li)

    $div.append($ul)
    $div.show()

  _topSpotsToMarkers: (topSpots) ->
    markers = []

    return [] unless topSpots.length

    max = topSpots[0].accidents.length

    for topSpot in topSpots
      break if topSpot.accidents.length != max
      marker = new google.maps.Marker({
        clickable: false,
        flat: true,
        optimized: false,
        position: new google.maps.LatLng(topSpot.Latitude, topSpot.Longitude),
        icon: new google.maps.MarkerImage(
          './icons/marker-top-spot.png',
          new google.maps.Size(37, 28),
          undefined,
          new google.maps.Point(19, 14)
        ),
        title: 'Accident-prone location'
      })
      markers.push(marker)

    markers

  refresh: () ->
    # Assume accidents array only changes from (set 1) -> (undefined) -> (set 2)
    # This optimizes a common case, (set 1) -> (set 1)
    changed = false

    for mode in [ 'bicycling', 'driving' ]
      if @state.accidents[mode]? && (@state.mode == 'both' || @state.mode == mode) && !@state.entireCity
        # There are accidents we want to render
        if !@topGroupsByMode[mode]?
          # And we aren't rendering them
          @topGroupsByMode[mode] = this._accidentsToTopGroups(@state.accidents[mode])
          changed = true
      else
        # There's a lack of accidents to render
        if @topGroupsByMode[mode]?
          # But we're rendering them
          delete @topGroupsByMode[mode]
          changed = true

    if changed
      (marker.setMap(null) for marker in @markers)
      topSpots = this._getTopSpots()
      this._fillDiv(topSpots)
      @markers = this._topSpotsToMarkers(topSpots)
      (marker.setMap(@map) for marker in @markers)

keepMapInStateBounds = (map, state) ->
  fitMapToCityBounds = (city) ->
    cityData = CITIES[city]
    latLng = new google.maps.LatLng(cityData.latitude, cityData.longitude)
    map.setCenter(latLng)
    map.setZoom(cityData.zoom)

  state.onChange 'city', (city) ->
    fitMapToCityBounds(city)
  fitMapToCityBounds(state.city)

  extendMapBoundsToFitPosition = (latLng) ->
    bounds = map.getBounds()
    if !bounds.contains(latLng)
      bounds.extend(latLng)
      map.fitBounds(bounds)

  for key in [ 'origin', 'destination' ]
    state.onChange key, (position) ->
      extendMapBoundsToFitPosition(position) if position?
    extendMapBoundsToFitPosition(state[key]) if state[key]?

syncOriginDestinationMarkers = (state, map) ->
  keys = [ 'origin', 'destination' ]
  markers = {}
  movedByUs = false

  sync = (key, position) ->
    return if movedByUs
    if position?
      markers[key].setPosition(position)
      markers[key].setMap(map)
    else
      markers[key].setMap(null)

  syncVisible = () ->
    for key, marker of markers
      if state[key]? && !state.entireCity
        marker.setMap(map)
      else
        marker.setMap(null)

  for key in keys
    markers[key] = new google.maps.Marker({
      clickable: false,
      draggable: true,
      flat: true,
      icon: new google.maps.MarkerImage(
        "icons/marker-#{key}.png",
      )
      title: (key == 'origin' && 'Start point' || 'End point'),
    })
    google.maps.event.addListener markers[key], 'dragstart', () ->
      state.freeze('routes')
    google.maps.event.addListener markers[key], 'dragend', () ->
      state.thaw('routes')

  google.maps.event.addListener markers.origin, 'position_changed', () ->
    movedByUs = true
    state.setOrigin(markers.origin.getPosition())
    movedByUs = false
  google.maps.event.addListener markers.destination, 'position_changed', () ->
    movedByUs = true
    state.setDestination(markers.destination.getPosition())
    movedByUs = false

  state.onChange('origin', (position) -> sync('origin', position))
  state.onChange('destination', (position) -> sync('destination', position))
  state.onChange('entireCity', (entireCity) -> syncVisible())

  sync('origin', state.origin)
  sync('destination', state.destination)

showFusionTablesLayer = (state, map) ->
  fusionTableId = CITIES[state.city].fusionTableId

  getOptions = () ->
    {
      query: {
        select: 'Latitude',
        from: fusionTableId,
        where: "Time >= '#{state.minYear}' AND Time < '#{state.maxYear + 1}'",
      },
      clickable: state.entireCity,
    }

  layer = new google.maps.FusionTablesLayer(getOptions())
  layer.setMap(fusionTableId && state.entireCity && map || null)

  refresh = () ->
    layer.setMap(fusionTableId && state.entireCity && map || null)
    layer.setOptions(getOptions())

  refreshFusionTableId = () ->
    fusionTableId = CITIES[state.city].fusionTableId
    refresh()

  state.onChange('minYear', refresh)
  state.onChange('maxYear', refresh)
  state.onChange('city', refreshFusionTableId)
  state.onChange('entireCity', refresh)

class Manager
  constructor: (map, state, chartLink, dataLink, worstLocationsDiv) ->
    new RouteFinder(state)
    new RouteRenderer(state, map)
    new AccidentFinder(state)
    new AccidentsMarkerRenderer(state, map)

    if chartLink?
      new TrendChartRenderer(state, chartLink)
    if dataLink?
      new AccidentsTableRenderer(state, dataLink)

    new WorstLocationsRenderer(state, worstLocationsDiv, map)
    keepMapInStateBounds(map, state)
    syncOriginDestinationMarkers(state, map)
    showFusionTablesLayer(state, map)

window.Manager = Manager

_address_form_abort_clicking_on_map = undefined # only one clicking at a time

$.fn.address_form = (originOrDestination, state, map, callback = undefined) ->
  property = originOrDestination
  setByGeocoder = false
  setter = originOrDestination == 'origin' && 'setOrigin' || 'setDestination'
  aPointString = originOrDestination == 'origin' && 'a start point' || 'an end point'
  $form = $(this)
  $a = $form.find('a')
  aText = $a.text()
  $input = $form.find('input[type=text]')
  $error = $form.find('.error')
  $status = $form.find('.status')
  lastAddressTyped = $input.val()
  geocoder = new google.maps.Geocoder()

  getCityBounds = () ->
    CITIES[state.city].bounds

  get = () ->
    state[property]

  set = (value) ->
    state[setter](value)

  setStatus = (status) ->
    $status.text(status || '')
    status? && $status.show() || $status.hide()

  setError = (error) ->
    $error.text(error || '')
    error? && $error.show() || $error.hide()

  maybeLookupAddress = () ->
    addressTyped = $input.val()
    return if addressTyped == lastAddressTyped

    if $.trim(addressTyped || '').length > 0
      setError(undefined)
      setStatus('Looking up address')
      lastAddressTyped = addressTyped
      geocoder.geocode({
        'address': addressTyped,
        'bounds': getCityBounds()
      }, (results, status) ->
        handleGeocoderResult(results, status)
      )

  handleGeocoderResult = (results, status) ->
    setByGeocoder = true
    setStatus(undefined)
    if status == google.maps.GeocoderStatus.ZERO_RESULTS || (
      status == google.maps.GeocoderStatus.OK && !getCityBounds().contains(results[0].geometry.location))
      setError('Not found')
      set(null)
    else if status == google.maps.GeocoderStatus.OK
      set(results[0].geometry.location)
      callback?()
      true
    else
      setError('Failed to look up address')
      set(null)
    setByGeocoder = false

  lookupLatLng = (latlng) ->
    setError(undefined)

    if latlng?
      lastAddressTyped = '…'
      $input.val(lastAddressTyped)
      setStatus('Looking up address')
      geocoder.geocode({
        latLng: latlng
      }, (results, status) ->
        handleReverseGeocoderResult(results, status)
      )
    else
      lastAddressTyped = undefined
      $input.val('')
      setStatus(undefined)

  handleReverseGeocoderResult = (results, status) ->
    setStatus(undefined)
    if status == google.maps.GeocoderStatus.OK
      lastAddressTyped = results[0].formatted_address
    else
      lastAddressTyped = '(point on map)'
    $input.val(lastAddressTyped)

  onTypeAddress = (e) ->
    e.preventDefault()
    _address_form_abort_clicking_on_map?()
    _address_form_abort_clicking_on_map = undefined
    maybeLookupAddress()

  $form.on('submit', onTypeAddress)
  $input.on('blur', onTypeAddress)

  $a.on 'click', (e) ->
    e.preventDefault()
    _address_form_abort_clicking_on_map?()
    _address_form_abort_clicking_on_map = undefined

    if $a.hasClass('clicking')
      $a.removeClass('clicking')
      return

    mapListener = google.maps.event.addListenerOnce map, 'click', (e) ->
      _address_form_abort_clicking_on_map()
      set(e.latLng)
      callback?()
      true

    _address_form_abort_clicking_on_map = () ->
      google.maps.event.removeListener(mapListener)
      $a.text(aText)
      $a.removeClass('clicking')

    $a.text("click #{aPointString} on the map")
    $a.addClass('clicking')

  state.onChange originOrDestination, (position) ->
    return if setByGeocoder
    lookupLatLng(position)

$.fn.mode_form = (state) ->
  $.each this, () ->
    $form = $(this)

    $form.on 'click change', (e) ->
      s = $form.serialize()
      mode = s.split(/[=]/)[1]
      state.setMode(mode)

    state.onChange 'mode', () ->
      $input = $form.find("input[value=#{state.mode}]")
      $form.find('label').removeClass('selected')
      $input.attr('checked', 'checked')
      $input.closest('label').addClass('selected')

$.fn.year_range_slider = (state) ->
  getRange = () ->
    city = CITIES[state.city]
    [ city.minYear, city.maxYear ]

  getSelectedRange = () ->
    [ state.minYear, state.maxYear ]

  init = () =>
    range = getRange()
    $(this).slider({
      min: getRange()[0],
      max: getRange()[1],
      range: true,
      values: getSelectedRange(),
      animate: true
    })

  updateState = () =>
    minYear = $(this).slider('values', 0)
    maxYear = $(this).slider('values', 1)
    state.setMinYear(minYear)
    state.setMaxYear(maxYear)

  updateText = () =>
    selectedRange = getSelectedRange()
    if selectedRange[0] == selectedRange[1]
      text = "#{selectedRange[0]}"
    else
      text = "#{selectedRange[0]}–#{selectedRange[1]}"
    $(this).next().text(text)

  state.onChange 'minYear', (year) =>
    if year != $(this).slider('values', 0)
      updateText()
      $(this).slider('values', 0, year)

  state.onChange 'maxYear', (year) =>
    if year != $(this).slider('values', 1)
      updateText()
      $(this).slider('values', 1, year)

  state.onChange 'city', (city) =>
    $(this).slider('destroy')
    init()

  $(this).on 'slidechange', () ->
    updateState()
    updateText()

  init()
  updateText()
