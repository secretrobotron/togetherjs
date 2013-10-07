/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define(["util", "session"], function (util, session) {
  var module = util.Module('guide');

  function createMarker (color, index, x, y) {
    var marker = document.createElement('div');
    marker.classList.add('togetherjs-guide-marker');
    marker.innerHTML = index;
    marker.style.background = color;
    marker.style.left = x + 'px';
    marker.style.top = y + 'px';
    return marker;
  }

  function createLine (color, x1, y1, x2, y2) {
    var diff = [x2 - x1, y2 - y1];
    var length = Math.sqrt(diff[0] * diff[0] + diff[1] * diff[1]);
    var angle = Math.atan2(diff[1], diff[0]);

    var line = document.createElement('div');

    line.classList.add('togetherjs-guide-line');

    line.style.left = x1 + 'px';
    line.style.top = y1 + 'px';
    line.style.width = length + 'px';

    line.style.background = color;

    var transformString = 'rotate(' + angle + 'rad)';
    var transformOriginString = '0px 0px';

    line.style.mozTransform = transformString;
    line.style.webkitTransform = transformString;
    line.style.transform = transformString;

    return line;
  }

  module._remoteGuides = {};

  module.create = function (color) {
    var id = 'guide-' + util.generateId();
    var steps = [];
    var lines = [];
    var markers = [];

    function addStep (x, y, doNotSend) {
      steps.push({
        x: x,
        y: y
      });

      var newMarker;
      if (steps.length > 1) {
        var step1 = steps[steps.length - 2];
        var step2 = steps[steps.length - 1];
        var newLine = createLine(color, step1.x, step1.y, step2.x, step2.y);
        newMarker = createMarker(color, steps.length, step2.x, step2.y);
        document.body.appendChild(newLine);
        document.body.appendChild(newMarker);
        lines.push(newLine);
        markers.push(newMarker);
      }
      else {
        newMarker = createMarker(color, 1, steps[0].x, steps[0].y);
        document.body.appendChild(newMarker);
        markers.push(newMarker);
      }

      if (!doNotSend) {
        session.send({
          id: id,
          type: 'guide-mark',
          position: steps[steps.length - 1]
        });
      }
    }

    return {
      id: id,
      addStep: addStep,
      finish: function () {
        session.send({
          id: id,
          type: 'guide-finish'
        });
        markers.concat(lines).forEach(function (el) {
          el.classList.add('fadeout');
          setTimeout(function () {
            el.parentNode.removeChild(el);
          }, 1000);
        });
        return steps;
      }
    };
  };

  session.hub.on('guide-mark', function (m) {
    if (!module._remoteGuides[m.peer.id]) {
      module._remoteGuides[m.peer.id] = module.create(m.peer.color);
    }
    module._remoteGuides[m.peer.id].addStep(m.position.x, m.position.y, true);
  });

  session.hub.on('guide-finish', function (m) {
    if (module._remoteGuides[m.peer.id]) {
      module._remoteGuides[m.peer.id].finish();
    }
  });

  return module;
});