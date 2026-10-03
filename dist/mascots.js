/* Character silhouettes and facial features follow the references chosen by the player. */
window.buildMascots = function ({round, capsule, group, shirtMat, pantsMat, shoesMat, capMat, runner}) {
  const surface = (color, roughness = .48, coat = .12, metalness = 0) =>
    new THREE.MeshPhysicalMaterial({color, roughness, metalness, clearcoat: coat, clearcoatRoughness: .32});
  const yellow = surface(0xffd23b, .5, .13);
  const cream = surface(0xffe9ab, .63);
  const blue = surface(0x514798, .58);
  const blueStripe = surface(0x333273, .57);
  const catPink = surface(0xd7b1d6, .61);
  const white = surface(0xfffaf1, .46, .15);
  const pink = surface(0xf8bdab, .5, .13);
  const blush = surface(0xf5a29d, .64);
  const dark = surface(0x493d48, .52);
  const gold = surface(0xffce64, .3, .32, .3);
  const heroYellow = surface(0xffd154, .52, .15);
  const teal = surface(0x84e3d4, .3, .36, .15);
  const sole = surface(0xfff3dc, .66);
  const models = {};

  function orb(parent, x, y, z, sx, sy, sz, mat, detail = false) {
    const mesh = round(parent, x, y, z, sx, sy, sz, mat);
    if (detail) {mesh.castShadow = false; mesh.receiveShadow = false;}
    return mesh;
  }
  function mesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true;
    parent.add(object); return object;
  }
  function stroke(parent, points, radius, mat, segments = 24) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const object = mesh(parent, new THREE.TubeGeometry(curve, segments, radius, 8, false), mat);
    object.castShadow = false; object.receiveShadow = false; return object;
  }
  function tapered(parent, points, radius, endRadius, mat, tipMat) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const geometry = new THREE.TubeGeometry(curve, 32, radius, 10, false);
    const positions = geometry.attributes.position;
    for (let ring = 0; ring <= 32; ring++) {
      const center = curve.getPointAt(ring / 32), factor = 1 + (endRadius / radius - 1) * ring / 32;
      for (let j = 0; j <= 10; j++) {
        const i = ring * 11 + j;
        positions.setXYZ(i, center.x + (positions.getX(i) - center.x) * factor,
          center.y + (positions.getY(i) - center.y) * factor,
          center.z + (positions.getZ(i) - center.z) * factor);
      }
    }
    geometry.computeVertexNormals();
    if (tipMat) {geometry.clearGroups(); geometry.addGroup(0, 26 * 60, 0); geometry.addGroup(26 * 60, 6 * 60, 1);}
    mesh(parent, geometry, tipMat ? [mat, tipMat] : mat);
    const end = points[points.length - 1];
    orb(parent, ...end, endRadius, endRadius, endRadius, tipMat || mat);
  }
  function pear(parent, y, width, height, depth, mat) {
    const geometry = new THREE.SphereGeometry(1, 36, 24), vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const weight = 1 - vertices.getY(i) * .16;
      vertices.setX(i, vertices.getX(i) * weight); vertices.setZ(i, vertices.getZ(i) * weight);
    }
    geometry.computeVertexNormals();
    const object = mesh(parent, geometry, mat, 0, y, .015);
    object.scale.set(width, height, depth); return object;
  }
  function frontOf(y, width, height, depth, pearShape = false, z = 0) {
    return (x, yy) => {
      const unitY = (yy - y) / height, weight = pearShape ? 1 - unitY * .16 : 1;
      return z - depth * Math.sqrt(Math.max(.003, (1 - unitY * unitY) * weight * weight - x * x / (width * width)));
    };
  }
  // Subdivide and conform a painted detail to the rounded skin, avoiding floating belly plates.
  function painted(parent, shape, mat, front, offset = .009) {
    const flat = new THREE.ShapeGeometry(shape, 20), source = flat.attributes.position;
    const indices = flat.index.array, positions = [], normals = [], uv = [], steps = 6;
    flat.computeBoundingBox(); const bounds = flat.boundingBox;
    const add = (x, y) => {
      positions.push(x, y, front(x, y) - offset);
      const normal = new THREE.Vector3((front(x + .001, y) - front(x - .001, y)) / .002,
        (front(x, y + .001) - front(x, y - .001)) / .002, -1).normalize();
      normals.push(normal.x, normal.y, normal.z);
      uv.push((x - bounds.min.x) / (bounds.max.x - bounds.min.x), (y - bounds.min.y) / (bounds.max.y - bounds.min.y));
    };
    for (let triangle = 0; triangle < indices.length; triangle += 3) {
      const points = [0, 1, 2].map(k => [source.getX(indices[triangle + k]), source.getY(indices[triangle + k])]);
      const point = (i, j) => [points[0][0] + (points[1][0] - points[0][0]) * i / steps + (points[2][0] - points[0][0]) * j / steps,
        points[0][1] + (points[1][1] - points[0][1]) * i / steps + (points[2][1] - points[0][1]) * j / steps];
      for (let i = 0; i < steps; i++) for (let j = 0; j < steps - i; j++) {
        add(...point(i, j)); add(...point(i + 1, j)); add(...point(i, j + 1));
        if (i + j < steps - 1) {add(...point(i + 1, j)); add(...point(i + 1, j + 1)); add(...point(i, j + 1));}
      }
    }
    flat.dispose();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    // These decals have explicit outward normals, and may be mirrored to either cheek.
    mat.side = THREE.DoubleSide;
    const object = mesh(parent, geometry, mat); object.castShadow = false; object.receiveShadow = false;
    return object;
  }
  function softBelly(parent, y, width, height, color, front) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
    gradient.addColorStop(0, color); gradient.addColorStop(.73, color);
    gradient.addColorStop(1, color.replace('1)', '0)'));
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({map: texture, transparent: true, depthWrite: false, roughness: .7});
    const shape = new THREE.Shape(); shape.absellipse(0, y, width, height, 0, Math.PI * 2, false);
    return painted(parent, shape, mat, front);
  }
  function ear(parent, x, y, z, width, height, outer, inner, angle = 0) {
    const assembly = group(); assembly.position.set(x, y, z); assembly.rotation.z = angle;
    const shape = new THREE.Shape();
    shape.moveTo(-width, 0); shape.quadraticCurveTo(-width * .88, height * .4, -width * .14, height);
    shape.quadraticCurveTo(0, height * 1.13, width * .14, height);
    shape.quadraticCurveTo(width * .8, height * .4, width, 0);
    shape.quadraticCurveTo(0, -height * .15, -width, 0);
    const geometry = new THREE.ExtrudeGeometry(shape, {depth: .065, bevelEnabled: true,
      bevelSize: .025, bevelThickness: .03, bevelSegments: 3, curveSegments: 10, steps: 1});
    mesh(assembly, geometry, outer);
    const inset = mesh(assembly, geometry, inner, 0, height * .1, -.041);
    inset.scale.set(.61, .64, .24); inset.castShadow = false;
    parent.add(assembly); return assembly;
  }
  function eyes(parent, y, z, spacing, size, irisColor, kind) {
    const irisMat = surface(irisColor, .32, .3), pupilMat = surface(0x111621, .28, .3);
    const dragon = kind === 'dragon';
    for (const side of [-1, 1]) {
      const eye = group(); eye.position.set(side * spacing, y, z);
      eye.rotation.y = -side * .2; eye.userData.pose = 'eye'; eye.userData.side = side;
      orb(eye, 0, 0, .007, size * 1.065, size * 1.15, .034, dragon ? yellow : pink, true);
      orb(eye, 0, 0, 0, size, size * 1.1, .046, white, true);
      orb(eye, 0, -.004, -.038, size * (dragon ? .86 : .76), size * (dragon ? .94 : .86), .019, irisMat, true);
      orb(eye, 0, -.004, -.052, size * (dragon ? .69 : .52), size * (dragon ? .8 : .68), .016, pupilMat, true);
      orb(eye, -size * .22, size * .32, -.068, size * .16, size * .19, .006, white, true);
      orb(eye, size * .22, -size * .24, -.068, size * .065, size * .085, .005, white, true);
      parent.add(eye);
    }
  }
  function smile(parent, x, y, z, width, mat = dark) {
    return stroke(parent, [[x - width, y + .034, z + .014], [x - width * .55, y - .01, z],
      [x, y - .024, z - .003], [x + width * .55, y - .01, z], [x + width, y + .034, z + .014]], .012, mat);
  }
  function limbs(parent, skin, shoulder, hip, armY, legY, kind) {
    const result = [], pig = kind === 'pig', width = pig ? .105 : .14;
    for (const side of [-1, 1]) {
      const arm = group(); arm.position.set(side * shoulder, armY, 0);
      arm.rotation.z = side * .13; arm.userData = {pose: 'arm', side, restZ: side * .13};
      orb(arm, 0, -.08, 0, width * 1.04, .19, width * 1.05, shirtMat);
      capsule(arm, 0, -.22, -.008, width * .87, .12, kind === 'cat' ? blue : skin);
      orb(arm, 0, -.335, -.025, width * 1.05, .14, width * 1.08, skin);
      orb(arm, -side * .075, -.31, -.055, .055, .073, .065, skin);
      if (pig) {
        const cuff = mesh(arm, new THREE.TorusGeometry(.108, .027, 8, 24), gold, 0, -.245, 0);
        cuff.rotation.x = Math.PI / 2;
        orb(arm, 0, -.34, -.134, .045, .031, .012, sole, true);
      } else if (kind === 'dragon') {
        orb(arm, 0, -.35, -.164, .065, .072, .014, blush, true);
        for (let finger = -1; finger <= 1; finger++)
          orb(arm, finger * .062, -.43, -.084, .024, .045, .026, dark);
      } else if (kind === 'cat') {
        for (let finger = -1; finger <= 1; finger++) {
          const digit = capsule(arm, finger * .06, -.432, -.056, .032, .09, catPink);
          digit.rotation.z = -finger * .18;
          orb(arm, finger * .069, -.49, -.076, .012, .025, .013, blueStripe);
        }
      } else {
        for (let finger = -1; finger <= 1; finger++)
          stroke(arm, [[finger * .045, -.355, -.16], [finger * .045, -.388, -.139]], .006, kind === 'cat' ? blueStripe : cream, 6);
      }
      parent.add(arm);
      const leg = group(); leg.position.set(side * hip, legY, .005); leg.userData.pose = 'leg';
      capsule(leg, 0, -.115, 0, pig ? .132 : .16, .095, pantsMat);
      orb(leg, 0, -.25, -.07, pig ? .168 : .21, .145, .26, shoesMat);
      if (pig) {
        orb(leg, 0, -.352, -.07, .173, .036, .268, surface(0xcc384c));
        orb(leg, 0, -.23, -.291, .08, .024, .023, heroYellow, true);
      }
      if (pig) orb(leg, 0, -.16, -.085, .153, .075, .192, shoesMat);
      else for (let toe = -1; toe <= 1; toe++)
        orb(leg, toe * .07, -.262, -.302, kind === 'dragon' ? .028 : .023, kind === 'dragon' ? .035 : .014,
          kind === 'dragon' ? .048 : .015, kind === 'cat' ? blueStripe : dark, true);
      parent.add(leg); result.push({arm, leg, side});
    }
    return result;
  }
  function accessories(parent, headY, width, depth, kind) {
    const cap = group();
    if (kind === 'pig') {
      const shell = new THREE.BufferGeometry(), shellPositions = [], shellNormals = [], shellUV = [], shellIndices = [];
      const segments = 64, rings = 32;
      for (let row = 0; row <= rings; row++) for (let column = 0; column <= segments; column++) {
        const angle = column / segments * Math.PI * 2, co = Math.cos(angle), si = Math.sin(angle);
        const a = (co / .84) ** 2 + (si / .8) ** 2, bb = 2 * si * .08 / (.8 * .8), c = (.08 / .8) ** 2 - 1;
        const radius = (-bb + Math.sqrt(bb * bb - 4 * a * c)) / (2 * a), start = Math.asin(radius);
        const theta = start + (Math.PI - start) * row / rings;
        const x = Math.sin(theta) * co, y = Math.sin(theta) * si, z = -Math.cos(theta);
        shellPositions.push(x, y, z); shellNormals.push(x, y, z); shellUV.push(column / segments, row / rings);
        if (row < rings && column < segments) {
          const i = row * (segments + 1) + column;
          shellIndices.push(i, i + 1, i + segments + 1, i + 1, i + segments + 2, i + segments + 1);
        }
      }
      shell.setAttribute('position', new THREE.Float32BufferAttribute(shellPositions, 3));
      shell.setAttribute('normal', new THREE.Float32BufferAttribute(shellNormals, 3));
      shell.setAttribute('uv', new THREE.Float32BufferAttribute(shellUV, 2)); shell.setIndex(shellIndices);
      const hood = mesh(cap, shell, capMat, 0, headY + .035, 0); hood.scale.set(.645, .63, .48);
      const rim = [];
      for (let i = 0; i <= 64; i++) {
        const angle = i / 64 * Math.PI * 2, x = .84 * Math.cos(angle), y = -.08 + .8 * Math.sin(angle);
        rim.push([x * .645, headY + .035 + y * .63, -.48 * Math.sqrt(Math.max(.003, 1 - x * x - y * y)) - .012]);
      }
      stroke(cap, rim, .026, capMat, 64);
      for (const side of [-1, 1]) {
        const lobe = orb(cap, side * .256, headY + .56, -.135, .178, .146, .16, capMat);
        lobe.rotation.z = -side * .22;
        const inset = orb(cap, side * .256, headY + .573, -.301, .107, .077, .018, heroYellow, true);
        inset.rotation.z = -side * .22;
        tapered(cap, [[side * .555, headY + .18, -.16], [side * .57, headY + .09, -.245],
          [side * .51, headY + .035, -.286]], .049, .01, white);
      }
    } else {
      const dome = mesh(cap, new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), capMat, 0, headY + .38, .035);
      dome.scale.set(width * 1.065, .27, depth * 1.07);
      orb(cap, 0, headY + .38, -depth * .66, width * .83, .031, .31, capMat);
      stroke(cap, [[0, headY + .64, .015], [0, headY + .59, -.23], [0, headY + .4, -depth]], .01, sole);
      orb(cap, 0, headY + .66, .025, .045, .025, .045, capMat);
    }
    parent.add(cap);
    const star = group(), shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .085 : .18;
      if (!i) shape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    shape.closePath();
    const emblemGeometry = new THREE.ExtrudeGeometry(shape, {depth: .027, bevelEnabled: true, bevelSize: .01, bevelThickness: .008, bevelSegments: 3});
    const front = mesh(star, emblemGeometry, gold, .24, 1.06, kind === 'pig' ? -.355 : -.46);
    front.rotation.y = Math.PI;
    orb(star, .24, 1.06, front.position.z - .055, .036, .036, .016, teal, true);
    const back = mesh(star, emblemGeometry, gold, .17, 1.15, kind === 'pig' ? .43 : .46);
    orb(star, .17, 1.15, back.position.z + .05, .036, .036, .016, teal, true);
    parent.add(star);
    const cat = group();
    stroke(cat, [[-width * .85, headY + .08, .035], [-width * .65, headY + .43, .035],
      [0, headY + .58, .035], [width * .65, headY + .43, .035], [width * .85, headY + .08, .035]], .032, capMat);
    for (const side of [-1, 1]) ear(cat, side * width * .68, headY + .44, -.035, .13, .27, capMat, blush, -side * .13);
    parent.add(cat);
    const phones = group(), violet = surface(0x72658f, .42, .15), pad = surface(0x34394e, .78);
    stroke(phones, [[-width - .035, headY, .04], [-width * .87, headY + .38, .04],
      [0, headY + .6, .04], [width * .87, headY + .38, .04], [width + .035, headY, .04]], .043, violet);
    for (const side of [-1, 1]) {
      orb(phones, side * (width + .035), headY, .035, .09, .165, .15, pad);
      orb(phones, side * (width + .097), headY, .035, .038, .138, .126, violet);
      orb(phones, side * (width + .133), headY, .035, .014, .091, .085, teal, true);
    }
    parent.add(phones);
    const crown = group();
    mesh(crown, new THREE.CylinderGeometry(width * .59, width * .64, .12, 32, 1, true), gold, 0, headY + .6);
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5, x = Math.sin(angle) * width * .59, z = Math.cos(angle) * width * .59;
      mesh(crown, new THREE.ConeGeometry(.08, .2, 8), gold, x, headY + .73, z);
      orb(crown, x, headY + .83, z, .032, .032, .032, sole);
      if (z < 0) orb(crown, x, headY + .6, z - .017, .038, .036, .018, teal, true);
    }
    parent.add(crown); return {cap, star, cat, phones, crown};
  }

  // Tall, soft egg head, small green-ringed eyes, tiny mouth and an oversized cream belly.
  {
    const b = group(); runner.add(b); b.userData.kind = 'dragon';
    const profile = new THREE.CatmullRomCurve3([[0, .21], [.29, .26], [.45, .45], [.56, .76], [.55, 1.07],
      [.44, 1.33], [.405, 1.47], [.48, 1.61], [.575, 1.9], [.6, 2.1], [.51, 2.35], [.32, 2.53], [0, 2.59]]
      .map(([x, y]) => new THREE.Vector3(x, y, 0))).getPoints(84).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
    const skinGeometry = new THREE.LatheGeometry(profile, 48); skinGeometry.scale(1, 1, .82);
    const vertices = skinGeometry.attributes.position, indices = skinGeometry.index.array, torso = [], head = [];
    for (let i = 0; i < indices.length; i += 3) {
      const target = (vertices.getY(indices[i]) + vertices.getY(indices[i + 1]) + vertices.getY(indices[i + 2])) / 3 < 1.49 ? torso : head;
      target.push(indices[i], indices[i + 1], indices[i + 2]);
    }
    skinGeometry.clearGroups(); skinGeometry.setIndex([...torso, ...head]);
    skinGeometry.addGroup(0, torso.length, 0); skinGeometry.addGroup(torso.length, head.length, 1);
    mesh(b, skinGeometry, [shirtMat, yellow]);
    const front = (x, y) => {
      let i = profile.findIndex(p => p.y >= y); i = Math.max(1, i < 0 ? profile.length - 1 : i);
      const a = profile[i - 1], bb = profile[i], radius = a.x + (bb.x - a.x) * (y - a.y) / (bb.y - a.y);
      return -.82 * Math.sqrt(Math.max(.003, radius * radius - x * x));
    };
    softBelly(b, .86, .425, .54, 'rgba(255,237,192,1)', front);
    eyes(b, 2.025, -.449, .249, .126, 0x91b84e, 'dragon');
    const mouth = group(); mouth.position.set(0, 1.74, -.481); mouth.userData.pose = 'mouth';
    orb(mouth, 0, 0, 0, .043, .035, .009, surface(0x694637), true);
    orb(mouth, 0, -.012, -.008, .019, .007, .003, surface(0xcd856b), true); b.add(mouth);
    const tail = group(); tail.userData.pose = 'tail';
    tapered(tail, [[0, .68, .33], [.08, .47, .62], [.21, .31, .94], [.33, .36, 1.15]], .218, .046, yellow);
    b.add(tail);
    models.alo = {body: b, limbs: limbs(b, yellow, .51, .265, 1.29, .38, 'dragon'),
      accessories: accessories(b, 1.95, .56, .45, 'dragon'), tail, kind: 'dragon'};
  }
  // The blue-purple meme cat selected by the player: pink face, lashes, red lips and feathered ears.
  {
    const b = group(); runner.add(b); b.userData.kind = 'cat';
    pear(b, .87, .63, .63, .495, shirtMat);
    orb(b, 0, 1.3, .005, .4, .25, .32, blue);
    orb(b, 0, 1.81, 0, .685, .59, .465, blue);
    softBelly(b, .86, .432, .51, 'rgba(222,169,213,1)', frontOf(.87, .63, .63, .495, true, .015));
    const faceFront = frontOf(1.81, .685, .59, .465);
    const face = new THREE.Shape();
    face.moveTo(0, 1.98); face.bezierCurveTo(-.13, 2.27, -.38, 2.24, -.49, 2.02);
    face.bezierCurveTo(-.57, 1.83, -.52, 1.53, -.33, 1.4);
    face.quadraticCurveTo(0, 1.25, .33, 1.4); face.bezierCurveTo(.52, 1.53, .57, 1.83, .49, 2.02);
    face.bezierCurveTo(.38, 2.24, .13, 2.27, 0, 1.98); painted(b, face, catPink, faceFront);
    const ink = surface(0x1c152d, .7), iris = surface(0x6b667c, .35, .28), lip = surface(0xb82e60, .46, .18);
    for (const side of [-1, 1]) {
      ear(b, side * .56, 2.115, .015, .165, .39, blue, catPink, -side * .38);
      ear(b, side * .655, 2.115, .04, .105, .30, blue, catPink, -side * .86);
      ear(b, side * .68, 2.06, .06, .09, .255, blue, catPink, -side * 1.19);
      const cheek = new THREE.Shape(); cheek.absellipse(side * .49, 1.645, .097, .049, 0, Math.PI * 2, false, -side * .27);
      painted(b, cheek, blueStripe, faceFront, .015);
      const cheekUpper = new THREE.Shape(); cheekUpper.absellipse(side * .505, 1.755, .076, .037, 0, Math.PI * 2, false, side * .16);
      painted(b, cheekUpper, blueStripe, faceFront, .015);
      const cx = side * .267, cy = 1.984, cz = faceFront(cx, cy) - .024;
      const eye = group(); eye.position.set(cx, cy, cz); eye.userData.pose = 'eye';
      const shape = new THREE.Shape();
      shape.moveTo(cx - side * .164, cy - .026);
      shape.quadraticCurveTo(cx - side * .04, cy + .127, cx + side * .172, cy + .046);
      shape.quadraticCurveTo(cx + side * .02, cy - .103, cx - side * .164, cy - .026);
      const sclera = painted(eye, shape, white, faceFront, .025); sclera.geometry.translate(-cx, -cy, -cz);
      orb(eye, -side * .005, 0, -.016, .086, .094, .027, iris, true);
      orb(eye, -side * .008, 0, -.039, .057, .071, .018, ink, true);
      orb(eye, -.025, .035, -.057, .014, .019, .005, white, true);
      orb(eye, .023, -.029, -.057, .007, .009, .004, white, true);
      const lidPoints = [[cx - side * .164, cy - .026], [cx - side * .07, cy + .06],
        [cx + side * .045, cy + .092], [cx + side * .172, cy + .046]];
      stroke(eye, lidPoints.map(([x, y]) => [x - cx, y - cy, faceFront(x, y) - .034 - cz]), .013, ink);
      for (let lash = 0; lash < 7; lash++) {
        const x = cx + side * (-.03 + lash * .029), y = cy + .088 - Math.max(0, lash - 2) * .007;
        const z = faceFront(x, y) - .042;
        stroke(eye, [[x - cx, y - cy, z - cz], [x - cx + side * .022, y - cy + .045, z - cz - .015],
          [x - cx + side * .028, y - cy + .092, z - cz + .002]], .01, ink, 8);
      }
      b.add(eye);
      const browPoints = [[side * .095, 2.177], [side * .245, 2.235], [side * .42, 2.177]];
      stroke(b, browPoints.map(([x, y]) => [x, y, faceFront(x, y) - .028]), .022, ink, 18);
    }
    orb(b, 0, 1.769, faceFront(0, 1.769) - .027, .046, .034, .02, ink, true);
    const lips = new THREE.Shape();
    lips.moveTo(-.168, 1.59); lips.quadraticCurveTo(-.082, 1.676, 0, 1.635);
    lips.quadraticCurveTo(.082, 1.676, .168, 1.59); lips.quadraticCurveTo(.074, 1.502, 0, 1.526);
    lips.quadraticCurveTo(-.074, 1.502, -.168, 1.59); painted(b, lips, lip, faceFront, .027);
    stroke(b, [[-.126, 1.594], [0, 1.589], [.126, 1.594]].map(([x, y]) => [x, y, faceFront(x, y) - .038]), .011, ink);
    stroke(b, [[-.065, 1.62], [0, 1.624], [.065, 1.62]].map(([x, y]) => [x, y, faceFront(x, y) - .036]), .008, white);
    stroke(b, [[-.051, 1.548], [0, 1.542], [.047, 1.548]].map(([x, y]) => [x, y, faceFront(x, y) - .037]), .007, surface(0xec81ab));
    const collar = mesh(b, new THREE.TorusGeometry(.343, .057, 12, 40), blueStripe, 0, 1.34, .005);
    collar.rotation.x = Math.PI / 2; collar.scale.y = .8;
    orb(b, 0, 1.288, -.348, .085, .046, .025, blueStripe);
    const tail = group(); tail.userData.pose = 'tail';
    tapered(tail, [[0, .6, .4], [.27, .37, .72], [.51, .6, .8], [.46, .87, .69]], .117, .078, blue, blueStripe);
    b.add(tail);
    models.mia = {body: b, limbs: limbs(b, catPink, .595, .28, 1.22, .4, 'cat'),
      accessories: accessories(b, 1.81, .665, .45, 'cat'), tail, kind: 'cat'};
  }
  // A full red hood with yellow padded lobes, expressive smile, round red suit and yellow boots.
  {
    const b = group(); runner.add(b); b.userData.kind = 'pig';
    pear(b, .98, .468, .515, .36, shirtMat);
    orb(b, 0, .59, .025, .34, .2, .285, pantsMat);
    orb(b, 0, 1.36, .01, .27, .16, .23, pink);
    orb(b, 0, 1.845, 0, .596, .535, .452, pink);
    const faceFront = frontOf(1.845, .596, .535, .452), browMat = surface(0x382329);
    for (const side of [-1, 1]) {
      orb(b, side * .365, 1.714, faceFront(side * .365, 1.714) - .012, .071, .032, .012, blush, true);
      stroke(b, [[side * .12, 2.161], [side * .247, 2.211], [side * .356, 2.167]]
        .map(([x, y]) => [x, y, faceFront(x, y) - .026]), .027, browMat);
    }
    eyes(b, 1.994, -.408, .231, .137, 0x765137, 'pig');
    orb(b, 0, 1.746, -.462, .214, .133, .093, pink);
    orb(b, 0, 1.736, -.537, .173, .086, .024, surface(0xf4b29f), true);
    for (const side of [-1, 1])
      orb(b, side * .075, 1.749, -.563, .024, .036, .008, surface(0xb56c70), true);
    const mouth = new THREE.Shape(); mouth.moveTo(-.164, 1.581);
    mouth.quadraticCurveTo(0, 1.6, .164, 1.581); mouth.quadraticCurveTo(.132, 1.448, 0, 1.439);
    mouth.quadraticCurveTo(-.132, 1.448, -.164, 1.581); painted(b, mouth, surface(0x633d48), faceFront, .018);
    const teeth = new THREE.Shape(); teeth.moveTo(-.141, 1.579); teeth.quadraticCurveTo(0, 1.593, .141, 1.579);
    teeth.lineTo(.12, 1.542); teeth.quadraticCurveTo(0, 1.532, -.12, 1.542); teeth.closePath();
    painted(b, teeth, white, faceFront, .023);
    orb(b, 0, 1.47, faceFront(0, 1.47) - .025, .067, .018, .01, blush, true);
    for (const side of [-1, 1]) orb(b, side * .113, 1.292, -.285, .047, .047, .021, heroYellow, true);
    orb(b, 0, .974, -.352, .153, .105, .034, heroYellow);
    for (const side of [-1, 1]) {
      orb(b, side * .046, .976, -.383, .018, .033, .008, shirtMat, true);
    }
    const tail = group(); tail.userData.pose = 'tail';
    const curl = mesh(tail, new THREE.TorusGeometry(.079, .023, 10, 28, Math.PI * 1.85), pink, 0, .61, .369);
    curl.rotation.y = .2; b.add(tail);
    models.bei = {body: b, limbs: limbs(b, heroYellow, .444, .213, 1.32, .42, 'pig'),
      accessories: accessories(b, 1.845, .59, .455, 'pig'), tail, kind: 'pig'};
  }
  for (const model of Object.values(models)) {
    model.body.visible = false;
    for (const accessory of Object.values(model.accessories)) accessory.visible = false;
  }
  return models;
};

