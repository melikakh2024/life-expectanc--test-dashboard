function _d3(require){return(
require("d3@7")
)}

function _topojson(require){return(
require("topojson-client")
)}

function _growthData(d3){return(
fetch("https://ourworldindata.org/grapher/population-growth-rates.csv")
  .then(r => r.text())
  .then(text => d3.csvParse(text))
)}

function _4(growthData){return(
Object.keys(growthData[0])
)}

async function _5(growthData,d3,topojson)
{
  const world = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
    .then(r => r.json())

  const iso = await fetch("https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json")
    .then(r => r.json())

  const valueCol = "Population growth rate"
  const years = [...new Set(growthData.map(d => +d.Year))].sort()
  const dataMap = new Map(growthData.map(d => [`${d.Code}_${d.Year}`, +d[valueCol]]))

  const width = 900, height = 500
  let currentYear = years[0]
  let playing = false
  let timer = null

  const colorScale = d3.scaleDiverging()
    .domain([-2, 0, 4])
    .interpolator(d3.interpolateRdBu)

  const projection = d3.geoNaturalEarth1()
    .scale(153)
    .translate([width / 2, height / 2])

  const path = d3.geoPath().projection(projection)
  const countries = topojson.feature(world, world.objects.countries).features

  const getAlpha3 = (d) =>
    iso.find(c => c['country-code'] === String(+d.id).padStart(3, '0'))?.['alpha-3']

  // main container
  const container = d3.select(document.createElement("div"))
    .style("font-family", "sans-serif")
    .style("background", "#1a1a2e")
    .style("color", "#fff")
    .style("border-radius", "8px")
    .style("overflow", "hidden")

  // title
  container.append("div")
    .style("padding", "16px 20px")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .text("World Population Growth Rate")

  // controls
  const controls = container.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "12px")
    .style("padding", "8px 20px")
    .style("background", "rgba(255,255,255,0.05)")

  const btn = controls.append("button")
    .text("▶ Play")
    .style("padding", "6px 16px")
    .style("font-size", "14px")
    .style("cursor", "pointer")
    .style("background", "#e94560")
    .style("color", "#fff")
    .style("border", "none")
    .style("border-radius", "4px")

  const slider = controls.append("input")
    .attr("type", "range")
    .attr("min", years[0])
    .attr("max", years[years.length - 1])
    .attr("value", years[0])
    .attr("step", 1)
    .style("width", "500px")

  const yearDisplay = controls.append("span")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .style("min-width", "60px")
    .text(years[0])

  // SVG
  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height)

  // background
  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "#0f3460")

  const paths = svg.selectAll("path")
    .data(countries)
    .join("path")
    .attr("d", path)
    .attr("stroke", "#ffffff22")
    .attr("stroke-width", 0.5)

  // year label
  const yearLabel = svg.append("text")
    .attr("x", width - 20)
    .attr("y", height - 20)
    .attr("text-anchor", "end")
    .attr("font-size", 56)
    .attr("font-weight", "bold")
    .attr("fill", "rgba(255,255,255,0.1)")

  // legend
  const legendG = svg.append("g")
    .attr("transform", "translate(20, 420)")

  const defs = svg.append("defs")
  const grad = defs.append("linearGradient").attr("id", "grad")
  d3.range(0, 1.01, 0.1).forEach(t => {
    grad.append("stop")
      .attr("offset", t)
      .attr("stop-color", colorScale(-2 + t * 6))
  })

  legendG.append("rect")
    .attr("width", 200)
    .attr("height", 10)
    .style("fill", "url(#grad)")

  legendG.append("text").attr("x", 0).attr("y", 25)
    .attr("fill", "#fff").attr("font-size", 11).text("-2%")
  legendG.append("text").attr("x", 100).attr("y", 25)
    .attr("fill", "#fff").attr("font-size", 11)
    .attr("text-anchor", "middle").text("0%")
  legendG.append("text").attr("x", 200).attr("y", 25)
    .attr("fill", "#fff").attr("font-size", 11)
    .attr("text-anchor", "end").text("+4%")
  legendG.append("text").attr("x", 100).attr("y", -5)
    .attr("fill", "#fff").attr("font-size", 11)
    .attr("text-anchor", "middle").text("Population Growth Rate")

  // tooltip
  const tooltip = d3.select(document.createElement("div"))
    .style("position", "absolute")
    .style("background", "rgba(0,0,0,0.85)")
    .style("color", "#fff")
    .style("padding", "8px 12px")
    .style("border-radius", "6px")
    .style("font-size", "13px")
    .style("pointer-events", "none")
    .style("display", "none")
    .style("border", "1px solid #e94560")

  paths
    .on("mousemove", (event, d) => {
      const alpha3 = getAlpha3(d)
      const val = dataMap.get(`${alpha3}_${currentYear}`)
      const name = iso.find(c => c['country-code'] === String(+d.id).padStart(3, '0'))?.name
      tooltip
        .style("display", "block")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 30) + "px")
        .html(val !== undefined
          ? `<b>${name}</b><br>Growth Rate: <b>${val.toFixed(2)}%</b><br>Year: ${currentYear}`
          : `<b>${name}</b><br>No data`)
    })
    .on("mouseleave", () => tooltip.style("display", "none"))

  function update(year) {
    currentYear = year
    yearLabel.text(year)
    paths.transition().duration(100)
      .attr("fill", d => {
        const alpha3 = getAlpha3(d)
        const val = dataMap.get(`${alpha3}_${year}`)
        return val !== undefined ? colorScale(val) : "#333"
      })
    slider.property("value", year)
    yearDisplay.text(year)
  }

  btn.on("click", () => {
    playing = !playing
    btn.text(playing ? "⏸ Pause" : "▶ Play")
    if (playing) {
      timer = d3.interval(() => {
        let idx = years.indexOf(currentYear)
        if (idx >= years.length - 1) {
          playing = false
          btn.text("▶ Play")
          timer.stop()
          return
        }
        update(years[idx + 1])
      }, 150)
    } else {
      if (timer) timer.stop()
    }
  })

  slider.on("input", function() {
    if (timer) timer.stop()
    playing = false
    btn.text("▶ Play")
    update(+this.value)
  })

  document.body.appendChild(tooltip.node())
  update(currentYear)

  return container.node()
}


