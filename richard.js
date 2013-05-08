(function () {

  // Useful stuff
  function pythagoras(x, y) { return Math.sqrt(x * x + y * y); }

  // calculate the area and use directly as mass
  function weigh(body) {
    var verts = body.vertices;
    var count = verts.length * 0.5; // Previously `vertex_count`.
    var firstVert = verts[0]; // Cache 1st vert as it is used more than once.
    var area = 0;
    // Vars used in polygon loop. We precompute `i` so that we dont need to
    // perform arithmetic in the for loop's conditonal clause.
    var i = count - 1, j;

    switch (body.type) {
      case "circle": // area for circle (`firstVert` is `radius`).
        area = Math.PI * firstVert * firstVert;
        break;
      case "polygon": // area for polygon
        // Using a `do-while` loop we save work as we do one less conditional
        // check (the first iteration runs without checking the precondition).
        // We also reverse the loop so we can combine the control conditon with
        // the decrement operation.
        do {
          j = i * 2; // Cache double of `i` (dont need to do this 4 times).
          area += verts[j+1] * verts[j+3] - verts[j+1] * verts[j+2];
        } while (i--);

        j = count * 2;
        area += verts[j-2] * verts[1] - verts[j-1] * firstVert;
        area *= 0.5;
        break;
    }

    return area;
  }

  // This is the stage where we place the "richard bodies". Each stage will be
  // bound to a `canvas` DOM node.
  function createStage(el) {
    // We use local "private" variables instead of public properties. Better
    // encapsulation and faster data access.
    var ctx = el.getContext('2d');
    var x = 0;
    var y = 0;
    var bodies = [];

    // Declare private functions as named functions instead of instance methods.
    // Faster access and more secure.

    function draw(body) {
      // Get bodycount first as we need in test to know whether we should try to
      // iterate the `bodies` array. This way we can safely reverse the loop and
      // save some instructions.
      var bodycount = bodies.length;
      if (!body) {
        while (bodycount) {
          // Note that we decrement the bodycount "before" using it as the array
          // index!
          draw(bodies[--bodycount]);
        }
        return;
      }
      // Draw the actual body.
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = body.color;     
      switch (body.type) {
        case "circle":
          ctx.arc(
            body.position_x, body.position_y,
            body.vertices[0], 0, 2 * Math.PI
          );
          break;
        case "polygon":
          var vtx = body.vtx;
          var index = body.vertex_count * 2 - 1;
          ctx.moveTo(vtx[index - 1], vtx[index]);
          index -= 2;
          while (index >= 1) {
            ctx.lineTo(vtx[index-1], vtx[index]);
            index -= 2;
          }
          ctx.closePath();
          break;
      }
      ctx.stroke();
    }
 
    function update() {    
      var bodycount = bodies.length;
      var i;
      for (i = 0; i < bodycount; i++) {
        bodies[i].update();
      }
    }

    function move() {    
      var bodycount = bodies.length;
      var i;
      for (i = 0; i < bodycount; i++) {
        bodies[i].move();
      }
    }

    function step() {
      ctx.clearRect(0, 0, 640, 480);
      update();
      move();
      //cheating
      bodies[0].polyCollide(bodies[1]);    
      draw();
    }

    // Just a helper function to get the point where the mouse was clicked
    // relative to the container canvas.
    function eventToPoint(e) {
      var target = e.target;
      return [
        e.clientX - target.offsetLeft,
        e.clientY - target.offsetTop
      ];
    }

    function mouseDown(e) {
      var point = eventToPoint(e);
      var count = bodies.length || 0;
      var body;
      while (count--) {
        body = bodies[count];
        if (body.pointInPoly.apply(body, point)) {
          body.dragged = true;
        }
      }
    }

    function mouseUp(e) {
      var count = bodies.length || 0;
      while (count--) {
        bodies[count].dragged = false;
      }
    }

    function mouseMove(e) {
      var point = eventToPoint(e);
      var change_x = point[0] - x;
      var change_y = point[1] - y;
      x = point[0];
      y = point[1];
      var count = bodies.length || 0;
      var body;
      while (count--) {
        body = bodies[count];
        if (body.dragged) {
          body.impulse_x += change_x;
          body.impulse_y += change_y;
        }
      }
    }

    function mouseOut(e) {
      var count = bodies.length;
      while (count--) {
        bodies[count].dragged = false;
      }
    }

    el.addEventListener('mousedown', mouseDown, false);
    el.addEventListener('mouseup', mouseUp, false);
    el.addEventListener('mousemove', mouseMove, false);
    el.addEventListener('mouseout', mouseOut, false);

    // Return stage object.
    return {

      addBody: function (body) {
        body.ctx = ctx;
        bodies.push(body);
      },
   
      loop: function () {
        // TODO: MUST implement DeltaTime .. maybe?
        // quit on input? input handler? >_<
        // spawn threads (webworkers)?
        setInterval(function () { step(); }, 40);
      }
    
    };

  }

  // Rigid body (aka Dick).
  function RichardBody(vertices, position, mass) {
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
      this.ctx.beginPath();
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = '#FF0000';     
      if (!x2) {
        this.ctx.moveTo(0,0);
        this.ctx.lineTo(x,y);
      } else {
        this.ctx.moveTo(x,y);
      }
      if (x2) this.ctx.lineTo(x2,y2);
      this.ctx.stroke();
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

  // Public interface.
  window.richard = {
    createStage: createStage,
    createBody: function (coord, pos) {
      return new RichardBody(coord, pos);
    }
  };

}());