/* Cached parts also work on the cloned wardrobe portrait, without cloning materials. */
window.animateMascot = (() => {
  const parts = new WeakMap(), offsets = {dragon: .8, cat: 2.3, pig: 3.7};
  return function (root, time, idle = false, portrait = false) {
    if (!parts.has(root)) {
      const rig = {eyes: [], arms: [], legs: [], mouth: null, tail: null};
      root.traverse(node => {
        if (node.userData.pose === 'eye') rig.eyes.push(node);
        else if (node.userData.pose === 'arm') rig.arms.push(node);
        else if (node.userData.pose === 'leg') rig.legs.push(node);
        else if (node.userData.pose === 'mouth') rig.mouth = node;
        else if (node.userData.pose === 'tail') rig.tail = node;
      });
      parts.set(root, rig);
    }
    const rig = parts.get(root), phase = (time + offsets[root.userData.kind]) % 5.3;
    const blink = phase < .18 ? Math.sin(phase / .18 * Math.PI) : 0;
    for (const eye of rig.eyes) eye.scale.y = 1 - blink * .94;
    if (rig.mouth) rig.mouth.scale.y = idle ? 1 + Math.max(0, Math.sin(time * .8)) ** 8 * .8 : 1;
    for (const arm of rig.arms) {
      const greeting = idle && arm.userData.side === -1 ? Math.max(0, Math.sin(time * .8)) ** 8 : 0;
      arm.rotation.z = arm.userData.restZ - greeting * .36;
      if (portrait) arm.rotation.x = Math.sin(time * 2.6) * .07 * arm.userData.side;
    }
    if (idle && rig.tail) rig.tail.rotation.y = Math.sin(time * 3) * .11;
    if (portrait) {
      for (const leg of rig.legs) leg.rotation.x = 0;
    }
  };
})();
