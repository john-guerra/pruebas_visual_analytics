var networkCanvasChart = function () {
  "use strict";
  // constants to define the size
  // and margins of the vis area.
  var width = 900;
  var height = 520;
  var margin = {top:40, left:40, bottom:60, right:10};

  // Node's radius
  var radius = 15;
  // Colors for clusters
  var color = d3.scaleOrdinal(d3.schemeCategory20);
  // Should we show images
  var HIDE_IMAGES = false;
  // Should we show clusters?
  var showClusters = false;


  var xScale = d3.scalePow().exponent(0.25);
  var yScale = d3.scaleLinear();
  var rScale = d3.scaleLinear().range([5, radius]);

  var xAttr = "followers_count";
  var xTitle = "Followers overall";
  // var xAttr = "utc_offset";
  // var xTitle = "UTC Offset";
  var yAttr = "count";
  var yTitle = "Followers in ieeevis";

  var yAxis = d3.axisLeft(yScale)
            // .ticks(20, ".1s");
  var xAxis = d3.axisBottom(xScale)
            // .ticks(20, ".1f");


  var zoom_transform = d3.zoomIdentity;

  // main canvas, context used for visualization
  var canvas = null;
  var context = null;

  // The svg for the axis
  var svg = null;

  // The force simulation
  var simulation = null;

  // A cluster nest for more efficiently drawing the clusters
  var clusters = null;

  var foci = {};
  // Currently visible nodes
  var filteredNodes = [];
  // For jump into cluster
  var oldFilteredNodes = [];

  // Currently visible links
  var filteredLinks = [];


  var setupData = function(graph) {
    graph.nodes.forEach(function (d) {
      d.nodeImg = new Image();
      d.nodeImg.src = d.profile_image_url;
      d.nodeImgData = null;
      d.nodeImg.onload = function() {
        // console.log("Loaded image" + d.profile_image_url);
        d.nodeImgData = this;
      }
      d.followers_count = +d.followers_count;
      d.count = +d.count;
      d.utc_offset = +d.utc_offset;
      d.friends_count = +d.friends_count;
      d.listed_count = +d.listed_count;
      d.statuses_count = +d.statuses_count;
      d.favourites_count = +d.favourites_count;
    });

    // graph.nodes = graph.nodes.slice(0,1);


    // graph.links.forEach(function (d) {
    //   d.sourceID = d.source;
    //   d.targetID = d.target;
    // });
  };

  function updateNodes(nodes) {
    filteredNodes = nodes;
    simulation.nodes(filteredNodes);
    updateClusters();

    console.log("Updated nodes count:" + filteredNodes.length);
  }

  /**
  *  Shows only the links for the currently shown nodes
  */
  function updateLinks() {
    var dictNodes = {},
      allLinks = chart.graph.links;

    filteredLinks = [];

    filteredNodes.forEach(function (d) {
      dictNodes[d.id] = d;
    });


    filteredLinks = allLinks.filter(function (d) {
      return dictNodes[d.source.id] !== undefined &&
        dictNodes[d.target.id] !== undefined;
    });


    console.log("updating links, all links count: " + allLinks.length +  " filtered: " + filteredLinks.length);

    if (chart.drawLinks) {
      simulation.force("link")
            .links(filteredLinks);

    }

    console.log(simulation.links);

  }

  function updateClusters() {
    clusters = d3.nest()
      .key(function(d) { return showClusters ? d.cluster : "none"; })
      .entries(simulation.nodes())
      .sort(function(a, b) { return b.values.length - a.values.length; });


    var treemap = d3.treemap()
      .size([width, height])
      .padding(1);


    var root = d3.hierarchy({values: clusters}, function(d) { return d.values; })
      .sum(function(d) { return 1; })
      // .sort(function(a, b) { return b.value - a.value; });

    treemap(root);
    foci={}
    root.children.forEach(function (child) {
      foci[child.data.key] = [child.x0 + (child.x1-child.x0)/2, child.y0 + (child.y1-child.y0)/2];
    });
    simulation
      // .force("x", d3.forceX(function (d) { return foci[d.cluster][0]; }).strength(0.5))
      // .force("y", d3.forceY(function (d) { return foci[d.cluster][1]; }).strength(0.5))
      // .force("x", d3.forceX(width/2).strength(0.2))
      .force("x", d3.forceX(function (d) { return xScale(d[xAttr]); }).strength(0.2))
      .force("y", d3.forceY(function (d) { return yScale(d[yAttr]); }).strength(0.2))
    simulation.force("link",
      d3.forceLink()
        .id(function (d) { return d.id; } )
        .strength(function (d) {
          return 0;
          // return (d.source.cluster === d.target.cluster) ?
          //   0.1 :
          //   0.0001;
        })
    );

    console.log("clusters");
    console.log(clusters);
  }

  function addAxis() {
    svg.append("g")
        .attr("class", "axis axis--y")
        .call(yAxis.scale(yScale))
      .append("text")
        .attr("x", 10)
        .attr("y", 10)
        .attr("dy", ".71em")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("text-anchor", "start")
        .text(yTitle);

    svg.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis.scale(xScale))
      .append("text")
        .attr("x", width - 10)
        .attr("y", -10)
        .attr("dy", "-.35em")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("text-anchor", "end")
        .text(xTitle);

  }

  function zoomed() {

    zoom_transform = d3.event.transform;
    simulation.stop();
    var zxScale = zoom_transform.rescaleX(xScale);
    var zyScale = zoom_transform.rescaleY(yScale);


    d3.select(".axis--x").call(xAxis.scale(zxScale));
    // d3.select(".axis--y").call(yAxis.scale(zyScale));

    // context.save();
    // context.clearRect(0, 0, width, height);
    // context.translate(zoom_transform.x, zoom_transform.y);
    // context.scale(zoom_transform.k, zoom_transform.k);


    // context.restore();

    simulation.force("x", d3.forceX(function (d) { return zxScale(d[xAttr]); }).strength(0.2))
      // .force("y", d3.forceY(function (d) { return zyScale(d[yAttr]); }).strength(0.2))
    simulation.alphaTarget(0.1).restart();
    console.log("zoomed");
    console.log(zoom_transform.x, zoom_transform.k);
  }


  var chart = function(selection) {
    selection.each(function(graph) {

      //Load Images and preprocess data
      setupData(graph);

      width = width - margin.left - margin.right;
      height = height - margin.top - margin.bottom;

      function extentWithMargins(extent, margin) {
        margin = margin || 20;
        var range = extent[1]-extent[0];
        return [extent[0]-margin, extent[1]+margin]
      }
      xScale.domain(extentWithMargins(d3.extent(graph.nodes, function (d) { return d[xAttr]; })))
        .range([0, width]);
      yScale.domain(extentWithMargins(d3.extent(graph.nodes, function (d) { return d[yAttr]; }), 3))
        .range([height, 0]);
      rScale.domain(d3.extent(graph.nodes, function (d) { return d.count; }));

      graph.nodes.forEach(function (d) {
        d.r = d.influential ? rScale(d.count) : rScale(d.count)/2;
      });

      var canvasEle = d3.select(this).selectAll("canvas").data([graph]);
      var canvasEnter = canvasEle.enter().append("canvas");
      var svgEle = d3.select(this).selectAll("svg").data([graph]);
      var svgEnter = svgEle.enter().append("svg");

      svg = svgEle.merge(svgEnter)
        // .style("pointer-events", "none")
        .on("mousemove", mousemove)
          .call(d3.zoom()
            .scaleExtent([1 / 2, Infinity])
            .translateExtent([[0,0], [width,height]])
            // .scaleTo(3)
            .on("zoom", zoomed)
          )

        .attr("width", width + margin.left+ margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      svg.append("text")
        .attr("id", "tooltip")
        .attr("transform", "translate(-500, -500)"); //hidden

      canvas = document.querySelector("canvas");
      context = canvas.getContext("2d");
      canvasEle.merge(canvasEnter)
        .style("margin-left", margin.left+"px")
        .style("margin-top", margin.top+"px")
        .style("background-color", "#eee");
      canvas.width = width;
      canvas.height = height;



      addAxis(svg);
      // context.translate(margin.left, margin.top);




      simulation = d3.forceSimulation()
          .force("link", d3.forceLink().id(function (d) { return d.id; } ).strength(0.0000).distance(50))
          // .force("charge", d3.forceManyBody().strength(-200))
          //Better than forceCenter because I can control the strength

          // .force("x", d3.forceX(width/2).strength(0.1))
          // .force("y", d3.forceY(height/2).strength(0.1))
          // .force("center", d3.forceCenter(width / 2, height / 2))
          // .force("collide", d3.forceCollide(radius+4).iterations(4))
          // .force("forceX", d3.forceCenter(width / 2, height / 2));
          // .force("forceY", d3.forceCenter(width / 2, height / 2));


      // d3.json("ieeevisNetwork.json", function(error, graph) {

      // if (error) throw error;
      console.log("Clustering");
      // netClustering.cluster(graph.nodes, graph.links);
      console.log("done");


      updateNodes(graph.nodes);
      updateLinks();



      simulation
          .on("tick", ticked);



      d3.select(canvas)
          // .call(d3.drag()
          //     .container(canvas)
          //     .subject(dragsubject)
          //     .on("start", dragstarted)
          //     .on("drag", dragged)
          //     .on("end", dragended))

      function ticked() {
        context.clearRect(0, 0, width, height);
        context.save();
        // context.translate(width / 2, height / 2);


        if (chart.drawLinks) {
          context.beginPath();
          simulation.force("link").links().forEach(drawLink);
          context.strokeStyle = 'rgba(200,200,200,0.2)';
          context.lineWidth = 1;
          context.stroke();
        }




        clusters.forEach(function(cluster) {
          context.beginPath();
          cluster.values.forEach(drawNode);
          context.fillStyle = color(showClusters ? cluster.key : "none");
          context.fill();
        });

        simulation.nodes().forEach(drawPic);

        // simulation.nodes().forEach(drawNode);

        context.restore();
      }

      function dragsubject() {
        return simulation.find(d3.event.x, d3.event.y);
      }
      // });

      function dragstarted() {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d3.event.subject.fx = d3.event.subject.x;
        d3.event.subject.fy = d3.event.subject.y;
      }

      function dragged() {
        d3.event.subject.fx = d3.event.x;
        d3.event.subject.fy = d3.event.y;
      }

      function dragended() {
        if (!d3.event.active) simulation.alphaTarget(0);
        d3.event.subject.fx = null;
        d3.event.subject.fy = null;
        console.log(d3.event.subject);
      }

      function mousemove() {
        if (!d3.event.active) simulation.alphaTarget(0);
        var node = simulation.find(d3.event.x - margin.left,
          d3.event.y - margin.top
          );

        svg.select("#tooltip")
          .text(node["screen_name"])
          .attr("dy", 20 + "px")
          .attr("transform", "translate("+ node.x + "," + node.y +")")

        console.log(node);
      }


      function drawLink(d) {
        context.moveTo(d.source.x+d.source.r/2, d.source.y+d.source.r/2);
        context.lineTo(d.target.x+d.target.r/2, d.target.y+d.target.r/2);
      }



      function drawNode(d) {
        if (HIDE_IMAGES) {
          context.moveTo(d.x + d.r/2, d.y + d.r/2);
          context.arc(d.x + d.r/2, d.y+ d.r/2, d.r, 0, 2 * Math.PI);
        } else {

          // context.restore();


          context.moveTo(d.x + d.r, d.y+d.r);
          context.arc(d.x+d.r/2, d.y+d.r/2, d.r+2, 0, 2 * Math.PI);
          // context.fillStyle = color(showClusters ? d.cluster : "none");
          // context.fill();

        }

      }// drawNode

      function drawPic(d) {
        if (!HIDE_IMAGES) {
          context.save();
          context.beginPath();
          context.arc(d.x + d.r/2, d.y+d.r/2, d.r, 0, Math.PI * 2, true);
          context.clip();

          try {
            context.drawImage(d.nodeImg, d.x - d.r/2, d.y- d.r/2, d.r*2, d.r*2);
          } catch (e) {
            console.error("Error drawing the image ");
            console.error(e);
          }

          context.beginPath();
          // context.arc(d.x+d.r, d.y+d.r, d.r, 0, Math.PI * 2, true);
          context.clip();
          // context.stroke();
          // context.fill();
          context.closePath();
          context.restore();
        }

      }
    });


  }; //chart

  chart.drawLinks = true;

  return chart;
} // networkCanvasChart
