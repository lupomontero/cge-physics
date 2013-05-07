// Useful stuff
pythagoras = function(x, y) { return Math.sqrt(x * x + y * y); };
weigh = function (richard_body) {
  // calculate the area and use directly as mass
  var verts = richard_body.vertices;
  var area;
  switch (richard_body.type) {
    case "circle": // area for circle
        var radius = verts[0];
        area = Math.PI * radius * radius;
      break;
    case "polygon": // area for polygon
        var i;
        var vertex_count = verts.length * 0.5;
        area = 0;
        for (i = 0; i < vertex_count - 1; i++) {
          area += verts[i*2+1] * verts[i*2+3] - verts[i*2+1] * verts[i*2+2];
        }
        area += verts[vertex_count*2-2] * verts[1] - verts[vertex_count*2-1] * verts[0];
        area *= 0.5;
      break;
  }
  return area;
};

// Physics Manager
function Richard() {
  this.canvas = document.getElementById('canvas');
  this.context = this.canvas.getContext('2d');
  this.x = 0;
  this.y = 0;
  
  this.hi = function () { console.log("hello"); };
  this.richard_bodies = [];
  this.addRichardBody = function (richard_body) {
    this.richard_bodies.push(richard_body);
    return true;
  };
  this.draw = function (richard_body) {
    if (!richard_body) {
      var bodycount = this.richard_bodies.length;
      var i;
      for (i = 0; i < bodycount; i++) {
        this.draw(this.richard_bodies[i]);
      }
      return;
    }
    this.context.beginPath();
    this.context.lineWidth = 1;
    this.context.strokeStyle = richard_body.color;     
    switch (richard_body.type) {
      case "circle":
          this.context.arc(
            richard_body.position_x, richard_body.position_y,
            richard_body.vertices[0], 0, 2 * Math.PI
          );
        break;
      case "polygon":
          var vtx = richard_body.vtx;
          var index = richard_body.vertex_count * 2 - 1;
          this.context.moveTo(vtx[index - 1], vtx[index]);
          index -= 2;
          while (index >= 1) {
            this.context.lineTo(vtx[index-1], vtx[index]);
            index -= 2;
          }
          this.context.closePath();
        break;
    }
    this.context.stroke();
  };
  
  this.update = function () {    
    var bodycount = this.richard_bodies.length;
    var i;
    for (i = 0; i < bodycount; i++) {
      this.richard_bodies[i].update();
    }
    return;
  };
  this.move = function () {    
    var bodycount = this.richard_bodies.length;
    var i;
    for (i = 0; i < bodycount; i++) {
      this.richard_bodies[i].move();
    }
    return;
  };
  
  this.step = function () {
    this.context.clearRect(0,0,640,480);
    this.update();
    this.move();
//cheating
body.polyCollide(body2);    
    this.draw();
  };
  this.loop = function () {
    // TODO: MUST implement DeltaTime .. maybe?
    // quit on input? input handler? >_<
    // spawn threads (webworkers)?
    var con = this; // maintain reference to "this" beyond function scope
    setInterval(function(){con.step();},40);
  };
  
  this.mouseDown = function (con, e) {
    if (e.target.id === "canvas") {
      var count = con.richard_bodies.length || 0;
      var x = e.clientX - e.target.offsetLeft;
      var y = e.clientY - e.target.offsetTop;
      while (count--) {
        if (con.richard_bodies[count].pointInPoly(x, y)) {
          con.richard_bodies[count].dragged = true;
        }
      }
    }
  };
  this.mouseUp = function (con, e) {
    if (e.target.id === "canvas") {
      var count = con.richard_bodies.length || 0;
      while (count--) {
        con.richard_bodies[count].dragged = false;
      }
    }
  };
  this.mouseMove = function (con, e) {
    if (e.target.id === "canvas") {
      var x = e.clientX - e.target.offsetLeft;
      var y = e.clientY - e.target.offsetTop;
      var change_x = x - con.x;
      var change_y = y - con.y;
      con.x = x;
      con.y = y;
      var count = con.richard_bodies.length || 0;
      while (count--) {
        if (con.richard_bodies[count].dragged) {
          con.richard_bodies[count].impulse_x += change_x;
          con.richard_bodies[count].impulse_y += change_y;
        }
      }
    }
  };
  this.mouseOut = function (con, e) {
    if (e.target.id === "canvas") {
      var count = con.richard_bodies.length;
      while (count--) {
        con.richard_bodies[count].dragged = false;
      }
    }
  };
  var con = this; // maintain a reference to this beyond function scope
  window.addEventListener('mousedown', (function (bunny) {return function (e) {con.mouseDown(bunny, e);};})(con), false);
  window.addEventListener('mouseup', (function (bunny) {return function (e) {con.mouseUp(bunny, e);};})(con), false);
  window.addEventListener('mousemove', (function (bunny) {return function (e) {con.mouseMove(bunny, e);};})(con), false);
  window.addEventListener('mouseout', (function (bunny) {return function (e) {con.mouseOut(bunny, e);};})(con), false);
}

