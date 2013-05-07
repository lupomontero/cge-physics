Richard.prototype.gravitate = function (gravitron, force) {
  var gravitation_x = 0;
  var gravitation_y = 1; // just down by default
  var force = force || 10;
  // TODO: calculate force based on mass?
  var bodycount = this.richard_bodies.length;
  var body;
  var i;

  // loop through rigidbodies
  for (i = 0; i < bodycount; i++) {
    body = this.richard_bodies[i];
    if( body === gravitron) continue;
    if(gravitron && gravitron.position_x) {
      var total;
      // calculate direction
      gravitation_x = gravitron.position_x - body.position_x;
      gravitation_y = gravitron.position_y - body.position_y;
      // normalize
      total = Math.abs(gravitation_x + gravitation_y);
      if (!total) continue; // avoid divide by 0
      gravitation_x = gravitation_x / total;
      gravitation_y = gravitation_y / total;
      // account for distance?
      // .. nah
    }
    // apply force
    this.richard_bodies[i].impulse_x += gravitation_x * force;
    this.richard_bodies[i].impulse_y += gravitation_y * force;
  }
};