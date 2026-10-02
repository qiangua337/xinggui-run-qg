/* Rounded, individually sculpted mascots. Clothing keeps the existing DIY materials. */
window.buildMascots = function ({round, capsule, group, shirtMat, pantsMat, shoesMat, capMat, runner}) {
  const surface = (color, roughness = .48, coat = .12, metalness = 0) =>
    new THREE.MeshPhysicalMaterial({color, roughness, metalness, clearcoat: coat, clearcoatRoughness: .32});
  const yellow = surface(0xffcd38, .43, .22);
  const cream = surface(0xffe9ab, .63);
  const blue = surface(0x5dace1, .57);
  const blueStripe = surface(0x3984b7, .58);
  const white = surface(0xfffaf1, .46, .15);
  const pink = surface(0xf8bdab, .5, .13);
  const blush = surface(0xf5a29d, .64);
  const dark = surface(0x493d48, .52);
  const gold = surface(0xffce64, .3, .32, .3);
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
    const irisMat = surface(irisColor, .26, .48), pupilMat = surface(0x202932, .22, .48);
    for (const side of [-1, 1]) {
      const eye = group(); eye.position.set(side * spacing, y, z);
      eye.rotation.y = -side * .2; eye.userData.pose = 'eye'; eye.userData.side = side;
      orb(eye, 0, 0, .014, size * 1.07, size * 1.19, .075, kind === 'cat' ? blueStripe : cream, true);
      orb(eye, 0, 0, 0, size, size * 1.13, .086, white, true);
      orb(eye, -side * .009, -.008, -.075, size * .66, size * .77, .027, irisMat, true);
      orb(eye, -side * .012, -.008, -.096, size * .38, size * .56, .018, pupilMat, true);
      orb(eye, -size * .22, size * .32, -.112, size * .17, size * .2, .01, white, true);
      orb(eye, size * .22, -size * .24, -.112, size * .075, size * .09, .007, white, true);
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
      capsule(arm, 0, -.22, -.008, width * .87, .12, skin);
      orb(arm, 0, -.335, -.025, width * 1.05, .14, width * 1.08, skin);
      orb(arm, -side * .075, -.31, -.055, .055, .073, .065, skin);
      if (pig) {
        const cuff = mesh(arm, new THREE.TorusGeometry(.108, .027, 8, 24), gold, 0, -.245, 0);
        cuff.rotation.x = Math.PI / 2;
        orb(arm, 0, -.34, -.134, .045, .031, .012, sole, true);
      } else {
        for (let finger = -1; finger <= 1; finger++)
          stroke(arm, [[finger * .045, -.355, -.16], [finger * .045, -.388, -.139]], .006, kind === 'cat' ? blueStripe : cream, 6);
      }
      parent.add(arm);
      const leg = group(); leg.position.set(side * hip, legY, .005); leg.userData.pose = 'leg';
      capsule(leg, 0, -.115, 0, pig ? .132 : .16, .095, pantsMat);
      orb(leg, 0, -.25, -.07, pig ? .168 : .21, .145, .26, shoesMat);
      orb(leg, 0, -.352, -.07, pig ? .173 : .214, .036, .268, sole);
      orb(leg, 0, -.23, -.291, pig ? .08 : .12, .024, .023, sole, true);
      if (pig) orb(leg, 0, -.16, -.085, .153, .075, .192, shoesMat);
      else for (let toe = -1; toe <= 1; toe++)
        orb(leg, toe * .065, -.256, -.318, .022, .012, .009, kind === 'cat' ? white : cream, true);
      parent.add(leg); result.push({arm, leg, side});
    }
    return result;
  }
  function accessories(parent, headY, width, depth, kind) {
    const cap = group();
    const dome = mesh(cap, new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), capMat, 0, headY + .31, .035);
    dome.scale.set(width * 1.065, kind === 'pig' ? .34 : .27, depth * 1.07);
    if (kind === 'pig') {
      stroke(cap, [[-.49, headY + .31, -.2], [-.28, headY + .325, -.4],
        [0, headY + .34, -.454], [.28, headY + .325, -.4], [.49, headY + .31, -.2]], .018, gold);
      orb(cap, 0, headY + .48, -.395, .112, .117, .033, gold);
      orb(cap, 0, headY + .48, -.429, .055, .061, .012, capMat, true);
      for (const side of [-1, 1]) orb(cap, side * .023, headY + .48, -.443, .009, .016, .006, gold, true);
    } else {
      orb(cap, 0, headY + .31, -depth * .66, width * .83, .031, .31, capMat);
      stroke(cap, [[0, headY + .57, .015], [0, headY + .52, -.23], [0, headY + .33, -depth]], .01, sole);
      orb(cap, 0, headY + .59, .025, .045, .025, .045, capMat);
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

  // Soft pear silhouette, large expressive eyes, broad muzzle and a continuous tail.
  {
    const b = group(); runner.add(b); b.userData.kind = 'dragon';
    pear(b, .88, .57, .65, .45, shirtMat);
    orb(b, 0, 1.29, .015, .4, .25, .34, yellow);
    orb(b, 0, .79, -.401, .4, .43, .072, cream);
    orb(b, 0, 1.77, 0, .66, .555, .485, yellow);
    orb(b, 0, 1.535, -.423, .51, .241, .26, yellow);
    orb(b, 0, 1.385, -.483, .31, .07, .105, cream);
    eyes(b, 1.86, -.442, .25, .162, 0x82ba4d, 'dragon');
    for (const side of [-1, 1]) {
      orb(b, side * .18, 1.585, -.676, .03, .021, .009, surface(0xc58c31), true);
      orb(b, side * .421, 1.59, -.558, .078, .034, .012, surface(0xffb578), true);
      stroke(b, [[side * .35, 2.075, -.351], [side * .25, 2.096, -.403], [side * .15, 2.08, -.414]], .02, surface(0xd9a43b));
      const horn = group();
      tapered(horn, [[side * .36, 2.235, .06], [side * .375, 2.33, .045], [side * .4, 2.38, .07]], .067, .025, gold);
      b.add(horn);
    }
    smile(b, 0, 1.449, -.666, .145, surface(0x9d6c32));
    orb(b, 0, 1.417, -.661, .055, .016, .012, surface(0xe7a276), true);
    const tail = group(); tail.userData.pose = 'tail';
    tapered(tail, [[0, .65, .35], [.1, .5, .7], [.25, .4, 1.08], [.4, .45, 1.3]], .22, .057, yellow);
    b.add(tail);
    for (let i = 0; i < 4; i++) {
      const spike = orb(b, 0, 1.4 - i * .21, .4 + i * .075, .063, .11, .1, gold);
      spike.rotation.x = -.5;
    }
    models.alo = {body: b, limbs: limbs(b, yellow, .53, .27, 1.21, .39, 'dragon'),
      accessories: accessories(b, 1.77, .61, .46, 'dragon'), tail, kind: 'dragon'};
  }
  // Rounded ears, plush blue cheeks, bright eyes, white paws and a curling tail.
  {
    const b = group(); runner.add(b); b.userData.kind = 'cat';
    pear(b, .84, .62, .59, .49, shirtMat);
    orb(b, 0, 1.26, .005, .4, .22, .33, blue);
    orb(b, 0, .73, -.439, .425, .36, .077, white);
    orb(b, 0, 1.73, 0, .735, .565, .5, blue);
    for (const side of [-1, 1]) {
      ear(b, side * .44, 2.115, .015, .178, .37, blue, blush, -side * .16);
      orb(b, side * .57, 1.59, -.156, .16, .22, .21, blue);
      orb(b, side * .16, 1.542, -.494, .232, .162, .101, white);
      orb(b, side * .435, 1.58, -.432, .065, .028, .009, blush, true);
      for (let n = -1; n <= 1; n++)
        stroke(b, [[side * .33, 1.552 + n * .044, -.559], [side * .5, 1.556 + n * .061, -.512],
          [side * .68, 1.57 + n * .081, -.389]], .007, surface(0x456a89), 12);
    }
    eyes(b, 1.825, -.454, .234, .141, 0x4f8cb5, 'cat');
    const noseShape = new THREE.Shape();
    noseShape.moveTo(-.062, .025); noseShape.quadraticCurveTo(0, .065, .062, .025);
    noseShape.quadraticCurveTo(.033, -.023, 0, -.035); noseShape.quadraticCurveTo(-.033, -.023, -.062, .025);
    mesh(b, new THREE.ExtrudeGeometry(noseShape, {depth: .015, bevelEnabled: true, bevelSize: .009,
      bevelThickness: .007, bevelSegments: 3, curveSegments: 12}), blush, 0, 1.577, -.613);
    stroke(b, [[0, 1.544, -.617], [0, 1.505, -.606], [-.08, 1.478, -.586], [-.132, 1.514, -.579]], .011, dark);
    stroke(b, [[0, 1.505, -.606], [.08, 1.478, -.586], [.132, 1.514, -.579]], .011, dark);
    for (let i = -1; i <= 1; i++)
      stroke(b, [[i * .104, 2.256, -.122], [i * .112, 2.205, -.242], [i * .117, 2.117, -.339]], .023, blueStripe, 12);
    const tail = group(); tail.userData.pose = 'tail';
    tapered(tail, [[0, .57, .39], [.32, .34, .77], [.63, .49, .91], [.69, .86, .84], [.57, 1.02, .68]],
      .109, .086, blue, blueStripe);
    b.add(tail);
    models.mia = {body: b, limbs: limbs(b, white, .57, .285, 1.12, .39, 'cat'),
      accessories: accessories(b, 1.73, .68, .47, 'cat'), tail, kind: 'cat'};
  }
  // Warm pig face, tailored superhero suit, a sculpted hood, metallic trims and cloth cape.
  {
    const b = group(); runner.add(b); b.userData.kind = 'pig';
    pear(b, 1.0, .41, .49, .315, shirtMat);
    orb(b, 0, .57, .025, .32, .21, .28, pantsMat);
    orb(b, 0, 1.34, .01, .27, .18, .24, pink);
    orb(b, 0, 1.825, 0, .563, .54, .434, pink);
    for (const side of [-1, 1]) {
      const e = orb(b, side * .543, 1.968, .012, .122, .157, .092, pink);
      e.rotation.z = -side * .36;
      const inset = orb(b, side * .563, 1.98, -.062, .057, .091, .023, blush, true);
      inset.rotation.z = -side * .36;
      orb(b, side * .365, 1.677, -.32, .074, .033, .016, blush, true);
      stroke(b, [[side * .327, 2.102, -.33], [side * .22, 2.129, -.393],
        [side * .116, 2.105, -.409]], .026, surface(0x72453d));
    }
    eyes(b, 1.925, -.39, .212, .135, 0x9b6a45, 'pig');
    orb(b, 0, 1.665, -.453, .237, .158, .127, pink);
    orb(b, 0, 1.652, -.557, .172, .09, .033, surface(0xf4b29f), true);
    for (const side of [-1, 1])
      orb(b, side * .081, 1.675, -.59, .025, .038, .009, surface(0xc9797c), true);
    smile(b, 0, 1.472, -.338, .153, surface(0x89514a));
    orb(b, 0, 1.46, -.353, .073, .022, .013, blush, true);
    const belt = mesh(b, new THREE.TorusGeometry(.349, .04, 10, 36), gold, 0, .743, .025);
    belt.rotation.x = Math.PI / 2; belt.scale.y = .81;
    orb(b, 0, .745, -.283, .092, .063, .035, gold);
    orb(b, 0, .745, -.318, .041, .028, .012, teal, true);
    orb(b, 0, 1.06, -.314, .147, .152, .036, gold);
    orb(b, 0, 1.06, -.35, .089, .069, .018, shirtMat, true);
    for (const side of [-1, 1]) {
      orb(b, side * .035, 1.062, -.371, .013, .021, .008, gold, true);
      stroke(b, [[side * .26, 1.28, -.214], [side * .297, 1.08, -.243],
        [side * .25, .87, -.25]], .013, gold);
    }
    const cape = group(); cape.userData.pose = 'tail';
    const capeGeometry = new THREE.PlaneGeometry(.9, .94, 12, 16), points = capeGeometry.attributes.position;
    for (let i = 0; i < points.count; i++) {
      const x = points.getX(i), y = points.getY(i), drop = (.47 - y) / .94;
      points.setXYZ(i, x * (.7 + drop * .3), y + .91, .35 + drop * .2 + Math.cos(x * 19) * drop * .027);
    }
    capeGeometry.computeVertexNormals();
    const capeMat = new THREE.MeshStandardMaterial({color: 0xc83c54, roughness: .79, side: THREE.DoubleSide});
    mesh(cape, capeGeometry, capeMat);
    stroke(cape, [[-.312, 1.38, .35], [-.38, .92, .454], [-.448, .44, .552],
      [0, .44, .573], [.448, .44, .552], [.38, .92, .454], [.312, 1.38, .35]], .012, gold, 36);
    mesh(cape, new THREE.TorusGeometry(.135, .014, 8, 32), gold, 0, .995, .467);
    orb(cape, 0, .98, .478, .076, .048, .013, gold, true);
    for (const side of [-1, 1]) orb(cape, side * .03, .982, .492, .009, .014, .006, capeMat, true);
    b.add(cape);
    mesh(b, new THREE.TorusGeometry(.076, .023, 8, 24, Math.PI * 1.8), pink, 0, .56, .325);
    models.bei = {body: b, limbs: limbs(b, gold, .39, .19, 1.3, .42, 'pig'),
      accessories: accessories(b, 1.825, .555, .434, 'pig'), tail: cape, kind: 'pig'};
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
      const rig = {eyes: [], arms: [], legs: [], tail: null};
      root.traverse(node => {
        if (node.userData.pose === 'eye') rig.eyes.push(node);
        else if (node.userData.pose === 'arm') rig.arms.push(node);
        else if (node.userData.pose === 'leg') rig.legs.push(node);
        else if (node.userData.pose === 'tail') rig.tail = node;
      });
      parts.set(root, rig);
    }
    const rig = parts.get(root), phase = (time + offsets[root.userData.kind]) % 5.3;
    const blink = phase < .18 ? Math.sin(phase / .18 * Math.PI) : 0;
    for (const eye of rig.eyes) eye.scale.y = 1 - blink * .94;
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
