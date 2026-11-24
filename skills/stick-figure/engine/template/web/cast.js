// ---------- cast.js : body builds, hairstyles and swimwear for the stick figure ----------
//
// The pack's drawStick() in chars.js has one body: a 0.25-wide bean, no hair, one outfit
// (a striped tee with a belt) and three pirate hats. This file adds the rest WITHOUT
// touching chars.js, which is a file in somebody else's git checkout.
//
// castFig(ctx, o) takes every option drawStick(o) takes, and adds:
//   build   slim | athletic | muscular | broad | curvy | petite        default slim
//   outfit  tee | tank | shirt | trunks | boardies | onePiece | bikini default tee
//   hair    a style name from HAIR, or 'none'                          default none
//   hairCol a name from HAIRCOL, or any css colour                     default darkBrown
//   skin    a name from SKIN, or any css colour                        default fair
//
// build slim + outfit tee + hair none draws exactly what drawStick draws, so a shot can
// be moved over one figure at a time.
//
// Depends on lib.js (INK, TAU, clamp, lerp, circle, ellipse, fillStroke, shadeShape)
// and chars.js (drawFace, limbPts, ik, PAL, HEAD, HEAD_SH).

const SKIN = {
  porcelain: '#faf4ec', fair: '#f6f2ea', light: '#eedcc6', tan: '#ddb792',
  olive: '#c89c70', brown: '#a3703f', deep: '#7d4e2a', dark: '#5b3720',
};
const SKIN_SH = {
  porcelain: '#e4dbd0', fair: '#dcd5ca', light: '#d4bfa6', tan: '#c09873',
  olive: '#a87f55', brown: '#85592e', deep: '#63391c', dark: '#452716',
};
const skinOf = c => SKIN[c] || c || SKIN.fair;
const skinShOf = c => SKIN_SH[c] || (SKIN[c] ? SKIN_SH[c] : null) || HEAD_SH;

const HAIRCOL = {
  // natural
  black: '#1b1714', darkBrown: '#2b1d18', brown: '#4a3326', chestnut: '#6b4423',
  auburn: '#7a3b20', ginger: '#c05a1c', sand: '#c9a473', blonde: '#dcb45c',
  lightBlonde: '#ecd392', platinum: '#e9dfc6',
  // greying
  ash: '#9a8f84', grey: '#b3aea8', silver: '#cfd4d7', white: '#e9e6e0',
  // dyed
  red: '#b02a1d', brightRed: '#d22b1a', plum: '#7b2d4e', pink: '#d4588f',
  brightPink: '#ff5fa2', blue: '#3a62a8', teal: '#2f8f82', violet: '#7a4bc4',
};

// Two ready-made shortlists, for when you just want a few that read differently.
const HAIRCOL_WOMEN = ['blonde', 'red', 'plum', 'brightPink'];
const HAIRCOL_MEN = ['grey', 'silver', 'blonde', 'red'];

const hairOf = c => HAIRCOL[c] || c || HAIRCOL.darkBrown;

// Every width is a half-width, measured from the spine, in the same unit space drawStick
// uses: feet at y 0, hips at -.3, shoulders at -.535, head centre -.765, head radius .19.
const BUILD = {
  slim:     { sh: .125, chest: .125, waist: .125, hip: .125, lw: .028, top: -.62, rect: 1 },
  athletic: { sh: .150, chest: .146, waist: .112, hip: .122, lw: .032, top: -.630, pecs: .7, delt: 1.0 },
  muscular: { sh: .174, chest: .167, waist: .124, hip: .133, lw: .038, top: -.645, pecs: 1.0, delt: 1.5 },
  broad:    { sh: .146, chest: .157, waist: .165, hip: .155, lw: .034, top: -.620, pecs: .3, belly: 1 },
  curvy:    { sh: .117, chest: .141, waist: .103, hip: .153, lw: .027, top: -.615, bust: 1 },
  petite:   { sh: .107, chest: .114, waist: .100, hip: .117, lw: .025, top: -.600, bust: .5, k: .93 },
};
const buildOf = b => BUILD[b] || BUILD.slim;

const TORSO_BOT = -.27;

function torsoPath(ctx, B) {
  const top = B.top, bot = TORSO_BOT;
  if (B.rect) { ctx.beginPath(); ctx.roundRect(-B.sh, top, B.sh * 2, bot - top, [.1, .1, .12, .12]); return; }
  const yC = lerp(top, bot, .30), yW = lerp(top, bot, .68);
  ctx.beginPath();
  ctx.moveTo(-B.sh + .018, top);
  ctx.quadraticCurveTo(0, top - .024, B.sh - .018, top);
  ctx.quadraticCurveTo(B.chest + .004, top + .014, B.chest, yC);
  ctx.quadraticCurveTo(B.waist - .002, yW - .035, B.waist, yW);
  ctx.quadraticCurveTo(B.hip + .002, yW + .03, B.hip, bot - .035);
  ctx.quadraticCurveTo(B.hip, bot, B.hip - .035, bot);
  ctx.lineTo(-B.hip + .035, bot);
  ctx.quadraticCurveTo(-B.hip, bot, -B.hip, bot - .035);
  ctx.quadraticCurveTo(-B.hip - .002, yW + .03, -B.waist, yW);
  ctx.quadraticCurveTo(-B.waist + .002, yW - .035, -B.chest, yC);
  ctx.quadraticCurveTo(-B.chest - .004, top + .014, -B.sh + .018, top);
  ctx.closePath();
}

// ---------- outfits ----------
// Each outfit is one entry in OUTFIT. `paint` runs inside a clip of the torso path, so it
// can fill carelessly. Three outfits need room outside that clip and declare it:
//   skirt  a hem below the torso, drawn after the legs and before the torso
//   hood   a shape behind the head, drawn before the body, in body space (a hood does not
//          turn with the head)
//   sleeve 1 = the whole arm takes the garment colour, .5 = the upper arm only

