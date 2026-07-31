function setup() {
  noCanvas();
  drawChart();
  window.addEventListener("resize", drawChart);
}

// 🎨 Même rouge officiel ZIVI (accent6) que le bar chart original.
const BASE_RED = "#FF0000";
const LIGHT_RED = "#FFD1D1";

// --- Formatage suisse : 1'234 ---
function formatSwiss(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

function drawChart() {

  d3.select("#chart").selectAll("*").remove();

  const containerWidth = document.getElementById("chart").clientWidth;
  const isMobile = containerWidth < 600;

  d3.csv("EAZ_Anzahl_Kurse.csv").then(raw => {

    const data = raw.map(d => ({
      year: d["Jahr"],
      value: +d["Anzahl_Ausbildungskurse"]
    }));

    const panelHeight = 380;

    const svg = d3.select("#chart")
      .append("svg")
      .attr("width", containerWidth)
      .attr("height", panelHeight);

    // --- Calcul du treemap (aire ∝ nombre de cours) ---
    const root = d3.hierarchy({ children: data })
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

    d3.treemap()
      .tile(d3.treemapSquarify)
      .size([containerWidth, panelHeight])
      .paddingInner(3)
      .round(true)(root);

    const minVal = d3.min(data, d => d.value);
    const maxVal = d3.max(data, d => d.value);

    // Dégradé calé sur l'écart réel des valeurs (609–811, comme dans la
    // version bar chart) plutôt que sur [0, max] : sinon la variation de
    // teinte serait presque invisible, les valeurs étant toutes proches.
    const colorScale = d3.scaleLinear().domain([minVal, maxVal]).range([0, 1]);

    // --- Bulle flottante au survol ---
    const tooltip = svg.append("g").style("opacity", 0).style("pointer-events", "none");
    const tooltipRect = tooltip.append("rect")
      .attr("fill", "white")
      .attr("stroke", "#555")
      .attr("stroke-width", 1.2)
      .attr("rx", 5);
    const tooltipText = tooltip.append("text")
      .style("font-family", "Arial")
      .style("font-size", "13.5px")
      .style("font-weight", "bold")
      .style("fill", "#111");

    const padX = 10, padY = 7;

    function showTooltip(event, d) {
      tooltip.raise();

      const [mx, my] = d3.pointer(event, svg.node());

      tooltipText.attr("x", padX).attr("y", padY)
        .text(`${d.data.year} : ${formatSwiss(d.data.value)}`);

      const bbox = tooltipText.node().getBBox();
      const boxW = bbox.width + padX * 2;
      const boxH = bbox.height + padY * 2;

      let tx = mx + 14;
      let ty = my - boxH - 12;
      if (tx + boxW > containerWidth) tx = mx - boxW - 14;
      if (ty < 0) ty = my + 14;

      tooltip.attr("transform", `translate(${tx}, ${ty})`);
      tooltipRect.attr("width", boxW).attr("height", boxH);
      tooltipText.attr("y", padY - bbox.y);
      tooltip.style("opacity", 1);
    }

    function hideTooltip() {
      tooltip.style("opacity", 0);
    }

    // --- Cases du treemap, une par année ---
    const cell = svg.selectAll("g.cell")
      .data(root.leaves())
      .enter()
      .append("g")
      .attr("class", "cell")
      .attr("transform", d => `translate(${d.x0}, ${d.y0})`)
      .style("cursor", "pointer");

    cell.append("rect")
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", d => d3.interpolate(LIGHT_RED, BASE_RED)(colorScale(d.data.value)))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("opacity", 0)
      .transition()
      .delay((d, i) => i * 70)
      .duration(500)
      .ease(d3.easeCubicOut)
      .style("opacity", 1);

    // Année + valeur, seulement si la case est assez grande — sinon,
    // l'info reste disponible au survol.
    const fitsYear = d => (d.x1 - d.x0) > 46 && (d.y1 - d.y0) > 30;
    const fitsValue = d => fitsYear(d) && (d.y1 - d.y0) > 48;

    cell.filter(fitsYear)
      .append("text")
      .attr("class", "tile-year")
      .attr("x", 8)
      .attr("y", 22)
      .style("font-family", "Arial")
      .style("font-size", isMobile ? "14.5px" : "17.5px")
      .style("font-weight", "bold")
      .style("fill", "#111")
      .style("opacity", 0)
      .text(d => d.data.year)
      .transition()
      .delay((d, i) => i * 70 + 350)
      .duration(300)
      .style("opacity", 1);

    cell.filter(fitsValue)
      .append("text")
      .attr("class", "tile-value")
      .attr("x", 8)
      .attr("y", 40)
      .style("font-family", "Arial")
      .style("font-size", isMobile ? "11.5px" : "13.5px")
      .style("fill", "#333")
      .style("opacity", 0)
      .text("0")
      .transition()
      .delay((d, i) => i * 70 + 350)
      .duration(400)
      .style("opacity", 1)
      .textTween(function (d) {
        const iVal = d3.interpolateNumber(0, d.data.value);
        return t => formatSwiss(iVal(t));
      });

    // --- Survol : contour marqué + bulle avec la valeur exacte ---
    cell
      .on("mouseover", function (event, d) {
        d3.select(this).select("rect").attr("stroke", "#333").attr("stroke-width", 2.5);
        showTooltip(event, d);
      })
      .on("mousemove", (event, d) => showTooltip(event, d))
      .on("mouseout", function () {
        d3.select(this).select("rect").attr("stroke", "#fff").attr("stroke-width", 1.5);
        hideTooltip();
      });
  });
}
