const catalog = {
  material: {
    label: 'Frame material',
    options: {
      aluminum: { name: 'Aluminum', color: '#a1b7b1', price: 195, load: 250 },
      steel: { name: 'Steel', color: '#597a6e', price: 230, load: 300 },
      wood: { name: 'Wood', color: '#b98252', price: 155, load: 200 },
      pvc: { name: 'PVC', color: '#d9dcd3', price: 115, load: 100 }
    }
  },
  wheel: {
    label: 'Wheel type',
    options: {
      swivel: { name: 'Swivel casters', price: 45, load: 250, radius: .14 },
      locking: { name: 'Locking casters', price: 65, load: 300, radius: .14 },
      pneumatic: { name: 'Pneumatic', price: 95, load: 300, radius: .21 }
    }
  },
  shelf: {
    label: 'Adjustable shelf layout',
    options: {
      cargo: { name: 'Cargo deck', price: 0, heights: [], height: 42 },
      single: { name: 'One shelf', price: 40, heights: [1.18], height: 48 },
      double: { name: 'Two shelves', price: 75, heights: [.9, 1.52], height: 54 },
      rails: { name: 'Open slide-on rails', price: 85, heights: [.9, 1.52], height: 54 }
    }
  },
  net: {
    label: 'Lower-deck netting',
    options: {
      none: { name: 'No netting', price: 0 },
      removable: { name: 'Removable netting', price: 25 }
    }
  },
  ramp: {
    label: 'Loading ramp',
    options: {
      none: { name: 'No ramp', price: 0 },
      included: { name: 'Add fold-down ramp', price: 45 }
    }
  }
};
const defaults = { material: 'aluminum', wheel: 'locking', shelf: 'double', net: 'none', ramp: 'none', height: 'auto' };
const state = { ...defaults };
const byId = id => document.getElementById(id);
const selected = key => catalog[key].options[state[key]];
for (const [key, group] of Object.entries(catalog)) {
  const field = document.createElement('fieldset');
  field.dataset.option = key;
  field.innerHTML = '<legend>' + group.label + '</legend><div class="choices"></div>';
  for (const [value, option] of Object.entries(group.options)) {
    const label = document.createElement('label');
    label.className = 'choice';
    const control = document.createElement('input');
    control.type = 'radio';
    control.name = key;
    control.value = value;
    control.addEventListener('change', () => {
      state[key] = value;
      render();
    });
    label.append(control);
    if (option.color) {
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = option.color;
      swatch.setAttribute('aria-hidden', 'true');
      label.append(swatch);
    }
    label.append(document.createTextNode(option.name));
    field.lastElementChild.append(label);
  }
  byId('choices').append(field);
}
function mode(guided) {
  byId('manual').hidden = guided;
  byId('guided').hidden = !guided;
  byId('manual-tab').setAttribute('aria-pressed', String(!guided));
  byId('guided-tab').setAttribute('aria-pressed', String(guided));
}
byId('manual-tab').onclick = () => mode(false);
byId('guided-tab').onclick = () => mode(true);
byId('edit').onclick = () => {
  mode(false);
  byId('manual-tab').focus();
};
byId('guided').addEventListener('input', () => {
  byId('recommendation').hidden = true;
  byId('edit').hidden = true;
});
function recommend(distance, load, frequency) {
  if (load === 'over') return null;
  return {
    material: load === 'heavy' ? 'steel' : load === 'light' && frequency === 'rare' ? 'wood' : 'aluminum',
    wheel: distance === 'long' ? 'pneumatic' : load === 'heavy' || frequency === 'daily' || distance === 'medium' ? 'locking' : 'swivel',
    shelf: load === 'heavy' ? 'cargo' : frequency === 'rare' ? 'single' : 'double',
    net: 'none',
    ramp: load === 'heavy' ? 'included' : 'none',
    height: 'auto'
  };
}
byId('guided').addEventListener('submit', event => {
  event.preventDefault();
  const answers = new FormData(event.currentTarget);
  const build = recommend(answers.get('distance'), answers.get('load'), answers.get('frequency'));
  const result = byId('recommendation');
  result.hidden = false;
  byId('edit').hidden = !build;
  if (!build) {
    result.textContent = 'Loads above 300 lb are outside this concept’s load targets. Your current build is still shown in the preview.';
    return;
  }
  Object.assign(state, build);
  render();
  result.textContent = 'Recommended build applied. ' + selected('material').name + ' frame with ' + selected('wheel').name.toLowerCase() + ' and ' + ({
    cargo: 'an open cargo deck and loading ramp for bulky equipment.',
    single: 'one shelf to leave room on the lower deck.',
    double: 'two shelves to keep equipment organized between trips.'
  })[state.shelf];
});
const canvas = byId('cart');
const ctx = canvas.getContext('2d');
let angle = .62;
let boxOut = false;
let boxExtension = 0;
let slideAnimation;
const slideButton = byId('slide');
const heightControl = byId('height');