const hex2 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function tint(a, b, k) {
  if (a[0] !== '#' || b[0] !== '#') return a;
  const A = hex2(a), B = hex2(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
}
const dark = (c, k = .22) => tint(c, '#1a1016', k);
const light = (c, k = .22) => tint(c, '#ffffff', k);
const SHIRT_W = '#f4f1ea';

function skirtPath(ctx, B, yTop, yHem, wHem) {
  const wT = B.hip * 1.03;
  ctx.beginPath();
  ctx.moveTo(-wT, yTop); ctx.lineTo(wT, yTop);
  ctx.quadraticCurveTo(wHem * .97, yHem - .055, wHem, yHem - .014);
  ctx.quadraticCurveTo(0, yHem + .038, -wHem, yHem - .014);
  ctx.quadraticCurveTo(-wHem * .97, yHem - .055, -wT, yTop);
  ctx.closePath();
}

function hoodPath(ctx) {
  // a hood lying down: a soft lump bunched behind the neck, not a cowl round the face
  ctx.beginPath();
  ctx.ellipse(0, HY + HR * 1.10, HR * 1.32, HR * .86, 0, 0, TAU);
}

// a jacket worn open: a light shirt panel down the middle, the jacket either side,
// and two lapels folded back off the collar. Shared by business, smart, tux and coat.
function jacketFront(ctx, B, P, jac, shirtCol, lapelCol) {
  const { top, bot, W2 } = P;
  ctx.fillStyle = jac; ctx.fillRect(-W2, top - .02, W2 * 2, (bot - top) + .05);
  ctx.fillStyle = shirtCol;                       // the shirt showing through
  ctx.beginPath();
  ctx.moveTo(-B.sh * .40, top - .02); ctx.lineTo(B.sh * .40, top - .02);
  ctx.lineTo(B.sh * .24, bot + .02); ctx.lineTo(-B.sh * .24, bot + .02);
  ctx.closePath(); ctx.fill();
  for (const side of [-1, 1]) {                   // lapels
    ctx.beginPath();
    ctx.moveTo(side * B.sh * .42, top - .02);
    ctx.lineTo(side * B.sh * .20, top + .165);
    ctx.lineTo(side * B.sh * .86, top + .085);
    ctx.closePath();
    ctx.fillStyle = lapelCol; ctx.fill();
    ctx.lineWidth = .010; ctx.strokeStyle = dark(jac, .35); ctx.stroke();
  }
}

const OUTFIT = {
  tee: {
    paint(c, B, P) {
      const { cols, top, W2, bot } = P;
      c.fillStyle = cols[0]; c.fillRect(-W2, top - .02, W2 * 2, bot - top + .05);
      if (cols[1] !== cols[0]) {
        c.fillStyle = cols[1];
        for (let i = 0; i < 7; i++) c.fillRect(-W2, top + .035 + i * .07, W2 * 2, .035);
      }
    },
  },

  tank: {
    paint(c, B, P) {
      OUTFIT.tee.paint(c, B, P);
      const { skin, top } = P;
      c.fillStyle = skin;
      for (const side of [-1, 1]) {
        c.beginPath(); c.moveTo(side * (B.sh + .03), top - .02); c.lineTo(side * B.sh * .34, top - .02);
        c.quadraticCurveTo(side * B.sh * .66, top + .105, side * (B.sh + .03), top + .185);
        c.closePath(); c.fill();
      }
      c.beginPath(); c.moveTo(-B.sh * .34, top - .02);
      c.quadraticCurveTo(0, top + .075, B.sh * .34, top - .02); c.closePath(); c.fill();
    },
  },

  shirt: {
    sleeve: 1,
    paint(c, B, P) {
      const { cols, skin, top, bot, W2 } = P;
      c.fillStyle = cols[0]; c.fillRect(-W2, top - .02, W2 * 2, bot - top + .05);
      if (cols[1] !== cols[0]) {
        c.fillStyle = cols[1];
        for (let i = 0; i < 7; i++) c.fillRect(-W2, top + .035 + i * .07, W2 * 2, .035);
      }
      c.fillStyle = skin;
      c.beginPath(); c.moveTo(-B.sh * .46, top - .02); c.lineTo(0, top + .115);
      c.lineTo(B.sh * .46, top - .02); c.closePath(); c.fill();
      c.lineWidth = .011; c.lineJoin = 'round';
      for (const side of [-1, 1]) {
        c.beginPath(); c.moveTo(side * B.sh * .46, top - .01);
        c.lineTo(side * B.sh * .20, top + .105); c.lineTo(side * B.sh * .62, top + .075);
        c.closePath(); c.fillStyle = cols[0]; c.fill(); c.strokeStyle = INK; c.stroke();
      }
      c.strokeStyle = 'rgba(0,0,0,.30)'; c.lineWidth = .008;
      c.beginPath(); c.moveTo(0, top + .115); c.lineTo(0, bot - .02); c.stroke();
      c.fillStyle = 'rgba(0,0,0,.28)';
      for (let i = 0; i < 3; i++) { circle(c, 0, top + .175 + i * .062, .010); c.fill(); }
    },
  },

  classic: {                                      // a knit polo, collar and tipped hem
    sleeve: .5,
    paint(c, B, P) {
      const { cols, top, bot, W2 } = P;
      const trim = cols[1] !== cols[0] ? cols[1] : light(cols[0], .34);
      c.fillStyle = cols[0]; c.fillRect(-W2, top - .02, W2 * 2, bot - top + .05);
      c.fillStyle = trim; c.fillRect(-W2, bot - .042, W2 * 2, .042);      // hem band
      c.fillStyle = dark(cols[0], .10);
      c.beginPath(); c.moveTo(-B.sh * .34, top - .02); c.lineTo(0, top + .105);
      c.lineTo(B.sh * .34, top - .02); c.closePath(); c.fill();
      c.lineWidth = .011; c.lineJoin = 'round'; c.strokeStyle = INK;
      for (const side of [-1, 1]) {                                       // collar
        c.beginPath(); c.moveTo(side * B.sh * .40, top - .02);
        c.lineTo(side * B.sh * .16, top + .098); c.lineTo(side * B.sh * .70, top + .060);
        c.closePath(); c.fillStyle = trim; c.fill(); c.stroke();
      }
      c.fillStyle = 'rgba(0,0,0,.32)';
      for (let i = 0; i < 2; i++) { circle(c, 0, top + .135 + i * .055, .0095); c.fill(); }
    },
  },

  sport: {                                        // a jersey: raglan sleeves, neck trim
    paint(c, B, P) {
      const { cols, top, bot, W2 } = P;
      const alt = cols[1] !== cols[0] ? cols[1] : light(cols[0], .55);
      c.fillStyle = cols[0]; c.fillRect(-W2, top - .02, W2 * 2, bot - top + .05);
      c.fillStyle = alt;                                                  // shoulder yoke
      c.beginPath();
      c.moveTo(-(W2 + .02), top - .02); c.lineTo(W2 + .02, top - .02);
      c.lineTo(W2 + .02, top + .105);
      c.quadraticCurveTo(0, top + .168, -(W2 + .02), top + .105);
      c.closePath(); c.fill();
      c.fillStyle = cols[0];                                              // neck hole
      c.beginPath(); c.moveTo(-B.sh * .40, top - .02);
      c.quadraticCurveTo(0, top + .120, B.sh * .40, top - .02);
      c.closePath(); c.fill();
      c.fillStyle = alt;                                                  // side stripes
      for (const side of [-1, 1]) c.fillRect(side * (W2 - .028), top + .18, .024, .40);
      c.fillStyle = dark(cols[0], .18);                                   // yoke edge
      c.beginPath();
      c.moveTo(-(W2 + .02), top + .105);
      c.quadraticCurveTo(0, top + .168, W2 + .02, top + .105);
      c.lineTo(W2 + .02, top + .126);
      c.quadraticCurveTo(0, top + .189, -(W2 + .02), top + .126);
      c.closePath(); c.fill();
      c.fillStyle = alt; c.fillRect(-W2, bot - .034, W2 * 2, .034);
    },
  },

  hoodie: {
    sleeve: 1,
    hood: true,
    paint(c, B, P) {
      const { cols, top, bot, W2 } = P;
      c.fillStyle = cols[0]; c.fillRect(-W2, top - .02, W2 * 2, bot - top + .05);
      c.fillStyle = dark(cols[0], .20); c.fillRect(-W2, top - .02, W2 * 2, .055);  // neck
      c.fillStyle = dark(cols[0], .12); c.fillRect(-W2, bot - .048, W2 * 2, .048); // hem
      c.strokeStyle = dark(cols[0], .42); c.lineWidth = .011; c.lineCap = 'round';
      for (const side of [-1, 1]) {                                       // drawstrings
        c.beginPath(); c.moveTo(side * B.sh * .22, top + .035);
        c.quadraticCurveTo(side * B.sh * .30, top + .10, side * B.sh * .24, top + .145);
        c.stroke();
        circle(c, side * B.sh * .24, top + .158, .013); c.fillStyle = light(cols[0], .4); c.fill();
      }
      c.strokeStyle = dark(cols[0], .34); c.lineWidth = .010;              // pocket
      c.beginPath();
      c.moveTo(-B.waist * .78, bot - .145); c.lineTo(-B.waist * .62, bot - .055);
      c.lineTo(B.waist * .62, bot - .055); c.lineTo(B.waist * .78, bot - .145);
      c.stroke();
    },
  },

  knit: {                                         // a chunky jumper, ribbed collar and hem
    sleeve: 1,
    paint(c, B, P) {
      const { cols, top, bot, W2 } = P;
      c.fillStyle = cols[0]; c.fillRect(-W2, top - .02, W2 * 2, bot - top + .05);
      c.strokeStyle = dark(cols[0], .13); c.lineWidth = .008;
      for (let x = -W2; x < W2; x += .028) { c.beginPath(); c.moveTo(x, top); c.lineTo(x, bot); c.stroke(); }
      c.fillStyle = dark(cols[0], .20);
      c.fillRect(-W2, bot - .050, W2 * 2, .050);
      c.beginPath(); c.moveTo(-B.sh * .50, top - .02);
      c.quadraticCurveTo(0, top + .125, B.sh * .50, top - .02);
      c.lineTo(B.sh * .50, top + .055);
      c.quadraticCurveTo(0, top + .190, -B.sh * .50, top + .055);
      c.closePath(); c.fill();
    },
  },

  hipster: {                                      // a check overshirt open over a plain tee
    sleeve: 1,
    paint(c, B, P) {
      const { cols, top, bot, W2 } = P;
      const h = bot - top;
      c.fillStyle = SHIRT_W; c.fillRect(-W2, top - .02, W2 * 2, h + .05);
      c.fillStyle = cols[0];                                              // the two panels
      c.fillRect(-W2, top - .02, W2 - B.sh * .30, h + .05);
      c.fillRect(B.sh * .30, top - .02, W2, h + .05);
      c.save();                                                           // the check
      c.beginPath();
      c.rect(-W2, top - .02, W2 - B.sh * .30, h + .05);
      c.rect(B.sh * .30, top - .02, W2, h + .05);
      c.clip();
      c.strokeStyle = dark(cols[0], .40); c.lineWidth = .013;
      for (let y = top; y < bot + .02; y += .052) { c.beginPath(); c.moveTo(-W2, y); c.lineTo(W2, y); c.stroke(); }
      for (let x = -W2; x < W2; x += .052) { c.beginPath(); c.moveTo(x, top - .02); c.lineTo(x, bot + .03); c.stroke(); }
      c.strokeStyle = light(cols[0], .34); c.lineWidth = .006;
      for (let y = top + .026; y < bot + .02; y += .052) { c.beginPath(); c.moveTo(-W2, y); c.lineTo(W2, y); c.stroke(); }
      for (let x = -W2 + .026; x < W2; x += .052) { c.beginPath(); c.moveTo(x, top - .02); c.lineTo(x, bot + .03); c.stroke(); }
      c.restore();
      c.strokeStyle = INK; c.lineWidth = .010;                            // the open edges
      for (const side of [-1, 1]) {
        c.beginPath(); c.moveTo(side * B.sh * .30, top - .02); c.lineTo(side * B.sh * .30, bot + .02); c.stroke();
      }
    },
  },

  leather: {
    sleeve: 1,
    paint(c, B, P) {
      const { cols, top, bot, W2 } = P;
      const jac = dark(cols[0], .30);
      c.fillStyle = jac; c.fillRect(-W2, top - .02, W2 * 2, bot - top + .05);
      c.fillStyle = light(jac, .13);                                      // a sheen
      c.beginPath(); c.moveTo(-W2, top + .10); c.lineTo(-B.sh * .10, top - .02);
      c.lineTo(B.sh * .22, top - .02); c.lineTo(-W2, top + .26); c.closePath(); c.fill();
      c.strokeStyle = light(jac, .40); c.lineWidth = .010; c.lineCap = 'round';
      c.beginPath();                                                      // asymmetric zip
      c.moveTo(-B.waist * .40, bot + .01);
      c.quadraticCurveTo(B.sh * .12, top + .22, B.sh * .40, top + .03);
      c.stroke();
      circle(c, -B.waist * .40, bot + .005, .014); c.fillStyle = light(jac, .5); c.fill();
      c.lineWidth = .010; c.lineJoin = 'round';                           // flipped collar
      for (const side of [-1, 1]) {
        c.beginPath(); c.moveTo(side * B.sh * .38, top - .02);
        c.lineTo(side * B.sh * .12, top + .135); c.lineTo(side * B.sh * .82, top + .070);
        c.closePath(); c.fillStyle = light(jac, .22); c.fill(); c.strokeStyle = INK; c.stroke();
      }
    },
  },

  business: {
    sleeve: 1,
    paint(c, B, P) {
      const { cols, top, bot } = P;
      const jac = cols[0], tie = cols[1] !== cols[0] ? cols[1] : '#8c2733';
      jacketFront(c, B, P, jac, SHIRT_W, dark(jac, .18));
      c.fillStyle = tie;                                                  // knot and blade
      c.beginPath(); c.moveTo(-B.sh * .13, top + .055); c.lineTo(B.sh * .13, top + .055);
      c.lineTo(B.sh * .10, top + .115); c.lineTo(-B.sh * .10, top + .115); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-B.sh * .10, top + .115); c.lineTo(B.sh * .10, top + .115);
      c.lineTo(B.sh * .13, bot - .055); c.lineTo(0, bot - .022);
      c.lineTo(-B.sh * .13, bot - .055); c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,.30)'; circle(c, B.sh * .44, bot - .085, .011); c.fill();
    },
  },

  smart: {                                        // the same jacket, open, no tie
    sleeve: 1,
    paint(c, B, P) {
      const { cols, top } = P;
      jacketFront(c, B, P, cols[0], SHIRT_W, dark(cols[0], .18));
      c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = .008;
      c.beginPath(); c.moveTo(0, top + .13); c.lineTo(0, P.bot - .03); c.stroke();
    },
  },

  tux: {
    sleeve: 1,
    paint(c, B, P) {
      const { top, bot } = P;
      const jac = '#24212a';
      jacketFront(c, B, P, jac, '#fbfaf6', light(jac, .18));
      c.fillStyle = '#17141a';                                            // bow tie
      for (const side of [-1, 1]) {
        c.beginPath(); c.moveTo(0, top + .072);
        c.lineTo(side * B.sh * .34, top + .034); c.lineTo(side * B.sh * .34, top + .112);
        c.closePath(); c.fill();
      }
      circle(c, 0, top + .073, .017); c.fillStyle = '#17141a'; c.fill();
      c.fillStyle = '#d8d2c4';                                            // pocket square
      c.beginPath(); c.moveTo(B.sh * .50, top + .175); c.lineTo(B.sh * .82, top + .175);
      c.lineTo(B.sh * .66, top + .145); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.20)'; c.fillRect(-B.sh * .22, bot - .09, B.sh * .44, .012);
    },
  },

  coat: {
    sleeve: 1,
    skirt: { hem: -.105, w: .182 },
    paint(c, B, P) {
      const { cols, top, bot, W2 } = P;
      c.fillStyle = cols[0]; c.fillRect(-W2, top - .02, W2 * 2, bot - top + .05);
      c.lineWidth = .010; c.lineJoin = 'round';
      for (const side of [-1, 1]) {                                       // a big collar
        c.beginPath(); c.moveTo(side * B.sh * .34, top - .02);
        c.lineTo(side * B.sh * .10, top + .175); c.lineTo(side * B.sh * .94, top + .080);
        c.closePath(); c.fillStyle = dark(cols[0], .16); c.fill(); c.strokeStyle = INK; c.stroke();
      }
      c.strokeStyle = dark(cols[0], .38); c.lineWidth = .009;
      c.beginPath(); c.moveTo(0, top + .175); c.lineTo(0, bot + .03); c.stroke();
      c.fillStyle = dark(cols[0], .48);
      for (let i = 0; i < 2; i++) { circle(c, B.sh * .20, top + .215 + i * .070, .012); c.fill(); }
    },
  },

  dress: {
    skirt: { hem: -.150, w: .205 },
    paint(c, B, P) {
      const { cols, skin, top, bot, W2 } = P;
      c.fillStyle = cols[0]; c.fillRect(-W2, top - .02, W2 * 2, bot - top + .05);
      c.fillStyle = skin;                                                 // a round neck
      c.beginPath(); c.moveTo(-B.sh * .40, top - .02);
      c.quadraticCurveTo(0, top + .115, B.sh * .40, top - .02); c.closePath(); c.fill();
      c.fillStyle = cols[1] !== cols[0] ? cols[1] : dark(cols[0], .30);   // waist belt
      c.fillRect(-W2, bot - .062, W2 * 2, .030);
    },
  },

  gown: {
    skirt: { hem: -.022, w: .260 },
    paint(c, B, P) {
      const { cols, skin, top, bot, W2 } = P;
      c.fillStyle = skin; c.fillRect(-W2, top - .02, W2 * 2, bot - top + .05);
      c.fillStyle = cols[0];                                              // sweetheart bodice
      c.beginPath();
      c.moveTo(-B.chest - .02, top + .085);
      c.quadraticCurveTo(-B.chest * .50, top + .175, 0, top + .120);
      c.quadraticCurveTo(B.chest * .50, top + .175, B.chest + .02, top + .085);
      c.lineTo(B.hip + .02, bot + .03); c.lineTo(-B.hip - .02, bot + .03);
      c.closePath(); c.fill();
      c.strokeStyle = cols[0]; c.lineWidth = .018; c.lineCap = 'round';   // one shoulder
      c.beginPath(); c.moveTo(-B.chest * .80, top + .090); c.lineTo(-B.sh * .52, top - .01); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.16)';
      c.fillRect(-W2, bot - .055, W2 * 2, .016);
    },
  },

  pinstripe: {
    sleeve: 1,
    paint(c, B, P) {
      const { cols, top, bot, W2 } = P;
      jacketFront(c, B, P, cols[0], '#f6f4ee', dark(cols[0], .20));
      c.save();                                       // the stripes, over the jacket only
      c.beginPath();
      c.rect(-W2, top - .02, W2 - B.sh * .40, (bot - top) + .05);
      c.rect(B.sh * .40, top - .02, W2, (bot - top) + .05);
      c.clip();
      c.strokeStyle = 'rgba(240,238,230,.42)'; c.lineWidth = .006;
      for (let x = -W2; x < W2; x += .030) { c.beginPath(); c.moveTo(x, top - .02); c.lineTo(x, bot + .03); c.stroke(); }
      c.restore();
      const tie = cols[1] !== cols[0] ? cols[1] : '#8c2733';
      c.fillStyle = tie;
      c.beginPath(); c.moveTo(-B.sh * .13, top + .055); c.lineTo(B.sh * .13, top + .055);
      c.lineTo(B.sh * .10, top + .115); c.lineTo(-B.sh * .10, top + .115); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-B.sh * .10, top + .115); c.lineTo(B.sh * .10, top + .115);
      c.lineTo(B.sh * .13, bot - .055); c.lineTo(0, bot - .022);
      c.lineTo(-B.sh * .13, bot - .055); c.closePath(); c.fill();
      c.fillStyle = '#f2cf5a';                        // a pocket square
      c.beginPath(); c.moveTo(B.sh * .50, top + .175); c.lineTo(B.sh * .82, top + .175);
      c.lineTo(B.sh * .66, top + .142); c.closePath(); c.fill();
    },
  },

  glam: {
    skirt: { hem: -.185, w: .180 },
    paint(c, B, P) {
      const { cols, skin, top, bot, W2 } = P;
      c.fillStyle = skin; c.fillRect(-W2, top - .02, W2 * 2, (bot - top) + .05);
      c.fillStyle = cols[0];
      c.beginPath();                                   // one shoulder, cut across the chest
      c.moveTo(-B.chest - .03, top + .150);
      c.quadraticCurveTo(-B.chest * .30, top + .070, B.sh * .46, top - .03);
      c.lineTo(B.sh + .03, top + .020);
      c.lineTo(B.hip + .03, bot + .03);
      c.lineTo(-B.hip - .03, bot + .03);
      c.closePath(); c.fill();
      const trim = cols[1] !== cols[0] ? cols[1] : light(cols[0], .4);
      c.fillStyle = trim; c.fillRect(-W2, bot - .080, W2 * 2, .022);   // a waist band
      const R = rng(9);                                // a little sparkle, not a disco ball
      c.fillStyle = 'rgba(255,255,255,.45)';
      for (let i = 0; i < 26; i++) {
        const x = (R() - .5) * B.chest * 1.9, y = lerp(top + .17, bot - .03, R());
        c.beginPath(); c.arc(x, y, .006, 0, TAU); c.fill();
      }
    },
  },

  toga: {
    base: 'skin',
    paint(c, B, P) {
      const { cols, top, bot, W2 } = P;
      c.fillStyle = cols[0];
      c.beginPath();                                  // over one shoulder, down to the hip
      c.moveTo(-B.sh - .03, top + .130);
      c.lineTo(B.sh * .18, top - .03);
      c.lineTo(B.sh + .03, top + .055);
      c.lineTo(B.hip + .03, bot + .03);
      c.lineTo(-B.hip - .03, bot + .03);
      c.closePath(); c.fill();
      const sash = cols[1] !== cols[0] ? cols[1] : '#f2cf5a';
      c.fillStyle = sash; c.fillRect(-W2, bot - .075, W2 * 2, .028);
      c.strokeStyle = 'rgba(34,28,34,.18)'; c.lineWidth = .008;
      for (let i = 0; i < 3; i++) {
        c.beginPath(); c.moveTo(-B.waist * .5 + i * B.waist * .5, top + .16);
        c.lineTo(-B.waist * .7 + i * B.waist * .5, bot - .08); c.stroke();
      }
    },
  },

  trunks: {
    base: 'skin',
    paint(c, B, P) {
      const { cols, bot, W2 } = P;
      c.fillStyle = cols[0]; c.fillRect(-W2, bot - .113, W2 * 2, .133);
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(-W2, bot - .113, W2 * 2, .012);
    },
  },

  boardies: {
    base: 'skin',
    paint(c, B, P) {
      const { cols, bot, W2 } = P;
      c.fillStyle = cols[0]; c.fillRect(-W2, bot - .140, W2 * 2, .160);
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(-W2, bot - .140, W2 * 2, .012);
      if (cols[1] !== cols[0]) { c.fillStyle = cols[1]; c.fillRect(B.hip * .34, bot - .140, .022, .160); }
    },
  },

  onePiece: {
    base: 'skin',
    paint(c, B, P) {
      const { cols, top, bot, W2 } = P;
      const yT = lerp(top, bot, .23);
      c.fillStyle = cols[0];
      c.beginPath(); c.moveTo(-B.chest - .02, yT + .055);
      c.quadraticCurveTo(0, yT - .055, B.chest + .02, yT + .055);
      c.lineTo(B.hip + .02, bot + .02); c.lineTo(-B.hip - .02, bot + .02);
      c.closePath(); c.fill();
      c.strokeStyle = cols[0]; c.lineWidth = .026; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-B.chest * .66, yT + .02); c.lineTo(-B.sh * .60, top); c.stroke();
      c.beginPath(); c.moveTo(B.chest * .66, yT + .02); c.lineTo(B.sh * .60, top); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(-W2, yT + .055, W2 * 2, .014);
    },
  },

  bikini: {
    base: 'skin',
    paint(c, B, P) {
      const { cols, top, bot } = P;
      const yT = lerp(top, bot, .26);
      c.fillStyle = cols[0];
      c.beginPath(); c.moveTo(-B.chest - .02, yT + .05);
      c.quadraticCurveTo(0, yT - .03, B.chest + .02, yT + .05);
      c.lineTo(B.chest + .02, yT - .028);
      c.quadraticCurveTo(0, yT - .092, -B.chest - .02, yT - .028);
      c.closePath(); c.fill();
      c.strokeStyle = cols[0]; c.lineWidth = .016; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-B.chest * .58, yT - .05); c.lineTo(-B.sh * .50, top); c.stroke();
      c.beginPath(); c.moveTo(B.chest * .58, yT - .05); c.lineTo(B.sh * .50, top); c.stroke();
      c.beginPath(); c.moveTo(-B.hip - .02, bot - .075);
      c.quadraticCurveTo(0, bot - .055, B.hip + .02, bot - .075);
      c.lineTo(B.hip + .02, bot + .02); c.lineTo(-B.hip - .02, bot + .02);
      c.closePath(); c.fill();
    },
  },
};

