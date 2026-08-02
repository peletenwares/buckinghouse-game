'use strict';

var S2Input = (function() {
  var _keys = {};
  var _prev = {};
  var _touchBtns = [];
  var _kdownFn, _kupFn;

  // Teclas mapeadas
  var MAP = {
    left:  ['ArrowLeft',  'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up:    ['ArrowUp',    'KeyW'],
    down:  ['ArrowDown',  'KeyS'],
    jump:  [' ', 'Space', 'ArrowUp', 'KeyW'],
    pause: ['Escape', 'KeyP'],
    // teclas de debug
    dbgNext:     ['BracketRight'],
    dbgPrev:     ['BracketLeft'],
    dbgTimeUp:   ['Equal'],
    dbgTimeDown: ['Minus'],
    dbgComplete: ['KeyN'],
    dbgRestart:  ['KeyR'],
    dbgInvul:    ['KeyI'],
  };

  function keyName(e) { return e.code || e.key; }

  function down(e) {
    _keys[keyName(e)] = true;
    // bloquear scroll del navegador con flechas/espacio
    if ([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key) !== -1) {
      e.preventDefault();
    }
  }
  function up(e) {
    _keys[keyName(e)] = false;
  }

  function is(action) {
    var keys = MAP[action];
    if (!keys) return false;
    for (var i = 0; i < keys.length; i++) {
      if (_keys[keys[i]]) return true;
    }
    return false;
  }

  function pressed(action) {
    var keys = MAP[action];
    if (!keys) return false;
    for (var i = 0; i < keys.length; i++) {
      if (_keys[keys[i]] && !_prev[keys[i]]) return true;
    }
    return false;
  }

  function tick() {
    // Copia estado actual → previo al fin del frame
    _prev = Object.assign({}, _keys);
  }

  // ── Botones táctiles ──────────────────────────────────────────────────────

  function makeTouchBtn(cfg) {
    var el = document.createElement('div');
    el.style.cssText = [
      'position:fixed',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'border-radius:50%',
      'background:rgba(255,255,255,0.16)',
      'border:2px solid rgba(255,255,255,0.5)',
      'color:#fff',
      'font-weight:800',
      'font-size:' + (cfg.fontSize || '20px'),
      'touch-action:none',
      'user-select:none',
      'pointer-events:auto',
      'z-index:20',
      'width:'  + cfg.w,
      'height:' + cfg.h,
      'left:'   + cfg.left,
      'bottom:' + cfg.bottom,
      cfg.right ? ('right:' + cfg.right) : '',
      'backdrop-filter:blur(3px)',
      'box-shadow:0 4px 12px rgba(0,0,0,0.3)',
    ].filter(Boolean).join(';');
    el.textContent = cfg.label;

    // Mantener tecla sintética presionada mientras el dedo está sobre el botón
    var activePointers = 0;
    var vKeys = [].concat(cfg.keys);

    function setActive(active) {
      if (active) {
        el.style.background = 'rgba(255,255,255,0.34)';
        vKeys.forEach(function(k) { _keys[k] = true; });
      } else {
        el.style.background = 'rgba(255,255,255,0.16)';
        vKeys.forEach(function(k) { _keys[k] = false; });
      }
    }

    el.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      activePointers++;
      setActive(true);
    });
    el.addEventListener('pointerup',     function(e) { e.preventDefault(); activePointers = Math.max(0, activePointers - 1); if (!activePointers) setActive(false); });
    el.addEventListener('pointercancel', function(e) { e.preventDefault(); activePointers = Math.max(0, activePointers - 1); if (!activePointers) setActive(false); });
    el.addEventListener('lostpointercapture', function() { activePointers = Math.max(0, activePointers - 1); if (!activePointers) setActive(false); });

    document.body.appendChild(el);
    return { el: el, vKeys: vKeys };
  }

  function createTouchButtons(includeUpDown) {
    var safe = 'env(safe-area-inset-bottom, 0px)';
    var bottom = 'calc(4% + ' + safe + ')';
    var size = 'clamp(48px,7.4vw,72px)';
    var jumpSz = 'clamp(62px,9vw,90px)';

    var btns = [
      { keys: ['ArrowLeft'],  label: '◀', w: size,   h: size,   left: 'calc(2% + env(safe-area-inset-left,0px))', bottom: bottom },
      { keys: ['ArrowRight'], label: '▶', w: size,   h: size,   left: 'calc(2% + env(safe-area-inset-left,0px) + clamp(56px,8.6vw,82px))', bottom: bottom },
      { keys: [' ', 'Space'], label: '⤒', w: jumpSz, h: jumpSz, right: 'calc(2% + env(safe-area-inset-right,0px))', bottom: bottom, fontSize: '24px' },
    ];

    if (includeUpDown) {
      btns.push({ keys: ['ArrowUp'],   label: '▲', w: size, h: size,
                  right: 'calc(2% + env(safe-area-inset-right,0px) + clamp(70px,10.6vw,100px))',
                  bottom: 'calc(4% + env(safe-area-inset-bottom,0px) + clamp(56px,8.6vw,82px))' });
      btns.push({ keys: ['ArrowDown'], label: '▼', w: size, h: size,
                  right: 'calc(2% + env(safe-area-inset-right,0px) + clamp(70px,10.6vw,100px))',
                  bottom: bottom });
    }

    _touchBtns = btns.map(makeTouchBtn);
  }

  function destroyTouchButtons() {
    _touchBtns.forEach(function(b) {
      b.vKeys.forEach(function(k) { _keys[k] = false; });
      if (b.el && b.el.parentNode) b.el.parentNode.removeChild(b.el);
    });
    _touchBtns = [];
  }

  function init(opts) {
    opts = opts || {};
    _kdownFn = down; _kupFn = up;
    window.addEventListener('keydown', _kdownFn);
    window.addEventListener('keyup',   _kupFn);
    if (opts.touch !== false) createTouchButtons(opts.upDown);
  }

  function destroy() {
    window.removeEventListener('keydown', _kdownFn);
    window.removeEventListener('keyup',   _kupFn);
    destroyTouchButtons();
    _keys = {}; _prev = {};
  }

  function updateUpDown(enable) {
    destroyTouchButtons();
    createTouchButtons(enable);
  }

  return { init: init, destroy: destroy, is: is, pressed: pressed, tick: tick, updateUpDown: updateUpDown };
}());
