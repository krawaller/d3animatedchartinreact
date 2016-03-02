import React from 'react'
import ReactDOM from 'react-dom'
import Faux from 'react-faux-dom'
import d3 from 'd3'


let createHook = (comp,elem,statename) => {
	let elems = new Map(),
		interval
	const updateState = ()=> {
		comp.setState({[statename]:elem.toReact()})
	}
	setTimeout(updateState)
	comp.isAnimating = ()=> !!interval
	return (transition)=> {
		transition.each((e)=>{
			elems.set(e,(elems.get(e) || new Set()).add(transition.id))
			interval = interval || setInterval(updateState,16)
		})
		transition.each("end",(e)=>{
			let anims = elems.get(e)
			anims.delete(transition.id)
			if (anims.size){
				elems.set(e,anims)
			} else {
				elems.delete(e)
			}
			if (!elems.size) interval = clearInterval(interval)
		})
	}
}


let App = React.createClass({
	getInitialState: function(){
		return {show:false}
	},
	show: function(){
		this.setState({show:true})
	},
	render: function(){
		return this.state.show ? <Chart /> : <button onClick={this.show}>Show chart</button>
	}
})

let Chart = React.createClass({
	getInitialState: function(){
		return { chart: <span/>, look: 'stacked' }
	},
	componentDidMount: function(){

		let faux = new Faux.Element('div')
		let hook = createHook(this,faux,"chart")

		// D3 code by Mike Bostock, https://bl.ocks.org/mbostock/3943967

		function bumpLayer(n, o) {

		  function bump(a) {
		    var x = 1 / (.1 + Math.random()),
		        y = 2 * Math.random() - .5,
		        z = 10 / (.1 + Math.random());
		    for (var i = 0; i < n; i++) {
		      var w = (i / n - y) * z;
		      a[i] += x * Math.exp(-w * w);
		    }
		  }

		  var a = [], i;
		  for (i = 0; i < n; ++i) a[i] = o + o * Math.random();
		  for (i = 0; i < 5; ++i) bump(a);
		  return a.map(function(d, i) { return {x: i, y: Math.max(0, d)}; });
		}


		var n = 4, // number of layers
		    m = 36, // number of samples per layer
		    stack = d3.layout.stack(),
		    layers = stack(d3.range(n).map(function() { return bumpLayer(m, .1); })),
		    yGroupMax = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y; }); }),
		    yStackMax = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y0 + d.y; }); });

		var margin = {top: 40, right: 10, bottom: 20, left: 10},
		    width = 600 - margin.left - margin.right,
		    height = 400 - margin.top - margin.bottom;

		var x = d3.scale.ordinal()
		    .domain(d3.range(m))
		    .rangeRoundBands([0, width], .08);

		var y = d3.scale.linear()
		    .domain([0, yStackMax])
		    .range([height, 0]);

		var color = d3.scale.linear()
		    .domain([0, n - 1])
		    .range(["#aad", "#556"]);

		var xAxis = d3.svg.axis()
		    .scale(x)
		    .tickSize(0)
		    .tickPadding(6)
		    .orient("bottom");

		var svg = d3.select(faux).append("svg")
		    .attr("width", width + margin.left + margin.right)
		    .attr("height", height + margin.top + margin.bottom)
		  .append("g")
		    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var layer = svg.selectAll(".layer")
		    .data(layers)
		  .enter().append("g")
		    .attr("class", "layer")
		    .style("fill", function(d, i) { return color(i); });

		var rect = layer.selectAll("rect")
		    .data(function(d) { return d; })
		  .enter().append("rect")
		    .attr("x", function(d) { return x(d.x); })
		    .attr("y", height)
		    .attr("width", x.rangeBand())
		    .attr("height", 0);

		rect.transition()
		    .delay(function(d, i) { return i * 10; })
		    .attr("y", function(d) { return y(d.y0 + d.y); })
		    .attr("height", function(d) { return y(d.y0) - y(d.y0 + d.y); })
		    .duration(200)
		    .call(hook)

	    this.transitionGrouped = ()=> {
	      y.domain([0, yGroupMax]);

	      rect.transition()
	          .duration(500)
	          .delay(function(d, i) { return i * 10; })
	          .attr("x", function(d, i, j) { return x(d.x) + x.rangeBand() / n * j; })
	          .attr("width", x.rangeBand() / n)
	          .call(hook)
	        .transition()
	          .attr("y", function(d) { return y(d.y); })
	          .attr("height", function(d) { return height - y(d.y); })
	          .call(hook)
	    }

	    this.transitionStacked = ()=> {
	      y.domain([0, yStackMax]);

	      rect.transition()
	          .duration(500)
	          .delay(function(d, i) { return i * 10; })
	          .attr("y", function(d) { return y(d.y0 + d.y); })
	          .attr("height", function(d) { return y(d.y0) - y(d.y0 + d.y); })
			  .call(hook)
	        .transition()
	          .attr("x", function(d) { return x(d.x); })
	          .attr("width", x.rangeBand())
	          .call(hook)
	    }

		svg.append("g")
		    .attr("class", "x axis")
		    .attr("transform", "translate(0," + height + ")")
		    .call(xAxis);
	},
	toggle: function(){
		if (!this.isAnimating()){
			if (this.state.look === 'stacked'){
				this.setState({ look: 'grouped' })
				this.transitionGrouped();
			} else {
				this.setState({ look: 'stacked' })
				this.transitionStacked();
			}
		}
	},
	render: function(){
		return <div>
			<button onClick={this.toggle}>toggle layout</button>
			{this.state.chart}
		</div>
	}
})

ReactDOM.render(<App/>, document.getElementById("container"))