const OUTFIT_LIST = Object.keys(OUTFIT);
const outfitOf = k => OUTFIT[k] || OUTFIT.tee;

function paintOutfit(ctx, B, o, cols, skin) {
  const top = B.top, bot = TORSO_BOT, h = bot - top;
  const K = outfitOf(o.outfit);
  const WB = Math.max(B.sh, B.chest, B.waist, B.hip), W2 = WB + .02;
  const P = { cols, skin, top, bot, W2, WB };

  ctx.save(); torsoPath(ctx, B); ctx.clip();
  ctx.fillStyle = K.base === 'skin' ? skin : cols[0];
  ctx.fillRect(-W2, top - .02, W2 * 2, h + .05);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  K.paint(ctx, B, P);

  // build modelling, under the same clip so it never spills
  if (B.pecs) {
    const y = lerp(top, bot, .30), a = .22 * B.pecs;
    ctx.strokeStyle = `rgba(34,28,34,${a.toFixed(3)})`; ctx.lineWidth = .009;
    ctx.beginPath(); ctx.moveTo(-B.chest * .80, y - .035); ctx.quadraticCurveTo(0, y + .022, B.chest * .80, y - .035); ctx.stroke();
    if (B.pecs > .8) {
      ctx.beginPath(); ctx.moveTo(0, y - .05); ctx.lineTo(0, y + .012); ctx.stroke();
      for (let i = 0; i < 2; i++) {
        const yy = lerp(y + .055, bot - .055, i / 1.6);
        ctx.beginPath(); ctx.moveTo(-B.waist * .46, yy); ctx.lineTo(B.waist * .46, yy); ctx.stroke();
      }
    }
  }
  if (B.bust) {
    const y = lerp(top, bot, .27), a = .26 * B.bust;
    ctx.strokeStyle = `rgba(34,28,34,${a.toFixed(3)})`; ctx.lineWidth = .009;
    ctx.beginPath(); ctx.moveTo(-B.chest * .86, y - .045);
    ctx.quadraticCurveTo(-B.chest * .52, y + .055, 0, y + .012);
    ctx.quadraticCurveTo(B.chest * .52, y + .055, B.chest * .86, y - .045);
    ctx.stroke();
  }
  if (B.belly) {
    ctx.strokeStyle = 'rgba(34,28,34,.30)'; ctx.lineWidth = .009;
    const y = lerp(top, bot, .62);
    ctx.beginPath(); ctx.arc(0, y, .055, .35, Math.PI - .35); ctx.stroke();
  }
  ctx.restore();

  shadeShape(ctx, () => torsoPath(ctx, B), 1, .18, .38, [-WB, top, WB * 2, h]);
  torsoPath(ctx, B); fillStroke(ctx, null, .017);
}

