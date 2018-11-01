(() => {
  const RATIO = (Math.sqrt(3) / 2)
  let canvas
  let redraw = false // whether to redraw in the draw() loop
  let zoom = 1 // level of zoom. higher = more zoomed in. 1 = full triangle
  let panning = false
  let moved = false
  let down = { x: 0, y: 0 } // x/y start position for panning
  let origin = { x: 0, y: 0 } // offset of bottom-left of master triangle from browser's 0,0
  let coords = { x: 0, y: 0 } // keep track of where we are in the full landscape in px based on 1x zoom
  let stack = []
  let numDrawn = 0
  let masterLength
  let masterX
  let targetZoom = false // these needed for animations
  let targetOrigin = false

  // Control how zoomed in and small we can get!
  const minLength = 8 // level of granularity
  const maxZoom = 1000000
  const zoomSpeed = 1.1

  init()

  function init () {
    canvas = document.getElementById('triangle-canvas')
    const ctx = canvas.getContext('2d')

    window.addEventListener('resize', resizeCanvas)

    canvas.addEventListener('click', (e) => {
      if (!moved) animateZoom(e.shiftKey, true)
      moved = false
    })

    // TODO: touchstart
    canvas.addEventListener('mousedown', (e) => {
      down = {
        x: e.clientX,
        y: e.clientY,
        orig_x: origin.x,
        orig_y: origin.y
      }
      panning = true
    })

    // TODO: touchend
    canvas.addEventListener('mouseup', (e) => {
      panning = false
    })

    // TODO: touchmove
    canvas.addEventListener('mousemove', (e) => {
      if (panning) {
        moved = true
        origin = {
          x: down.orig_x + (e.clientX - down.x) / zoom, // don't round (if under 1 anyway)
          y: down.orig_y + (e.clientY - down.y) / zoom
        }
        redraw = true
      }
    })

    window.addEventListener('keydown', (e) => {
      if (e.keyCode === 187) animateZoom(false, true) // in
      else if (e.keyCode === 189) animateZoom(true, true) // out
      else if (e.keyCode === 48) {
        // reset with 0
        targetZoom = 1
        targetOrigin = { x: 0, y: 0 }
        redraw = true
      } else if (e.keyCode === 37) animateScroll('w') // panning ...
      else if (e.keyCode === 38) animateScroll('n')
      else if (e.keyCode === 39) animateScroll('e')
      else if (e.keyCode === 40) animateScroll('s')
    })

    resizeCanvas()

    draw(ctx)
  }

  function resizeCanvas () {
    canvas.width = document.body.clientWidth
    canvas.height = document.body.clientHeight
    masterLength = Math.min(canvas.width, canvas.height / RATIO)
    masterX = (canvas.width - masterLength) / 2
    redraw = true
  }

  // animate a zoom in or out, optionally keeping the current central point
  function animateZoom (out, centre) {
    targetZoom = zoom * (out ? 1 / zoomSpeed : zoomSpeed) // = targetZoom * instead of = zoom * might be better
    targetZoom = Math.round(Math.min(maxZoom, Math.max(1, targetZoom)) * 10) / 10

    if (centre) {
      targetOrigin = {
        x: origin.x - canvas.width / 2 / zoom + canvas.width / 2 / targetZoom,
        y: origin.y - canvas.height / 2 / zoom + canvas.height / 2 / targetZoom
      }
    }

    redraw = true
  }

  // scroll in a direction
  function animateScroll (nesw) {
    const val = 50 / zoom
    targetOrigin = {
      x: origin.x + (nesw === 'w' ? val : nesw === 'e' ? -val : 0),
      y: origin.y + (nesw === 'n' ? val : nesw === 's' ? -val : 0)
    }
    redraw = true
  }

  // our main draw loop
  function draw (ctx) {
    const start = Date.now()

    if (redraw) {
      // reset our transformation save/restore stack
      stack = []
      coords = { x: 0, y: 0 }

      numDrawn = 0

      // clear the canvas on each redraw
      ctx.fillStyle = '#ccc'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      stackSave(ctx)

      // REMOVE THIS if we want animation working (but fix animation to be smooth and silky first)
      if (targetZoom) {
        zoom = targetZoom
        targetZoom = false
      }
      if (targetOrigin) {
        origin.x = targetOrigin.x
        origin.y = targetOrigin.y
        targetOrigin = false
      }

      if (targetZoom) {
        zoom = (zoom + targetZoom) / 2
        if (Math.abs(zoom - targetZoom) < 0.1) zoom = targetZoom
      }
      if (targetOrigin) {
        origin.x = (origin.x + targetOrigin.x) / 2
        origin.y = (origin.y + targetOrigin.y) / 2
        if (Math.abs(origin.x - targetOrigin.x) < 1) origin.x = targetOrigin.x
        if (Math.abs(origin.y - targetOrigin.y) < 1) origin.y = targetOrigin.y
      }

      if (targetOrigin.x === origin.x && targetOrigin.y === origin.y) targetOrigin = false
      if (targetZoom === zoom) targetZoom = false

      // zoom zoom zoom
      ctx.scale(zoom, zoom)

      // draw a starting master black triangle
      stackTranslate(ctx, origin.x + masterX, origin.y + canvas.height) // the origin, bottom-left of black
      ctx.fillStyle = 'black'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(masterLength, 0)
      ctx.lineTo(masterLength / 2, -(masterLength * RATIO))
      ctx.fill()
      numDrawn++

      // recursively make the white triangles, starting with our single master triangle
      ctx.fillStyle = 'white'
      recurseTriangles(ctx, [{ x: 0, y: 0, length: masterLength }])

      stackRestore(ctx)

      const end = Date.now()

      // show some info about the latest redraw
      ctx.fillStyle = 'rgba(0,0,0,.5)'
      ctx.fillRect(0, 0, 280, 70)
      ctx.fillStyle = 'white'
      ctx.fillText(`(${Math.round(origin.x)}, ${Math.round(origin.y)}) @ ${zoom}x   ~   ${numDrawn} triangles drawn in ${end - start}ms`, 10, 20)
      ctx.fillText('Mouse: Click to zoom (+shift = out); drag to pan', 10, 40)
      ctx.fillText('Keys: + and - to zoom (0 resets); arrows to pan', 10, 60)

      // show the zoom level nice and big
      ctx.save()
      ctx.font = '100pt sans-serif'
      ctx.textAlign = 'right'
      ctx.lineWidth = 3
      ctx.fillText(`${zoom}x`, canvas.width - 40, 120)
      ctx.strokeText(`${zoom}x`, canvas.width - 40, 120)
      ctx.restore()

      // show a mini browser
      const miniZoom = 20
      ctx.save()
      ctx.translate(50, 100)
      ctx.scale(1 / miniZoom, 1 / miniZoom)
      ctx.lineWidth = 10
      ctx.strokeRect(0, 0, canvas.width, canvas.height) // everything at zoom 1
      ctx.fillStyle = 'rgba(100, 0, 0, 0.5)' // viewport colour
      if ((canvas.width * 1 / miniZoom / zoom) < 2) {
        // crosshairs needed!
        ctx.beginPath()
        ctx.moveTo(-origin.x - 50, -origin.y)
        ctx.lineTo(-origin.x + 50, -origin.y)
        ctx.moveTo(-origin.x, -origin.y - 50)
        ctx.lineTo(-origin.x, -origin.y + 50)
        ctx.stroke()
      } else {
        ctx.fillRect(-origin.x, -origin.y, canvas.width / zoom, canvas.height / zoom) // what we can currently see
      }
      ctx.fillStyle = 'rgba(0, 150, 0, 0.7)' // triangle colour
      ctx.save()
      ctx.translate(masterX, canvas.height)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(masterLength, 0)
      ctx.lineTo(masterLength / 2, -(masterLength * RATIO))
      ctx.fill()
      ctx.restore()
      ctx.restore()

      // crosshairs in middle of canvas
      ctx.save()
      ctx.strokeStyle = 'rgba(0, 0, 255, .5)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(canvas.width / 2 - 20, canvas.height / 2)
      ctx.lineTo(canvas.width / 2 - 2, canvas.height / 2)
      ctx.moveTo(canvas.width / 2 + 2, canvas.height / 2)
      ctx.lineTo(canvas.width / 2 + 20, canvas.height / 2)
      ctx.moveTo(canvas.width / 2, canvas.height / 2 - 20)
      ctx.lineTo(canvas.width / 2, canvas.height / 2 - 2)
      ctx.moveTo(canvas.width / 2, canvas.height / 2 + 2)
      ctx.lineTo(canvas.width / 2, canvas.height / 2 + 20)
      ctx.stroke()
      ctx.restore()

      // don't redraw unless told to
      if (!targetZoom && !targetOrigin) redraw = false
    }

    // lastDraw = start // for animations
    window.requestAnimationFrame(() => { draw(ctx) })
  }

  // recurisely split and draw the triangles until we reach our minimum length
  function recurseTriangles (ctx, triangles) {
    // triangles are the black triangles, in which we draw one white and return 3 smaller black
    triangles.forEach((triangle) => {
      if (triangle.length * zoom > minLength) {
        stackSave(ctx)
        stackTranslate(ctx, triangle.x, triangle.y) // bottom-left of big black
        if (hitTest(triangle)) {
          recurseTriangles(ctx, splitTriangle(ctx, triangle.length))
        }
        stackRestore(ctx)
      }
    })
  }

  // split a large triangle (starting from bottom-left) with sides of length into 4, drawing the middle one upside down
  function splitTriangle (ctx, length) {
    const height = length * RATIO

    // draw the upside down triangle
    stackSave(ctx)
    stackTranslate(ctx, length / 4, -height / 2)
    drawTriangle(ctx, length / 2)
    numDrawn++
    stackRestore(ctx)

    // return the new triangles that need further splitting
    return [
      { x: 0, y: 0, length: length / 2 }, // bottom left
      { x: length / 4, y: -height / 2, length: length / 2 }, // top
      { x: length / 2, y: 0, length: length / 2 } // bottom right
    ]
  }

  // draw an upside down triangle with side of length from top-left corner
  function drawTriangle (ctx, length) {
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(length, 0)
    ctx.lineTo(length / 2, length * RATIO)
    ctx.fill()
  }

  // hitTest before drawing any triangle, and if we can't see it, ignore it (including all its many-many-many children!)
  function hitTest (triangle) {
    // coordinates of rectangle around the triangle, in the global landscape

    const tc = {
      x0: coords.x - origin.x,
      x1: coords.x - origin.x + triangle.length,
      y0: coords.y - origin.y,
      y1: coords.y - origin.y - (triangle.length * RATIO)
    }

    // TODO: origin.n may need division by zoom too?
    const vc = {
      x0: -origin.x,
      x1: -origin.x + canvas.width / zoom,
      y0: -origin.y,
      y1: -origin.y + canvas.height / zoom
    }

    if (tc.x1 < vc.x0 || tc.x0 > vc.x1 || tc.y0 < vc.y0 || tc.y1 > vc.y1) {
      return false // miss
    } else {
      return true // hit
    }
  }

  // we need our own stack for translations so we can hitTest
  function stackTranslate (ctx, x, y) {
    ctx.translate(x, y)
    coords.x += x
    coords.y += y
  }

  function stackSave (ctx) {
    ctx.save()
    stack.push([coords.x, coords.y])
  }

  function stackRestore (ctx) {
    ctx.restore()
    const popped = stack.pop()
    coords.x = popped[0]
    coords.y = popped[1]
  }
})()