heightControl.addEventListener('change', () => {
  state.height = heightControl.value;
  render();
});
slideButton.onclick = () => {
  boxOut = !boxOut;
  updateSlideButton();
  cancelAnimationFrame(slideAnimation);
  const target = boxOut ? .93 : 0;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    boxExtension = target;
    draw();
    return;
  }
  const from = boxExtension;
  const start = performance.now();
  function animate(now) {
    const progress = Math.min(1, (now - start) / 360);
    boxExtension = from + (target - from) * (1 - (1 - progress) ** 3);
    draw();
    if (progress < 1) slideAnimation = requestAnimationFrame(animate);
  }
  slideAnimation = requestAnimationFrame(animate);
};
function updateSlideButton() {
  slideButton.hidden = state.shelf !== 'rails';
  slideButton.textContent = boxOut ? 'Slide box in' : 'Slide box out';
  slideButton.setAttribute('aria-pressed', String(boxOut));
}
function overallHeight() {
  return state.height === 'auto'
    ? selected('shelf').height + (state.wheel === 'pneumatic' ? 3 : 0)
    : Number(state.height);
}
byId('rotate').onclick = () => {
  angle += Math.PI / 4;
  draw();
};
function render() {
  for (const control of byId('choices').querySelectorAll('input')) {
    control.checked = state[control.name] === control.value;
  }
  const material = selected('material');
  const wheel = selected('wheel');
  const shelf = selected('shelf');
  const price = Object.keys(catalog).reduce((sum, key) => sum + selected(key).price, 0);
  const height = overallHeight();
  heightControl.value = state.height;
  if (state.shelf !== 'rails' && (boxOut || boxExtension > 0)) {
    cancelAnimationFrame(slideAnimation);
    boxOut = false;
    boxExtension = 0;
  }
  updateSlideButton();
  const specs = [
    ['Material', material.name], ['Wheels', wheel.name], ['Overall height', height + ' in'],
    ['Load target', Math.min(material.load, wheel.load) + ' lb'], ['Estimated total', '$' + price]
  ];
  byId('specs').innerHTML = specs.map(([label, value], index) =>
    '<div><dt>' + label + '</dt><dd' + (index === 4 ? ' class="price"' : '') + '>' + value + '</dd></div>'
  ).join('');
  byId('finish').textContent = material.name + ' · ' + shelf.name + ' · ' + (state.ramp === 'included' ? 'Fold-down ramp' : 'No ramp') +
    (state.net === 'removable' ? ' · Removable netting' : '');
  canvas.setAttribute('aria-label', material.name + ' storage cart with ' + wheel.name.toLowerCase() + ', ' + shelf.name.toLowerCase() + ' and ' + (state.ramp === 'included' ? 'a loading ramp' : 'no ramp') + (state.net === 'removable' ? ', with removable lower-deck netting' : ''));
  draw();
}
function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!ctx || !width || !height) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.scale(ratio, ratio);
  const glow = ctx.createRadialGradient(width * .5, height * .48, 10, width * .5, height * .48, Math.max(width, height) * .65);
  glow.addColorStop(0, '#2e5948');
  glow.addColorStop(1, '#10261f');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / 4.7, (height - 98) / 3.8);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const project = ([x,y,z]) => [width / 2 + scale * (c*x-s*z), height/2 + scale * (.43*(s*x+c*z)-.90*(y-1.15))];
  const depth = ([x,y,z]) => .90*(s*x+c*z)+.43*y;
  function line(a, b) {
    ctx.beginPath();
    ctx.moveTo(...project(a));
    ctx.lineTo(...project(b));
    ctx.stroke();
  }
  ctx.strokeStyle = '#a1cfb026';
  ctx.lineWidth = 1;
  for (let step = -4; step <= 4; step++) {
    const t = step * .62;
    line([t,0,-2.48],[t,0,2.48]);
    line([-2.48,0,t],[2.48,0,t]);
  }
  const faces = [];
  function face(points, color, thin = false) {
    faces.push({ points, color, thin, order: points.reduce((sum, point) => sum + depth(point), 0) / points.length });
  }
  function box(x, y, z, w, h, d, colors) {
    const a=[x,y,z], b=[x+w,y,z], e=[x,y,z+d], f=[x+w,y,z+d];
    const A=[x,y+h,z], B=[x+w,y+h,z], E=[x,y+h,z+d], F=[x+w,y+h,z+d];
    face([A,B,F,E], colors[0]);
    face(c >= 0 ? [e,f,F,E] : [a,b,B,A], colors[1]);
    face(s >= 0 ? [b,f,F,B] : [a,e,E,A], colors[2]);
  }
  const frame = [selected('material').color, selected('material').color, selected('material').color];
  const deck = ['#a6bcaa','#536e63','#6f8b7c'];
  const wheel = selected('wheel');
  const uplift = wheel.radius * 2 + .13;
  const shelf = selected('shelf');
  const handleRise = (overallHeight() - 48) / 24 - (uplift - .41);
  const handleY = uplift + 1.71 + handleRise;
  const shelfScale = (handleY - uplift - .19) / 1.77;
  const shelfLevels = shelf.heights.map(y => y * shelfScale);
  box(-1.04,uplift,-.65,2.08,.12,1.3,deck);
  for (const x of [-.94,.84]) for (const z of [-.56,.46]) {
    const postHeight = x > 0 ? handleY - uplift - .04 : (shelfLevels.at(-1) || .12) + .12;
    box(x,uplift+.04,z,.1,postHeight,.1,frame);
    box(x-.025,wheel.radius*1.68,z-.03,.15,uplift-wheel.radius*1.68+.025,.16,frame);
    const cx=x+.05, cz=z+.05, r=wheel.radius;
    const ring = (t, offset, radius) => [cx+Math.cos(t)*radius,r+Math.sin(t)*radius,cz+offset];
    const outer = c >= 0 ? .074 : -.074;
    for (let i=0;i<18;i++) {
      const a=i*Math.PI/9, b=(i+1)*Math.PI/9;
      face([ring(a,-outer,r),ring(b,-outer,r),ring(b,outer,r),ring(a,outer,r)], i%2 ? '#142221' : '#202f2d');
      face([ring(a,outer,r),ring(b,outer,r),ring(b,outer,r*.57),ring(a,outer,r*.57)], '#283734');
    }
    face(Array.from({length:18},(_,i)=>ring(i*Math.PI/9,outer,r*.57)), '#a5b8ae');
    if (state.wheel === 'locking') box(x-.15,r*1.75,z+.045,.14,.055,.095,['#c9eb93','#72944b','#8aaf59']);
  }
  box(.84,handleY,-.56,.10,.10,1.12,frame);
  box(.85,handleY+.005,-.37,.111,.108,.75,['#263e35','#152a23','#1f352c']);
  for (const level of shelfLevels) {
    const y = uplift + level;
    if (state.shelf === 'rails') {
      for (const z of [-.49,.40]) {
        box(-1.04,y,z,1.96,.055,.09,deck);
        box(-1.04,y+.055,z < 0 ? z : z+.063,1.96,.035,.027,frame);
      }
    } else {
      box(-.98,y,-.60,1.96,.09,1.2,deck);
    }
  }
  if (state.shelf === 'rails') {
    const binX = -.87 - boxExtension;
    const binY = uplift + shelfLevels[0] + .055 - .23;
    box(binX,binY,-.40,1.05,.26,.80,['#70a4e5','#326cae','#477dbd']);
    box(binX-.02,binY+.23,-.46,1.10,.045,.92,['#a5c7f2','#3a6da6','#5c90cc']);
    box(binX-.029,binY+.13,-.18,.015,.045,.36,['#1d4c83','#153854','#245786']);
  }
  if (state.net === 'removable') {
    const base = uplift + .12;
    const top = base + Math.min(.36, (shelfLevels[0] || .56) - .15);
    const mesh = '#edab79';
    for (const z of [-.645,.645]) {
      for (let i = 0; i < 16; i++) {
        const x = -.96 + i * .12;
        for (const direction of [-1,1]) {
          const start = x + (direction < 0 ? .12 : 0);
          const end = start + direction * .12;
          face([[start,base,z],[start+.016,base,z],[end+.016,top,z],[end,top,z]], mesh, true);
        }
      }
      box(-.97,top,z-.012,1.96,.022,.024,[mesh,mesh,mesh]);
    }
  }
  if (state.ramp === 'included') {
    box(-1.065,uplift+.1,-.59,.058,.44,1.18,['#a6baa6','#657f71','#92a99b']);
    box(-1.08,uplift+.49,-.58,.084,.06,1.16,frame);
  }
  faces.sort((a,b)=>a.order-b.order);
  for (const surface of faces) {
    ctx.beginPath();
    surface.points.forEach((point,i) => i ? ctx.lineTo(...project(point)) : ctx.moveTo(...project(point)));
    ctx.closePath();
    ctx.fillStyle = surface.color;
    ctx.fill();
    ctx.strokeStyle = '#12261e80';
    ctx.lineWidth = .85;
    if (!surface.thin) ctx.stroke();
  }
}
new ResizeObserver(draw).observe(canvas);
render();