// ---------- hair ----------
// Drawn in two layers inside the head's own transform, so it tilts with the head:
// `back` goes down before the head circle, `front` after it and before the face.

const HY = -.765, HR = .19;      // the head drawStick draws, in unit space

function capPath(ctx, g = 1.05, a = .50, brow = .55) {
  // `a` is how far down the sides the dome comes, `brow` is where the hairline crosses
  // the middle of the forehead, in HR units ABOVE the head centre. The control point is
  // solved backwards from that, because a quadratic only reaches halfway to its control.
  const r = HR * g, ex = Math.cos(a) * r, ey = HY + Math.sin(a) * r;
  const yCtrl = 2 * (HY - HR * brow) - ey;
  ctx.beginPath();
  ctx.arc(0, HY, r, Math.PI - a, TAU + a);
  ctx.quadraticCurveTo(0, yCtrl, -ex, ey);
  ctx.closePath();
}

function lengthPath(ctx, bottom, outK = 1.05, wave = 0) {
  // a sheet of hair behind the head, from the crown down to `bottom` (in HR units).
  // outK is its half-width: keep it near 1 or the hair is wider than the shoulders
  // and the figure reads as a curtain with a face on it.
  const r = HR * 1.04, w = HR * outK, yB = HY + HR * bottom;
  ctx.beginPath();
  ctx.arc(0, HY, r, Math.PI, 0);
  ctx.quadraticCurveTo(w * 1.08, HY + HR * .70, w * .84, yB - HR * .22);
  if (wave) {
    ctx.quadraticCurveTo(w * .82, yB + HR * .10, w * .52, yB - HR * .04);
    ctx.quadraticCurveTo(w * .16, yB - HR * .18, -w * .16, yB - HR * .02);
    ctx.quadraticCurveTo(-w * .52, yB + HR * .14, -w * .82, yB - HR * .06);
    ctx.lineTo(-w * .84, yB - HR * .22);
  } else {
    ctx.quadraticCurveTo(w * .84, yB, w * .64, yB);
    ctx.lineTo(-w * .64, yB);
    ctx.quadraticCurveTo(-w * .84, yB, -w * .84, yB - HR * .22);
  }
  ctx.quadraticCurveTo(-w * 1.08, HY + HR * .70, -r, HY);
  ctx.closePath();
}

const HLW = .014;                                  // hair outline weight

const HAIR = {
  none:  {},

  buzz:  { front: (c, col) => { capPath(c, 1.015, 0.34, 0.64); fillStroke(c, col, HLW); } },

  crop:  { front: (c, col) => { capPath(c, 1.055, 0.50, 0.56); fillStroke(c, col, HLW); } },

  fringe:{ front: (c, col) => { capPath(c, 1.075, 0.54, 0.30); fillStroke(c, col, HLW); } },

  quiff: { front: (c, col) => {
    capPath(c, 1.050, 0.48, 0.62); fillStroke(c, col, HLW);
    c.beginPath();
    c.moveTo(-HR * .56, HY - HR * .88);
    c.quadraticCurveTo(-HR * .26, HY - HR * 1.30, HR * .38, HY - HR * 1.14);
    c.quadraticCurveTo(HR * .66, HY - HR * 1.02, HR * .74, HY - HR * .74);
    c.closePath(); fillStroke(c, col, HLW);
  } },

  pixie: { front: (c, col) => {
    capPath(c, 1.060, 0.56, 0.46); fillStroke(c, col, HLW);
    c.beginPath();
    c.moveTo(HR * .30, HY - HR * .92);
    c.quadraticCurveTo(HR * 1.26, HY - HR * .72, HR * 1.14, HY + HR * .18);
    c.quadraticCurveTo(HR * .96, HY - HR * .34, HR * .52, HY - HR * .52);
    c.closePath(); fillStroke(c, col, HLW);
  } },

  curls: { front: (c, col) => {
    capPath(c, 1.020, 0.46, 0.56); fillStroke(c, col, HLW);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI - .40 + (i / 8) * (Math.PI + .80);
      circle(c, Math.cos(a) * HR * 1.03, HY + Math.sin(a) * HR * 1.03, HR * .25);
      fillStroke(c, col, HLW);
    }
  } },

  afro:  {
    back: (c, col) => {
      ellipse(c, 0, HY - HR * .20, HR * 1.34, HR * 1.26); fillStroke(c, col, HLW);
      for (let i = 0; i <= 13; i++) {
        const a = Math.PI * (0.88 + (i / 13) * 1.24);
        circle(c, Math.cos(a) * HR * 1.26, HY - HR * .20 + Math.sin(a) * HR * 1.18, HR * .30);
        fillStroke(c, col, HLW);
      }
    },
    front: (c, col) => { capPath(c, 1.020, 0.40, 0.58); fillStroke(c, col, HLW); },
  },

  bob:   {
    back: (c, col) => { lengthPath(c, 1.46, 1.06); fillStroke(c, col, HLW); },
    front: (c, col) => { capPath(c, 1.070, 0.60, 0.44); fillStroke(c, col, HLW); },
  },

  waves: {
    back: (c, col) => { lengthPath(c, 1.72, 1.10, 1); fillStroke(c, col, HLW); },
    front: (c, col) => { capPath(c, 1.070, 0.58, 0.46); fillStroke(c, col, HLW); },
  },

  long:  {
    back: (c, col) => { lengthPath(c, 2.05, 1.04); fillStroke(c, col, HLW); },
    front: (c, col) => { capPath(c, 1.060, 0.56, 0.48); fillStroke(c, col, HLW); },
  },

  longWavy: {
    back: (c, col) => { lengthPath(c, 2.10, 1.12, 1); fillStroke(c, col, HLW); },
    front: (c, col) => { capPath(c, 1.070, 0.58, 0.42); fillStroke(c, col, HLW); },
  },

  ponytail: {
    back: (c, col) => {
      c.beginPath();
      c.moveTo(-HR * .10, HY - HR * .40);
      c.quadraticCurveTo(HR * 1.44, HY - HR * .52, HR * 1.36, HY + HR * .52);
      c.quadraticCurveTo(HR * 1.30, HY + HR * 1.34, HR * .74, HY + HR * 1.22);
      c.quadraticCurveTo(HR * 1.00, HY + HR * .44, HR * .22, HY - HR * .06);
      c.closePath(); fillStroke(c, col, HLW);
      capPath(c, 1.04, .44, .54); fillStroke(c, col, HLW);
    },
    front: (c, col) => { capPath(c, 1.050, 0.46, 0.52); fillStroke(c, col, HLW); },
  },

  highPony: {
    back: (c, col) => {
      c.beginPath();
      c.moveTo(0, HY - HR * .80);
      c.quadraticCurveTo(HR * 1.10, HY - HR * 1.70, HR * 1.56, HY - HR * .70);
      c.quadraticCurveTo(HR * 1.88, HY + HR * .26, HR * 1.18, HY + HR * .46);
      c.quadraticCurveTo(HR * 1.36, HY - HR * .50, HR * .40, HY - HR * .72);
      c.closePath(); fillStroke(c, col, HLW);
    },
    front: (c, col) => { capPath(c, 1.040, 0.42, 0.58); fillStroke(c, col, HLW); },
  },

  bun:   {
    back: (c, col) => {
      circle(c, -HR * .04, HY - HR * 1.16, HR * .46); fillStroke(c, col, HLW);
      c.beginPath(); c.arc(0, HY, HR * 1.06, Math.PI + .2, -.2); c.closePath(); fillStroke(c, col, HLW);
    },
    front: (c, col) => { capPath(c, 1.050, 0.46, 0.56); fillStroke(c, col, HLW); },
  },

  manBun: {
    back: (c, col) => { circle(c, HR * .74, HY - HR * .74, HR * .36); fillStroke(c, col, HLW); },
    front: (c, col) => {
      capPath(c, 1.030, 0.26, 0.64); fillStroke(c, col, HLW);
      c.strokeStyle = INK; c.lineWidth = .010; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-HR * .92, HY - HR * .30); c.lineTo(HR * .88, HY - HR * .36); c.stroke();
    },
  },

  braid: {
    back: (c, col) => {
      for (let i = 0; i < 4; i++) {
        const y = HY + HR * (.70 + i * .46), r = HR * (.34 - i * .045);
        circle(c, HR * (.86 + i * .12), y, r); fillStroke(c, col, HLW);
      }
      c.beginPath(); c.arc(0, HY, HR * 1.05, Math.PI + .2, -.2); c.closePath(); fillStroke(c, col, HLW);
    },
    front: (c, col) => { capPath(c, 1.050, 0.48, 0.54); fillStroke(c, col, HLW); },
  },
};