async function _6(growthData,d3,topojson)
{
  const world = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
    .then(r => r.json())

  const iso = await fetch("https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json")
    .then(r => r.json())

  const valueCol = "Population growth rate"
  const years = [...new Set(growthData.map(d => +d.Year))].sort()
  const dataMap = new Map(growthData.map(d => [`${d.Code}_${d.Year}`, +d[valueCol]]))
  const entities = [...new Set(growthData.map(d => d.Entity))].sort()

  const width = 900, height = 460
  let currentYear = 2000
  let playing = false
  let timer = null
  let activeTab = "map"

  const colorScale = d3.scaleDiverging()
    .domain([-2, 0, 4])
    .interpolator(d3.interpolateRdBu)

  const projection = d3.geoNaturalEarth1()
    .scale(153).translate([width / 2, height / 2])

  const path = d3.geoPath().projection(projection)
  const countries = topojson.feature(world, world.objects.countries).features

  const getAlpha3 = (d) =>
    iso.find(c => c['country-code'] === String(+d.id).padStart(3, '0'))?.['alpha-3']

  // ── CONTAINER ──
  const container = d3.select(document.createElement("div"))
    .style("font-family", "sans-serif")
    .style("background", "#1a1a2e")
    .style("color", "#fff")
    .style("border-radius", "10px")
    .style("overflow", "hidden")
    .style("width", width + "px")

  // ── TITLE ──
  container.append("div")
    .style("padding", "16px 20px 8px")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .text("Population Growth Rate")

  // ── TABS ──
  const tabBar = container.append("div")
    .style("display", "flex")
    .style("gap", "4px")
    .style("padding", "0 20px")
    .style("border-bottom", "1px solid rgba(255,255,255,0.1)")

  const tabDefs = ["map", "line", "table"]

  const tabButtons = tabBar.selectAll("div")
    .data(tabDefs)
    .join("div")
    .text(d => d === "map" ? "🗺 Map" : d === "line" ? "📈 Line" : "📋 Table")
    .style("padding", "8px 16px")
    .style("cursor", "pointer")
    .style("font-size", "13px")
    .style("border-bottom", d => d === activeTab ? "2px solid #e94560" : "2px solid transparent")
    .style("color", d => d === activeTab ? "#e94560" : "#aaa")
    .on("click", function(event, d) {
      activeTab = d
      tabButtons
        .style("border-bottom", t => t === d ? "2px solid #e94560" : "2px solid transparent")
        .style("color", t => t === d ? "#e94560" : "#aaa")
      mapSection.style("display", d === "map" ? "block" : "none")
      lineSection.style("display", d === "line" ? "block" : "none")
      tableSection.style("display", d === "table" ? "block" : "none")
    })

  // ── CONTROLS (shared) ──
  const controls = container.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "12px")
    .style("padding", "10px 20px")
    .style("background", "rgba(255,255,255,0.05)")

  const btn = controls.append("button")
    .text("▶ Play")
    .style("padding", "6px 16px")
    .style("background", "#e94560")
    .style("color", "#fff")
    .style("border", "none")
    .style("border-radius", "4px")
    .style("cursor", "pointer")
    .style("font-size", "13px")

  const slider = controls.append("input")
    .attr("type", "range")
    .attr("min", years[0])
    .attr("max", years[years.length - 1])
    .attr("value", currentYear)
    .attr("step", 1)
    .style("width", "500px")

  const yearDisplay = controls.append("span")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .text(currentYear)

  // ── MAP SECTION ──
  const mapSection = container.append("div")

  const svg = mapSection.append("svg")
    .attr("width", width).attr("height", height)

  svg.append("rect")
    .attr("width", width).attr("height", height)
    .attr("fill", "#0f3460")

  const mapPaths = svg.selectAll("path")
    .data(countries).join("path")
    .attr("d", path)
    .attr("stroke", "#ffffff22")
    .attr("stroke-width", 0.5)

  svg.append("text")
    .attr("class", "year-label")
    .attr("x", width - 20).attr("y", height - 20)
    .attr("text-anchor", "end")
    .attr("font-size", 56).attr("font-weight", "bold")
    .attr("fill", "rgba(255,255,255,0.08)")

  // legend
  const defs = svg.append("defs")
  const grad = defs.append("linearGradient").attr("id", "grad2")
  d3.range(0, 1.01, 0.1).forEach(t => {
    grad.append("stop").attr("offset", t)
      .attr("stop-color", colorScale(-2 + t * 6))
  })
  const lg = svg.append("g").attr("transform", "translate(20,420)")
  lg.append("rect").attr("width", 200).attr("height", 10).style("fill", "url(#grad2)")
  lg.append("text").attr("x", 0).attr("y", 25).attr("fill","#fff").attr("font-size",11).text("-2%")
  lg.append("text").attr("x", 100).attr("y", 25).attr("fill","#fff").attr("font-size",11).attr("text-anchor","middle").text("0%")
  lg.append("text").attr("x", 200).attr("y", 25).attr("fill","#fff").attr("font-size",11).attr("text-anchor","end").text("+4%")

  // tooltip
  const tooltip = d3.select(document.createElement("div"))
    .style("position","absolute").style("background","rgba(0,0,0,0.85)")
    .style("color","#fff").style("padding","8px 12px").style("border-radius","6px")
    .style("font-size","13px").style("pointer-events","none").style("display","none")
    .style("border","1px solid #e94560")

  mapPaths
    .on("mousemove", (event, d) => {
      const alpha3 = getAlpha3(d)
      const val = dataMap.get(`${alpha3}_${currentYear}`)
      const name = iso.find(c => c['country-code'] === String(+d.id).padStart(3,'0'))?.name
      tooltip.style("display","block")
        .style("left",(event.pageX+10)+"px").style("top",(event.pageY-30)+"px")
        .html(val !== undefined
          ? `<b>${name}</b><br>Growth: <b>${val.toFixed(2)}%</b><br>Year: ${currentYear}`
          : `<b>${name}</b><br>No data`)
    })
    .on("mouseleave", () => tooltip.style("display","none"))

  // ── LINE SECTION ──
  const lineSection = container.append("div")
    .style("display", "none")
    .style("padding", "20px")

  lineSection.append("div")
    .style("margin-bottom", "10px")
    .style("font-size", "13px")
    .style("color", "#aaa")
    .text("Click on a country in the map or select below:")

  const countrySelect = lineSection.append("select")
    .style("background", "#0f3460")
    .style("color", "#fff")
    .style("border", "1px solid #e94560")
    .style("padding", "4px 8px")
    .style("border-radius", "4px")
    .style("margin-bottom", "12px")

  countrySelect.selectAll("option")
    .data(entities).join("option")
    .attr("value", d => d)
    .text(d => d)

  const lineSvg = lineSection.append("svg")
    .attr("width", width - 40).attr("height", 350)

  function drawLine(entity) {
    lineSvg.selectAll("*").remove()
    const filtered = growthData
      .filter(d => d.Entity === entity && d[valueCol])
      .map(d => ({year: +d.Year, val: +d[valueCol]}))
      .sort((a,b) => a.year - b.year)

    const lw = width - 80, lh = 300
    const xScale = d3.scaleLinear().domain(d3.extent(filtered, d => d.year)).range([40, lw])
    const yScale = d3.scaleLinear().domain(d3.extent(filtered, d => d.val)).nice().range([lh, 20])

    lineSvg.append("g").attr("transform", `translate(0,${lh})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
      .selectAll("text").style("fill","#aaa")
    lineSvg.select(".domain").style("stroke","#aaa")

    lineSvg.append("g").attr("transform","translate(40,0)")
      .call(d3.axisLeft(yScale).tickFormat(d => d+"%"))
      .selectAll("text").style("fill","#aaa")

    lineSvg.append("path")
      .datum(filtered)
      .attr("fill","none")
      .attr("stroke","#e94560")
      .attr("stroke-width", 2)
      .attr("d", d3.line().x(d => xScale(d.year)).y(d => yScale(d.val)))

    lineSvg.append("text")
      .attr("x", lw/2).attr("y", 12)
      .attr("text-anchor","middle")
      .attr("fill","#fff").attr("font-size",14).attr("font-weight","bold")
      .text(`${entity} — Population Growth Rate`)
  }

  drawLine("World")
  countrySelect.on("change", function() { drawLine(this.value) })

  // ── TABLE SECTION ──
  const tableSection = container.append("div")
    .style("display","none")
    .style("padding","20px")
    .style("max-height","400px")
    .style("overflow-y","auto")

  function drawTable(year) {
    tableSection.selectAll("*").remove()
    const yearData = growthData
      .filter(d => +d.Year === year && d[valueCol])
      .map(d => ({entity: d.Entity, val: +d[valueCol]}))
      .sort((a,b) => b.val - a.val)

    const table = tableSection.append("table")
      .style("width","100%").style("border-collapse","collapse")
      .style("font-size","13px")

    table.append("thead").append("tr").selectAll("th")
      .data(["Country", `Growth Rate (${year})`])
      .join("th")
      .style("text-align","left").style("padding","8px")
      .style("border-bottom","1px solid rgba(255,255,255,0.2)")
      .style("color","#e94560")
      .text(d => d)

    const rows = table.append("tbody").selectAll("tr")
      .data(yearData).join("tr")
      .style("border-bottom","1px solid rgba(255,255,255,0.05)")

    rows.append("td").style("padding","6px 8px").text(d => d.entity)
    rows.append("td").style("padding","6px 8px")
      .style("color", d => d.val >= 0 ? "#4ade80" : "#f87171")
      .text(d => d.val.toFixed(2) + "%")
  }

  drawTable(currentYear)

  // ── UPDATE ──
  function update(year) {
    currentYear = year
    svg.select(".year-label").text(year)
    mapPaths.transition().duration(100)
      .attr("fill", d => {
        const alpha3 = getAlpha3(d)
        const val = dataMap.get(`${alpha3}_${year}`)
        return val !== undefined ? colorScale(val) : "#333"
      })
    slider.property("value", year)
    yearDisplay.text(year)
    drawTable(year)
  }

  btn.on("click", () => {
    playing = !playing
    btn.text(playing ? "⏸ Pause" : "▶ Play")
    if (playing) {
      timer = d3.interval(() => {
        let idx = years.indexOf(currentYear)
        if (idx >= years.length - 1) {
          playing = false; btn.text("▶ Play"); timer.stop(); return
        }
        update(years[idx + 1])
      }, 150)
    } else {
      if (timer) timer.stop()
    }
  })

  slider.on("input", function() {
    if (timer) timer.stop()
    playing = false; btn.text("▶ Play")
    update(+this.value)
  })

  document.body.appendChild(tooltip.node())
  update(currentYear)

  return container.node()
}


export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("d3")).define("d3", ["require"], _d3);
  main.variable(observer("topojson")).define("topojson", ["require"], _topojson);
  main.variable(observer("growthData")).define("growthData", ["d3"], _growthData);
  main.variable(observer()).define(["growthData"], _4);

  return main;
}