rich = new Richard();

// Rigidbody
function RichardBody(vertices, position, mass) {
  this.canvas = document.getElementById('canvas');
  this.context = this.canvas.getContext('2d');
  this.position_x = position && position.x ? position.x : 0;
  this.position_y = position && position.y ? position.y : 0;
  this.vertices = vertices || [10]; // original vertices (needed???)
  this.vertex_count = this.vertices.length * 0.5;
  this.color = '#000000';
  this.vtx = []; // transformed vertices .. always work on these
  this.setVtx = function () { // to set up initial transformed vtx
    if (this.vtx.length) return; // only do it once
    var index = this.vertex_count * 2 - 1;
    while ( index >= 1 ) {
      this.vtx[index] = vertices[index--] + this.position_y;
      this.vtx[index] = vertices[index--] + this.position_x;
    }
  };
  this.setVtx(); // ..erm .. do it
  this.type = this.vertex_count > 1 ? "polygon" : "circle";
  this.mass = mass || weigh(this);
  this.impulse_x = 0;
  this.impulse_y = 0;
  this.momentum_x = 0;
  this.momentum_y = 0;
  this.dragged = false;
  this.move = function () {
    var index = this.vertex_count * 2 - 1;
    while ( index >= 1 ) {
      this.vtx[index--] += this.momentum_y;
      this.vtx[index--] += this.momentum_x;
    }
    if(this.dragged) {
      this.momentum_x = 0;
      this.momentum_y = 0;
    }
  };
  this.update = function () {
    // apply impulse
    this.momentum_x += this.impulse_x;
    this.momentum_y += this.impulse_y;
    // reset impulse
    this.impulse_x = 0; 
    this.impulse_y = 0;    
    // collision detect?
    // position update
    this.position_x += this.momentum_x;
    this.position_y += this.momentum_y;
    // friction (air-resistance?)
    this.momentum_x *= 0.9;
    this.momentum_y *= 0.9;
  };
  this.drawLine = function (x, y, x2, y2) {
    this.context.beginPath();
    this.context.lineWidth = 1;
    this.context.strokeStyle = '#FF0000';     
    if(!x2) {
      this.context.moveTo(0,0);
      this.context.lineTo(x,y);
    } else {
      this.context.moveTo(x,y);
    }
    if(x2)this.context.lineTo(x2,y2);
    this.context.stroke();
  };
  this.dot = function (x1, y1, x2, y2) {
    return x1 * x2 + y1 * y2;
  };
  this.pointInPoly = function (x, y) {
    // works for convex/concave/holes.. O(n)
    // ref: http://www.codeproject.com/Tips/84226/Is-a-Point-inside-a-Polygon
    var count = this.vertex_count;
    var v = this.vtx;
    var index = 0;
    var index2;
    var in_poly = false;
    while (count - index++) {
      i2 = (index - 1) * 2;
      xi = i2;
      yi = i2 + 1;
      xj = (i2 + 2) % (count * 2);
      yj = (i2 + 3) % (count * 2);
      // loop through edges
      if(
        // if line between normal and test point intersects edge, toggle in_poly
        ((v[yi] > y) != (v[yj] > y)) && (x < (v[xj] - v[xi]) * (y - v[yi]) / (v[yj] - v[yi]) + v[xi])
      ) in_poly = !in_poly;
    }
    return in_poly
  };
  this.projectPolys = function (vector_x, vector_y, vtx_a, vtx_b) {
    // ref: http://www.codeproject.com/Articles/15573/2D-Polygon-Collision-Detection
    var distance = 0;
    var min_a, max_a, min_b, max_b, dot, index;
    // loop through vtx_a, dot with vector and store min and max
    index = vtx_a.length - 1;
    dot = vtx_a[index--] * vector_y + vtx_a[index--] * vector_x;
    min_a = dot;
    max_a = dot;
    while (index > 0) {
      dot = vtx_a[index--] * vector_y + vtx_a[index--] * vector_x;
      if (dot < min_a) min_a = dot;
      if (dot > max_a) max_a = dot;
    }
    // loop through vtx_b, dot with vector and store min and max
    index = vtx_b.length - 1;
    dot = vtx_b[index--] * vector_y + vtx_b[index--] * vector_x;
    min_b = dot;
    max_b = dot;
    while (index > 0) {
      dot = vtx_b[index--] * vector_y + vtx_b[index--] * vector_x;
      if (dot < min_b) min_b = dot;
      if (dot > max_b) max_b = dot;
    }
    // TODO:
    // .. project velocities, add to min & max values, then check distance
    // check distance between a and b projections
    return min_a < min_b ? min_b - max_a : min_a - max_b;
  };
  this.polyCollide = function (richard_body) {
    // ref: http://www.codeproject.com/Articles/15573/2D-Polygon-Collision-Detection
    var vtx = this.vtx;
    var vtx2 = richard_body.vtx;
    var vtx_count = this.vertex_count;
    var vtx2_count = richard_body.vertex_count;
    var axis_x, axis_y;
    var edge_index;
    var distance, min_distance = 0;
    var min_translation_x = 0, min_translation_y = 0;
    var no_collision = false;
    
    // for all edges in first poly
    edge_index = vtx_count;
    while (edge_index -- && !no_collision) {
      // find perpendicular axis
      if(edge_index === 0) { // wrapping
        axis_x = vtx[1] - vtx[vtx_count * 2 - 1]; // swapping x/y
        axis_y = vtx[vtx_count * 2 - 2] - vtx[0]; // negating
      } else {
        axis_x = vtx[edge_index * 2 + 1] - vtx[edge_index * 2 - 1]; // swapping x/y
        axis_y = vtx[edge_index * 2 - 2] - vtx[edge_index * 2]; // negating
      }
      // project polygons onto axis and check overlap
//this.drawLine(vtx[edge_index * 2], vtx[edge_index * 2 + 1], axis_x+vtx[edge_index * 2], axis_y+vtx[edge_index * 2 + 1]);
      distance = this.projectPolys(axis_x, axis_y, vtx, vtx2);
      if (!min_distance || distance > min_distance) {
        min_distance = distance;
        min_translation_x = axis_x;
        min_translation_y = axis_y;
      }
      if (distance >= 0) no_collision = true;
    }  
    // for all edges in second poly
    edge_index = vtx2_count;
    while (edge_index -- && !no_collision) {
      // find perpendicular axis
      if(edge_index === 0) { // wrapping
        axis_x = vtx2[1] - vtx2[vtx2_count * 2 - 1]; // swapping x/y
        axis_y = vtx2[vtx2_count * 2 - 2] - vtx2[0]; // negating
      } else {
        axis_x = vtx2[edge_index * 2 + 1] - vtx2[edge_index * 2 - 1]; // swapping x/y
        axis_y = vtx2[edge_index * 2 - 2] - vtx2[edge_index * 2]; // negating
      }
      // project polygons, check overlap
//this.drawLine(vtx2[edge_index * 2], vtx2[edge_index * 2 + 1], axis_x+vtx2[edge_index * 2], axis_y+vtx2[edge_index * 2 + 1]);
      distance = this.projectPolys(axis_x, axis_y, vtx, vtx2);
      // find minimum translation vector (largest negative .. if positive, never used)
      if (distance > min_distance) {
        min_distance = distance;
        min_translation_x = axis_x;
        min_translation_y = axis_y;
      }
      if (distance >= 0) no_collision = true;
    }
    
    if (!no_collision) {
console.log("min_distance: " + min_distance);
//console.log(min_translation_x, min_translation_y);
this.drawLine(100, 100, 100 + min_translation_x, 100 + min_translation_y);
      this.color = '#ff0000';
      richard_body.color = '#ff0000';
    } else {
      this.color = '#00ff00';
      richard_body.color = '#00ff00';
    }
  };
}