// ---------- beards and glasses ----------
// Without these every man is the same man: one head, one hairline, one face. They are
// what makes two male figures read as two different people.

const BEARD_LIST = ['stubble', 'short', 'full', 'goatee', 'moustache'];
const GLASSES_LIST = ['round', 'square', 'rect', 'shades'];

function drawBeard(ctx, kind, col) {
  if (!kind || kind === 'none') return;
  const r = HR;
  ctx.save();
  circle(ctx, 0, HY, r + .003); ctx.clip();          // never spills off the head
  ctx.fillStyle = col;
  ctx.strokeStyle = col; ctx.lineWidth = .012; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  if (kind === 'moustache' || kind === 'goatee') {
    ctx.beginPath();                                  // the moustache, under the nose
    ctx.moveTo(-r * .46, HY + r * .20);
    ctx.quadraticCurveTo(0, HY + r * .09, r * .46, HY + r * .20);
    ctx.quadraticCurveTo(0, HY + r * .42, -r * .46, HY + r * .20);
    ctx.closePath(); ctx.fill();
  }
  if (kind === 'goatee') {
    ctx.beginPath();                                  // and a chin patch
    ctx.moveTo(-r * .34, HY + r * .60);
    ctx.quadraticCurveTo(0, HY + r * .50, r * .34, HY + r * .60);
    ctx.quadraticCurveTo(r * .30, HY + r * 1.18, 0, HY + r * 1.16);
    ctx.quadraticCurveTo(-r * .30, HY + r * 1.18, -r * .34, HY + r * .60);
    ctx.closePath(); ctx.fill();
  }
  if (kind === 'short' || kind === 'full' || kind === 'stubble') {
    const top = kind === 'full' ? -.08 : .24;         // where it meets the sideburn
    const dip = kind === 'full' ? .78 : .62;          // how far it drops under the mouth
    if (kind === 'stubble') ctx.globalAlpha = .42;
    ctx.beginPath();
    ctx.moveTo(-r * 1.25, HY + r * top);
    ctx.quadraticCurveTo(0, HY + r * (top + dip), r * 1.25, HY + r * top);
    ctx.lineTo(r * 1.25, HY + r * 1.7); ctx.lineTo(-r * 1.25, HY + r * 1.7);
    ctx.closePath(); ctx.fill();
    if (kind !== 'stubble') {                         // a lip gap, so the mouth still reads
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(-r * .40, HY + r * .40);
      ctx.quadraticCurveTo(0, HY + r * .30, r * .40, HY + r * .40);
      ctx.quadraticCurveTo(0, HY + r * .62, -r * .40, HY + r * .40);
      ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.restore();
}

function drawGlasses(ctx, kind, col = INK) {
  if (!kind || kind === 'none') return;
  if (kind === 'shades') return drawShades(ctx);
  const ex = .072, ey = HY - .005, lw = .012;
  ctx.save();
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(190,220,245,.22)';
  for (const side of [-1, 1]) {
    if (kind === 'round') circle(ctx, side * ex, ey, .056);
    else rrect(ctx, side * ex - .058, ey - (kind === 'rect' ? .040 : .050), .116, kind === 'rect' ? .080 : .100, kind === 'square' ? .014 : .026);
    ctx.fill(); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-ex + .056, ey - .012); ctx.lineTo(ex - .056, ey - .012); ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * (ex + .056), ey - .016);
    ctx.lineTo(side * HR * .99, ey - .040); ctx.stroke();
  }
  ctx.restore();
}

const HAIR_LIST = Object.keys(HAIR).filter(k => k !== 'none');
const SKIN_LIST = Object.keys(SKIN);
const BUILD_LIST = Object.keys(BUILD);

// ---------- the figure ----------

