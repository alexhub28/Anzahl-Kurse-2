function setup() {
  noCanvas();
  drawChart();
  window.addEventListener("resize", drawChart);
}

// 🎨 Rouge officiel ZIVI (accent6), en dégradé selon l'intensité de la valeur
const BASE_RED = "#FF0000";   // accent6 — intensité max
const LIGHT_RED = "#FFD1D1";  // rouge très clair — intensité min

// --- Formatage suisse : 1'234 ---
function formatSwiss(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

function drawChart() {

  d3.select("#chart").selectAll("*").remove();

  const containerWidth = document.getElementById("chart").clientWidth;
  const width = containerWidth;
  const isMobile = width < 600;

  d3.csv("EAZ_Anzahl_Kurse.csv").then(raw => {

    const data = raw.map(d => ({
      year: d["Jahr"],
      value: +d["Anzahl_Ausbildungskurse"]
    }));

    const margin = {
      top: 30,
      right: isMobile ? 10 : 20,
      bottom: 24,
      left: isMobile ? 10 : 20
    };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = 380;
    const height = margin.top + innerHeight + margin.bottom;

    const svg = d3.select("#chart")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const maxVal = d3.max(data, d => d.value);
    const minVal = d3.min(data, d => d.value);

    const x = d3.scaleBand()
      .domain(data.map(d => d.year))
      .range([0, innerWidth])
      .padding(0.35);

    const y = d3.scaleLinear()
      .domain([0, maxVal * 1.12])
      .range([innerHeight, 0]);

    // Dégradé calé sur l'écart réel des valeurs (609–811) plutôt que sur
    // [0, max] : sinon la variation de teinte serait presque invisible,
    // toutes les barres étant déjà proches du haut de l'échelle.
    const colorScale = d3.scaleLinear().domain([minVal, maxVal]).range([0, 1]);
    const barColor = d => d3.interpolate(LIGHT_RED, BASE_RED)(colorScale(d.value));

    // --- Barres avec animation d'apparition ---
    const bars = g.selectAll("rect.bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.year))
      .attr("width", x.bandwidth())
      .attr("y", innerHeight)
      .attr("height", 0)
      .attr("fill", barColor);

    bars.transition()
      .delay((d, i) => i * 70)
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr("y", d => y(d.value))
      .attr("height", d => innerHeight - y(d.value));

    // --- Étiquette de valeur au-dessus de chaque barre, compteur animé ---
    const values = g.selectAll("text.value")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "value")
      .attr("x", d => x(d.year) + x.bandwidth() / 2)
      .attr("y", innerHeight)
      .attr("text-anchor", "middle")
      .style("font-family", "Arial")
      .style("font-size", isMobile ? "11.5px" : "13.5px")
      .style("font-weight", "bold")
      .style("fill", "#111")
      .text("0");

    values.transition()
      .delay((d, i) => i * 70)
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr("y", d => y(d.value) - 8)
      .textTween(function (d) {
        const iVal = d3.interpolateNumber(0, d.value);
        return t => formatSwiss(iVal(t));
      });

    // --- Années sous les barres ---
    g.selectAll("text.label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", d => x(d.year) + x.bandwidth() / 2)
      .attr("y", innerHeight + 22)
      .attr("text-anchor", "middle")
      .style("font-family", "Arial")
      .style("font-size", isMobile ? "11.5px" : "13.5px")
      .style("fill", "#111")
      .text(d => d.year);

    // --- Survol par colonne : met en évidence une année ---
    function highlight(year) {
      g.selectAll(".bar, .value, .label")
        .transition().duration(150)
        .style("opacity", d => (year === null || d.year === year) ? 1 : 0.3);
    }

    g.selectAll("rect.hit")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "hit")
      .attr("x", d => x(d.year) - (x.step() - x.bandwidth()) / 2)
      .attr("y", 0)
      .attr("width", x.step())
      .attr("height", innerHeight + margin.bottom)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => highlight(d.year))
      .on("mouseout", () => highlight(null));
  });
}