function castFig(ctx, o) {
  const B = buildOf(o.build);
  const s = (o.s || 400) * (B.k || 1), flip = o.flip || 1;
  const sil = o.sil;
  const skin = skinOf(o.skin);
  const headSh = o.skin ? skinShOf(o.skin) : HEAD_SH;
  const head = o.skin ? skin : HEAD;
  const ink = sil || INK;
  const lw = .017, limbW = B.lw;
  const cols = o.cols || PAL.red;
  const hcol = hairOf(o.hairCol);
  const H = HAIR[o.hair] || HAIR.none;

  ctx.save();
  ctx.translate(o.x, o.y);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.shadow !== false && !sil) {
    ctx.save(); ctx.scale(s, s);
    ellipse(ctx, 0, 0, .2 * (o.shadowScale || 1), .035 * (o.shadowScale || 1));
    ctx.fillStyle = 'rgba(40,20,30,.22)'; ctx.fill(); ctx.restore();
  }
  ctx.scale(s * flip, s * (o.squash || 1));
  ctx.rotate(o.lean || 0);
  ctx.translate(0, o.bob || 0);

  // the head's transform, applied twice: once for the hair that goes behind the body,
  // once for the head itself. Back hair drawn with the head would sit ON the torso.
  const headXf = fn => { ctx.save(); ctx.translate(0, HY); ctx.rotate(o.headTilt || 0); ctx.translate(0, -HY); fn(); ctx.restore(); };
  if (H.back) headXf(() => H.back(ctx, sil || hcol));
  const K = outfitOf(o.outfit);
  if (o.animal && o.tail !== false) {
    const A = ANIMAL[o.animal] || ANIMAL.bear;
    drawTail(ctx, A.tail, (B.hip + .012), -.278, 1, sil || o.furCol || A.fur, o.t || 0);
  }
  if (o.wings && !sil) drawWings(ctx, o.wingCol || '#fbf8f0', 1, o.t || 0);
  if (K.hood) {
    hoodPath(ctx);
    if (sil) { ctx.fillStyle = sil; ctx.fill(); }
    else {
      fillStroke(ctx, dark(cols[0], .18), .017);
      ctx.save(); hoodPath(ctx); ctx.clip();
      ctx.fillStyle = dark(cols[0], .42);
      ctx.ellipse(0, HY + HR * .82, HR * .88, HR * .40, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  const legs = o.legs || { L: [.12, -.05], R: [.12, -.05] };
  const arms = o.arms || { L: [.35, -.15], R: [.35, -.15] };
  const hipY = -.3, shY = -.535;
  const legX = Math.max(.055, B.hip * .44), armX = Math.max(.1, Math.max(B.sh, B.chest) * .80);

  // legs
  for (const [k, side] of [['L', -1], ['R', 1]]) {
    const [a1, a2] = legs[k];
    const p = limbPts(side * legX, hipY, side, a1, a2, .155, .155);
    ctx.beginPath(); ctx.moveTo(...p[0]); ctx.lineTo(...p[1]); ctx.lineTo(...p[2]);
    ctx.lineWidth = limbW; ctx.strokeStyle = ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    if (o.heels && !sil) {
      ctx.save(); ctx.translate(p[2][0], p[2][1]); ctx.scale(side, 1);
      ctx.beginPath();
      ctx.moveTo(-.012, -.016); ctx.lineTo(.052, .014); ctx.lineTo(.052, .030);
      ctx.lineTo(-.004, .030); ctx.lineTo(-.014, .006);
      ctx.closePath(); fillStroke(ctx, o.heelCol || '#2b2028', .012);
      line(ctx, -.010, .006, -.010, .030, .012, o.heelCol || '#2b2028');
      ctx.restore();
    } else {
      ellipse(ctx, p[2][0] + side * .022, p[2][1] + .004, .042, .022, 0); ctx.fillStyle = ink; ctx.fill();
    }
  }

  // skirt, if this outfit has one: after the legs, before the torso, so the hem
  // covers the thighs and the torso's own outline sits on top of the waist
  if (K.skirt) {
    const S = K.skirt;
    skirtPath(ctx, B, TORSO_BOT - .06, S.hem, S.w);
    if (sil) { ctx.fillStyle = sil; ctx.fill(); }
    else {
      fillStroke(ctx, cols[0], .017);
      ctx.save(); skirtPath(ctx, B, TORSO_BOT - .06, S.hem, S.w); ctx.clip();
      ctx.fillStyle = 'rgba(40,24,36,.12)'; ctx.fillRect(.015, -1, 1, 2);
      ctx.restore();
    }
  }

  // torso
  if (sil) { torsoPath(ctx, B); ctx.fillStyle = sil; ctx.fill(); }
  else paintOutfit(ctx, B, o, cols, skin);
  if (!sil) {
    if (o.necklace) drawNecklace(ctx, B, o.necklace, o.necklaceCol);
    if (o.fur) drawFur(ctx, B, o.furStoleCol);
  }

  // arms
  for (const [k, side] of [['L', -1], ['R', 1]]) {
    const al = o.armLen || 1;
    let a1, a2;
    if (arms[k].ik) [a1, a2] = ik(side, side * armX, shY, arms[k].ik[0], arms[k].ik[1], .14 * al, .13 * al, arms[k].bend || 1);
    else [a1, a2] = arms[k];
    const p = limbPts(side * armX, shY, side, a1, a2, .14 * al, .13 * al);
    if (o.propBehind) o.propBehind(ctx, k, p[2], p[3], side);
    ctx.beginPath(); ctx.moveTo(...p[0]); ctx.lineTo(...p[1]); ctx.lineTo(...p[2]);
    ctx.lineWidth = limbW; ctx.strokeStyle = ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    if (K.sleeve && !sil) {                            // a sleeve inside the ink outline
      const sc = o.sleeveCol || (o.outfit === 'tux' ? '#24212a' : cols[0]);
      ctx.beginPath(); ctx.moveTo(...p[0]);
      if (K.sleeve >= 1) { ctx.lineTo(...p[1]); ctx.lineTo(...p[2]); }
      else ctx.lineTo(p[0][0] + (p[1][0] - p[0][0]) * .72, p[0][1] + (p[1][1] - p[0][1]) * .72);
      ctx.lineWidth = limbW - .011; ctx.strokeStyle = sc; ctx.stroke();
    }
    if (o.prop) o.prop(ctx, k, p[2], p[3], side);
    circle(ctx, p[2][0], p[2][1], .03 * (limbW / .028)); ctx.fillStyle = ink; ctx.fill();
    if (!sil && o.nails) drawNails(ctx, p[2], o.nails);
    if (!sil && o.watch && k === 'L') drawWatch(ctx, p[1], p[3], side, o.watchCol);
  }

  // head, with the hair in its transform
  ctx.save(); ctx.translate(0, HY); ctx.rotate(o.headTilt || 0); ctx.translate(0, -HY);
  if (o.animal) {
    if (sil) { circle(ctx, 0, HY, HR); ctx.fillStyle = sil; ctx.fill(); }
    else {
      drawAnimalHead(ctx, o.animal, 0, HY, HR, { furCol: o.furCol, muzCol: o.muzCol, maneCol: o.maneCol, tongue: o.tongue });
      if (o.glasses) drawGlasses(ctx, o.glasses, o.glassesCol || INK);
      if (o.halo) drawHalo(ctx, o.haloCol, o.t || 0);
    }
    ctx.restore();
    ctx.restore();
    return;                                   // an animal head carries its own face
  }
  if (sil) {
    circle(ctx, 0, HY, HR); ctx.fillStyle = sil; ctx.fill();
    if (H.front) { ctx.save(); H.front(ctx, sil); ctx.restore(); }
  } else {
    circle(ctx, 0, HY, HR); ctx.fillStyle = head; ctx.fill();
    ctx.save(); circle(ctx, 0, HY, HR); ctx.clip();
    ctx.beginPath(); ctx.arc(0, HY, HR + .01, 0, TAU); ctx.arc(-.045, HY - .04, HR, 0, TAU, true);
    ctx.fillStyle = headSh; ctx.fill(); ctx.restore();
    if (o.blush) {
      ellipse(ctx, -.1, HY + .06, .035, .02); ellipse(ctx, .1, HY + .06, .035, .02);
      ctx.fillStyle = 'rgba(240,120,120,.35)'; ctx.fill();
    }
    const hat = o.hat || 'none';
    if (hat === 'bandana') drawBandana(ctx, 0, HY, HR, o.hatCol || '#d8312b', o.dotCol || '#fff', lw);
    else if (hat === 'sailor') drawSailorHat(ctx, 0, HY, HR, lw);
    else if (hat === 'captain') drawCaptainHat(ctx, 0, HY, HR, lw);
    circle(ctx, 0, HY, HR); fillStroke(ctx, null, lw);
    if (o.earrings) drawEarrings(ctx, o.earrings, o.earringCol);
    if (o.beard) drawBeard(ctx, o.beard, hairOf(o.beardCol || o.hairCol));
    if (H.front) { ctx.save(); H.front(ctx, hcol); ctx.restore(); }
  }
  drawFace(ctx, 0, HY, HR, o.face || {}, o, sil);
  if (o.glasses && !sil) drawGlasses(ctx, o.glasses, o.glassesCol || INK);
  if (o.halo && !sil) drawHalo(ctx, o.haloCol, o.t || 0);
  ctx.restore();

  ctx.restore();
}

// ---------- animals, wings and pets ----------
// An animal keeps the whole human rig: the same poses, the same arm IK, the same
// outfits. Only the head changes, plus ears, an optional mane and a tail. So a bear
// can wear a hoodie and hold a phone without any new code.

const ANIMAL = {
  bear:      { fur: '#8a6446', muz: '#dcc3a3', earIn: '#b2866a', nose: '#2b2320', ear: 'round', tail: 'stub' },
  panda:     { fur: '#f5f2eb', muz: '#f5f2eb', earIn: '#120f0f', earCol: '#1d1918', nose: '#1d1918', ear: 'round', eyes: 'patch', tail: 'stub' },
  lion:      { fur: '#e3bc7c', muz: '#f6ead2', earIn: '#d8a9a0', nose: '#bd6a64', ear: 'round', mane: '#cf9c4e', whisk: 1, tail: 'tuft' },
  whiteLion: { fur: '#f2efe6', muz: '#fcf9f3', earIn: '#d9bbb4', nose: '#c08079', ear: 'round', mane: '#e4ddcd', whisk: 1, tail: 'tuft' },
  tiger:     { fur: '#e8a04a', muz: '#f8eed8', earIn: '#2a2320', nose: '#c2706a', ear: 'round', whisk: 1, tail: 'long', stripes: '#2a2320' },
  whiteTiger:{ fur: '#f4f1ea', muz: '#fcfaf5', earIn: '#2a2320', nose: '#d58f93', ear: 'round', whisk: 1, tail: 'long', stripes: '#262021', eyeCol: '#3f86c8' },
  dog:       { fur: '#c2884e', muz: '#ebd8b8', earIn: '#9a6c3e', nose: '#2b2320', ear: 'flop', tongue: 1, tail: 'curl' },
  cat:       { fur: '#746e69', muz: '#efe9e2', earIn: '#d8a9a0', nose: '#d4878a', ear: 'point', whisk: 1, tail: 'long' },
};
const ANIMAL_LIST = Object.keys(ANIMAL);

// Generic so the biped and the four-legged pet share one head.
function drawAnimalHead(ctx, kind, cx, cy, r, o = {}) {
  const A = ANIMAL[kind] || ANIMAL.bear;
  const fur = o.furCol || A.fur, lw = r * .09;
  const earCol = A.earCol || fur;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  if (A.mane) {                                       // the lion, first and behind
    const mane = o.maneCol || A.mane;
    for (let i = 0; i < 17; i++) {
      const a = (i / 17) * TAU;
      const rr = r * (.40 + (i % 3) * .055);
      circle(ctx, cx + Math.cos(a) * r * (.88 + (i % 2) * .09), cy + Math.sin(a) * r * (.88 + (i % 2) * .09), rr);
      fillStroke(ctx, mane, lw * .65);
    }
    circle(ctx, cx, cy, r * 1.04); fillStroke(ctx, mane, 0);
  }

  for (const side of [-1, 1]) {                        // ears
    if (A.ear === 'round') {
      circle(ctx, cx + side * r * .74, cy - r * .70, r * .34); fillStroke(ctx, earCol, lw);
      circle(ctx, cx + side * r * .74, cy - r * .70, r * .17); fillStroke(ctx, A.earIn, 0);
    } else if (A.ear === 'point') {
      ctx.beginPath();
      ctx.moveTo(cx + side * r * .32, cy - r * .80);
      ctx.lineTo(cx + side * r * .74, cy - r * 1.42);
      ctx.lineTo(cx + side * r * .96, cy - r * .58);
      ctx.closePath(); fillStroke(ctx, fur, lw);
      ctx.beginPath();
      ctx.moveTo(cx + side * r * .48, cy - r * .80);
      ctx.lineTo(cx + side * r * .72, cy - r * 1.16);
      ctx.lineTo(cx + side * r * .84, cy - r * .70);
      ctx.closePath(); fillStroke(ctx, A.earIn, 0);
    } else {                                           // floppy
      ctx.save();
      ellipse(ctx, cx + side * r * .92, cy + r * .18, r * .30, r * .62, side * .22);
      fillStroke(ctx, earCol, lw);
      ctx.restore();
    }
  }

  circle(ctx, cx, cy, r); fillStroke(ctx, fur, lw);    // the head

  if (A.stripes) {                                     // a tiger
    ctx.save(); circle(ctx, cx, cy, r * .99); ctx.clip();
    ctx.strokeStyle = A.stripes; ctx.lineCap = 'round';
    ctx.lineWidth = r * .105;
    for (let i = 0; i < 3; i++) {                      // forehead
      const x = cx + (i - 1) * r * .30;
      ctx.beginPath(); ctx.moveTo(x, cy - r * 1.05);
      ctx.quadraticCurveTo(x + (i - 1) * r * .10, cy - r * .70, x, cy - r * .46);
      ctx.stroke();
    }
    ctx.lineWidth = r * .09;
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {   // cheeks
      const y = cy - r * .22 + i * r * .30;
      ctx.beginPath(); ctx.moveTo(cx + side * r * 1.06, y);
      ctx.quadraticCurveTo(cx + side * r * .80, y + r * .06, cx + side * r * .62, y + r * .02);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (A.eyes === 'patch') {                            // the panda
    for (const side of [-1, 1]) {
      ctx.save();
      ellipse(ctx, cx + side * r * .40, cy - r * .10, r * .30, r * .36, side * .36);
      ctx.fillStyle = '#1d1918'; ctx.fill(); ctx.restore();
    }
  }

  ellipse(ctx, cx, cy + r * .40, r * .52, r * .36);    // the muzzle
  fillStroke(ctx, o.muzCol || A.muz, lw * .75);

  for (const side of [-1, 1]) {                        // eyes
    const ex = cx + side * r * (A.eyes === 'patch' ? .40 : .36), ey = cy - r * .12;
    circle(ctx, ex, ey, r * .13); ctx.fillStyle = A.eyes === 'patch' ? '#fbf9f5' : (A.eyeCol || INK); ctx.fill();
    if (A.eyeCol) { circle(ctx, ex, ey, r * .065); ctx.fillStyle = INK; ctx.fill(); }
    if (A.eyes === 'patch') { circle(ctx, ex, ey, r * .075); ctx.fillStyle = INK; ctx.fill(); }
    circle(ctx, ex + r * .05, ey - r * .05, r * .045); ctx.fillStyle = '#fff'; ctx.fill();
  }

  ctx.beginPath();                                     // nose
  ctx.moveTo(cx - r * .17, cy + r * .24);
  ctx.quadraticCurveTo(cx, cy + r * .46, cx + r * .17, cy + r * .24);
  ctx.quadraticCurveTo(cx, cy + r * .14, cx - r * .17, cy + r * .24);
  ctx.closePath(); fillStroke(ctx, A.nose, 0);

  ctx.strokeStyle = INK; ctx.lineWidth = r * .055;     // mouth, two curves that lift at the tips
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * .40); ctx.lineTo(cx, cy + r * .55); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r * .27, cy + r * .43);
  ctx.quadraticCurveTo(cx - r * .13, cy + r * .72, cx, cy + r * .55);
  ctx.quadraticCurveTo(cx + r * .13, cy + r * .72, cx + r * .27, cy + r * .43);
  ctx.stroke();

  if (A.tongue && o.tongue !== false) {
    ctx.beginPath();
    ctx.moveTo(cx - r * .12, cy + r * .58);
    ctx.quadraticCurveTo(cx, cy + r * 1.00, cx + r * .12, cy + r * .58);
    ctx.closePath(); fillStroke(cx === cx ? ctx : ctx, '#e0707e', r * .045);
  }
  if (A.whisk) {
    ctx.strokeStyle = 'rgba(34,28,34,.55)'; ctx.lineWidth = r * .035;
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + side * r * .34, cy + r * (.30 + i * .10));
      ctx.lineTo(cx + side * r * 1.08, cy + r * (.14 + i * .20));
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawTail(ctx, kind, x, y, s, col, t = 0) {
  const sw = Math.sin(t * 3) * .06;
  ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'stub') { ellipse(ctx, 0, .03 * s, .034 * s, .028 * s); fillStroke(ctx, col, .014); }
  else if (kind === 'curl') {
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(.12 * s, -.06 * s, .10 * s, -.17 * s);
    ctx.lineWidth = .034 * s; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = .022 * s; ctx.strokeStyle = col; ctx.stroke();
  } else if (kind === 'long') {
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(.20 * s, .02 * s, .19 * s, -.20 * s);
    ctx.lineWidth = .034 * s; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = .022 * s; ctx.strokeStyle = col; ctx.stroke();
  } else {                                             // tuft, the lion
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(.21 * s, .04 * s, .20 * s, -.15 * s);
    ctx.lineWidth = .030 * s; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = .018 * s; ctx.strokeStyle = col; ctx.stroke();
    circle(ctx, .20 * s, -.17 * s, .042 * s); fillStroke(ctx, col, .014 * s);
  }
  ctx.restore();
}

// Wings and a halo. Reusable on their own: an angel is wings plus halo and no bow.
function drawWings(ctx, col = '#fbf8f0', spread = 1, t = 0) {
  const f = 1 + Math.sin(t * 5) * .06 * spread;
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * .085, -.515); ctx.scale(side * f, 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(.11, -.26, .28, -.30);
    ctx.quadraticCurveTo(.21, -.15, .26, -.08);
    ctx.quadraticCurveTo(.18, -.04, .20, .04);
    ctx.quadraticCurveTo(.10, .04, .06, .10);
    ctx.closePath(); fillStroke(ctx, col, .015);
    ctx.strokeStyle = 'rgba(34,28,34,.22)'; ctx.lineWidth = .009;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(.05 + i * .02, -.02 + i * .03);
      ctx.quadraticCurveTo(.15 + i * .03, -.13 + i * .06, .22 - i * .02, -.21 + i * .09);
      ctx.stroke();
    }
    ctx.restore();
  }
}
function drawHalo(ctx, col = '#f2cf5a', t = 0) {
  ctx.save();
  ctx.translate(0, HY - HR * 1.52 + Math.sin(t * 2.4) * .006);
  ellipse(ctx, 0, 0, HR * .62, HR * .20);
  ctx.lineWidth = .020; ctx.strokeStyle = col; ctx.stroke();
  ctx.restore();
}

// A bow, as a prop callback: castFig(ctx, { ..., prop: cupidBow })
function cupidBow(ctx, k, hand, ang, side) {
  if (k !== 'R') return;
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(ang - .4); ctx.scale(side, 1);
  ctx.beginPath(); ctx.arc(0, 0, .105, -1.25, 1.25);
  ctx.lineWidth = .022; ctx.strokeStyle = '#b5762e'; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(Math.cos(-1.25) * .105, Math.sin(-1.25) * .105);
  ctx.lineTo(Math.cos(1.25) * .105, Math.sin(1.25) * .105);
  ctx.lineWidth = .008; ctx.strokeStyle = '#efe6d4'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-.03, 0); ctx.lineTo(.16, 0);
  ctx.lineWidth = .013; ctx.strokeStyle = '#8a5a2e'; ctx.stroke();
  ctx.beginPath();                                     // a heart for a head
  ctx.moveTo(.20, 0);
  ctx.quadraticCurveTo(.15, -.05, .145, -.012);
  ctx.quadraticCurveTo(.145, .022, .20, .052);
  ctx.quadraticCurveTo(.255, .022, .255, -.012);
  ctx.quadraticCurveTo(.25, -.05, .20, 0);
  ctx.closePath(); fillStroke(ctx, '#d8364a', .010);
  ctx.restore();
}

// Cupid: wings, a halo, a toga and the bow. Spread it into a castFig call.
const CUPID = {
  build: 'petite', skin: 'light', hair: 'curls', hairCol: 'sand',
  outfit: 'toga', cols: ['#fbf8f0', '#f2cf5a'],
  wings: true, halo: true, blush: true, hat: 'none',
  face: { eyes: 'happy', mouth: 'smirk' }, prop: cupidBow,
  arms: { L: [1.15, -1.05], R: [1.35, -.55] },
};

// ---------- four-legged pets ----------
// A dog or a cat at someone's feet. The biped rig with an animal head is a character;
// this is an animal.
function petFig(ctx, o) {
  const kind = o.kind || 'dog', s = o.s || 300, flip = o.flip || 1, t = o.t || 0;
  const A = ANIMAL[kind] || ANIMAL.dog, fur = o.furCol || A.fur;
  const leg = mix2(fur, '#2a2028', .14), legB = mix2(fur, '#2a2028', .30);
  ctx.save(); ctx.translate(o.x, o.y);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.shadow !== false) {
    ctx.save(); ctx.scale(s, s); ellipse(ctx, -.02, 0, .34, .055);
    ctx.fillStyle = 'rgba(40,20,30,.22)'; ctx.fill(); ctx.restore();
  }
  ctx.scale(s * flip, s);
  ctx.translate(0, Math.sin(t * 3) * .005);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const bx = -.06, by = -.255, brx = .255, bry = .135;   // the barrel
  const hx = .30, hy = -.40, hr = .145;                  // the head
  drawTail(ctx, A.tail, bx - brx + .02, by - .05, .80, fur, t);
  for (const [lx, back] of [[bx - .14, 1], [bx + .15, 1]]) {   // far legs
    ctx.beginPath(); ctx.moveTo(lx, by + .07); ctx.lineTo(lx - .012, -.006);
    ctx.lineWidth = .072; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = .054; ctx.strokeStyle = legB; ctx.stroke();
  }
  ctx.beginPath();                                        // the neck
  ctx.moveTo(bx + brx * .55, by - .04); ctx.lineTo(hx - .03, hy + .09);
  ctx.lineWidth = .17; ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = .145; ctx.strokeStyle = fur; ctx.stroke();
  ellipse(ctx, bx, by, brx, bry); fillStroke(ctx, fur, .017);
  ellipse(ctx, bx + .125, by + .058, brx * .42, bry * .34);  // a chest patch, not a belly
  fillStroke(ctx, o.muzCol || A.muz, 0);
  for (const [lx] of [[bx - .09], [bx + .20]]) {          // near legs
    ctx.beginPath(); ctx.moveTo(lx, by + .07); ctx.lineTo(lx + .012, -.006);
    ctx.lineWidth = .078; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = .060; ctx.strokeStyle = leg; ctx.stroke();
    ellipse(ctx, lx + .018, -.008, .042, .022); fillStroke(ctx, leg, .014);
  }
  if (o.collar !== false) {
    ctx.save(); ctx.translate(hx - .10, hy + .14); ctx.rotate(.42);
    rrect(ctx, -.062, -.017, .124, .034, .015); fillStroke(ctx, o.collarCol || '#d8364a', .013);
    circle(ctx, 0, .028, .020); fillStroke(ctx, '#e8b43a', .012);
    ctx.restore();
  }
  drawAnimalHead(ctx, kind, hx, hy, hr, { furCol: fur, muzCol: o.muzCol, tongue: o.tongue });
  ctx.restore();
}

// a local mix, so this file never depends on env.js load order
function mix2(a, b, k) {
  if (a[0] !== '#' || b[0] !== '#') return a;
  const A = hex2(a), B = hex2(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
}

// ---------- money: jewellery, shades, fur, heels, and things to hold ----------
// Built as separate parts on purpose. A gown, pearls and dark glasses are a glamorous
// woman; they only become a character when a script says what she is doing. The two
// presets at the bottom just bundle them.

const GOLD = '#e8b43a', GOLD_D = '#a9761c', SILVER = '#cfd4d7';

// Dark glasses. Registered as a `glasses` kind so it goes through the same slot.
function drawShades(ctx, col = '#262129', lens = 'rgba(28,24,32,.88)') {
  const ex = .072, ey = HY - .010;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * (ex - .050), ey - .044);
    ctx.lineTo(side * (ex + .066), ey - .048);
    ctx.quadraticCurveTo(side * (ex + .070), ey + .044, side * (ex + .004), ey + .040);
    ctx.quadraticCurveTo(side * (ex - .050), ey + .030, side * (ex - .050), ey - .044);
    ctx.closePath();
    ctx.fillStyle = lens; ctx.fill();
    ctx.lineWidth = .013; ctx.strokeStyle = col; ctx.stroke();
    ctx.beginPath();                                   // a glint
    ctx.moveTo(side * (ex - .030), ey - .030); ctx.lineTo(side * (ex + .010), ey + .018);
    ctx.lineWidth = .010; ctx.strokeStyle = 'rgba(255,255,255,.30)'; ctx.stroke();
  }
  ctx.lineWidth = .013; ctx.strokeStyle = col;
  ctx.beginPath(); ctx.moveTo(-ex + .050, ey - .030); ctx.lineTo(ex - .050, ey - .030); ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * (ex + .066), ey - .040);
    ctx.lineTo(side * HR * .99, ey - .058); ctx.stroke();
  }
  ctx.restore();
}

function drawEarrings(ctx, kind = 'hoop', col = GOLD) {
  for (const side of [-1, 1]) {
    const x = side * HR * .92, y = HY + HR * .22;
    if (kind === 'stud') { circle(ctx, x, y, .018); fillStroke(ctx, col, .009); }
    else if (kind === 'drop') {
      line(ctx, x, y - .012, x, y + .030, .008, col);
      circle(ctx, x, y + .046, .022); fillStroke(ctx, col, .009);
    } else {
      ctx.beginPath(); ctx.arc(x, y + .028, .030, -.5, Math.PI + .5);
      ctx.lineWidth = .012; ctx.strokeStyle = col; ctx.stroke();
    }
  }
}

// Worn on the chest, so it goes on after the torso.
function drawNecklace(ctx, B, kind = 'pearls', col = '#f3efe6') {
  const y = B.top + .085;
  ctx.save(); ctx.lineCap = 'round';
  if (kind === 'chain') {
    ctx.beginPath();
    ctx.moveTo(-B.sh * .42, y - .02);
    ctx.quadraticCurveTo(0, y + .115, B.sh * .42, y - .02);
    ctx.lineWidth = .016; ctx.strokeStyle = GOLD_D; ctx.stroke();
    ctx.lineWidth = .010; ctx.strokeStyle = GOLD; ctx.stroke();
  } else if (kind === 'pendant') {
    ctx.beginPath();
    ctx.moveTo(-B.sh * .36, y - .01);
    ctx.quadraticCurveTo(0, y + .080, B.sh * .36, y - .01);
    ctx.lineWidth = .009; ctx.strokeStyle = col; ctx.stroke();
    circle(ctx, 0, y + .086, .022); fillStroke(ctx, col, .010);
  } else {                                             // pearls
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, x = lerp(-B.sh * .40, B.sh * .40, t);
      const yy = y + Math.sin(t * Math.PI) * .070;
      circle(ctx, x, yy, .014); fillStroke(ctx, col, .007);
    }
  }
  ctx.restore();
}

// A stole over both shoulders. After the torso, before the arms read as covered.
function drawFur(ctx, B, col = '#d8c7ad') {
  const y = B.top + .070, w = B.sh + .085;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i <= 26; i++) {
    const t = i / 26, x = lerp(-w, w, t);
    const r = .044 + ((i % 3) * .011);
    i ? ctx.lineTo(x, y + Math.sin(t * Math.PI) * .030 - r)
      : ctx.moveTo(x, y + Math.sin(t * Math.PI) * .030 - r);
  }
  for (let i = 26; i >= 0; i--) {
    const t = i / 26, x = lerp(-w, w, t);
    const r = .044 + ((i % 3) * .011);
    ctx.lineTo(x, y + Math.sin(t * Math.PI) * .030 + r);
  }
  ctx.closePath(); fillStroke(ctx, col, .014);
  ctx.strokeStyle = 'rgba(34,28,34,.14)'; ctx.lineWidth = .008;
  for (let i = 1; i < 9; i++) {
    const x = lerp(-w * .8, w * .8, i / 9);
    ctx.beginPath(); ctx.moveTo(x, y - .030); ctx.lineTo(x + .012, y + .030); ctx.stroke();
  }
  ctx.restore();
}

// A watch on one wrist, and nails on both hands. Drawn with the arms.
function drawWatch(ctx, hand, ang, side, col = GOLD) {
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(ang);
  rrect(ctx, -.030, -.022, .060, .044, .010); fillStroke(ctx, '#3a3340', .010);
  circle(ctx, 0, 0, .024); fillStroke(ctx, col, .010);
  circle(ctx, 0, 0, .013); fillStroke(ctx, '#fffdf8', 0);
  ctx.restore();
}
function drawNails(ctx, hand, col = '#c2283c') {
  for (let i = 0; i < 3; i++) {
    const a = -.6 + i * .6;
    ellipse(ctx, hand[0] + Math.cos(a) * .026, hand[1] + Math.sin(a) * .026, .009, .006, a);
    fillStroke(ctx, col, 0);
  }
}

// ---------- things to hold, as `prop` callbacks ----------
function cashFan(ctx, k, hand, ang, side) {
  if (k !== 'R') return;
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(ang - .5); ctx.scale(side, 1);
  for (let i = 0; i < 4; i++) {
    ctx.save(); ctx.rotate(-.30 + i * .20);
    rrect(ctx, -.012, -.046, .150, .092, .010); fillStroke(ctx, '#c7dfb9', .010);
    circle(ctx, .065, 0, .022); fillStroke(ctx, '#9cc088', .008);
    ctx.restore();
  }
  ctx.restore();
}
function champagne(ctx, k, hand, ang, side) {
  if (k !== 'R') return;
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(ang * .25); ctx.scale(side, 1);
  ctx.beginPath();
  ctx.moveTo(-.034, -.100); ctx.lineTo(.034, -.100);
  ctx.quadraticCurveTo(.020, -.020, .006, -.004); ctx.lineTo(-.006, -.004);
  ctx.quadraticCurveTo(-.020, -.020, -.034, -.100);
  ctx.closePath(); fillStroke(ctx, 'rgba(255,255,255,.26)', .010);
  ctx.beginPath();
  ctx.moveTo(-.028, -.070); ctx.lineTo(.028, -.070);
  ctx.quadraticCurveTo(.016, -.022, .004, -.008); ctx.lineTo(-.004, -.008);
  ctx.quadraticCurveTo(-.016, -.022, -.028, -.070);
  ctx.closePath(); fillStroke(ctx, '#f2cf5a', 0);
  line(ctx, 0, -.004, 0, .034, .010, INK);
  ellipse(ctx, 0, .038, .030, .010); fillStroke(ctx, 'rgba(255,255,255,.30)', .009);
  ctx.restore();
}
function handbag(ctx, k, hand, ang, side, col = '#8a2f3e') {
  if (k !== 'L') return;
  ctx.save(); ctx.translate(hand[0], hand[1]);
  ctx.beginPath(); ctx.arc(0, .052, .046, Math.PI, 0);
  ctx.lineWidth = .011; ctx.strokeStyle = GOLD_D; ctx.stroke();
  rrect(ctx, -.062, .050, .124, .086, .014); fillStroke(ctx, col, .012);
  rrect(ctx, -.016, .082, .032, .018, .008); fillStroke(ctx, GOLD, .008);
  ctx.restore();
}
function cigar(ctx, k, hand, ang, side) {
  if (k !== 'R') return;
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(ang - .3); ctx.scale(side, 1);
  rrect(ctx, 0, -.012, .110, .024, .010); fillStroke(ctx, '#6b4a2a', .009);
  rrect(ctx, .086, -.012, .024, .024, .008); fillStroke(ctx, '#c08b52', 0);
  circle(ctx, .004, 0, .011); fillStroke(ctx, '#d8604e', 0);
  ctx.restore();
}

// ---------- two presets ----------
const RICH_MAN = {
  build: 'broad', skin: 'tan', hair: 'crop', hairCol: '#5a544c',
  outfit: 'pinstripe', cols: ['#2b2a38', '#8c2733'],
  glasses: 'shades', watch: true, necklace: 'chain', beard: 'short', beardCol: '#3f3a34',
  face: { eyes: 'normal', mouth: 'smile' },
  arms: { L: [.95, -2.1], R: [1.15, -.45] }, prop: cigar,
};
const GLAM_WOMAN = {
  build: 'curvy', skin: 'light', hair: 'longWavy', hairCol: 'auburn',
  outfit: 'glam', cols: ['#b4123f', '#f2cf5a'],
  glasses: 'shades', earrings: 'drop', necklace: 'pearls', fur: true, heels: true,
  nails: '#c2283c',
  face: { eyes: 'normal', mouth: 'smile' },
  arms: { L: [.34, -.16], R: [1.10, -.50] }, prop: champagne,
};
