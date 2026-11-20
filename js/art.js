/* =====================================================================
   The Last Hand — character art
   ---------------------------------------------------------------------
   Every portrait is drawn as vector geometry at runtime. No image files,
   no downloads, no licences to audit: the art is code, so it stays crisp
   at any size and adds ~0 bundle weight.

   Each portrait is a bust in a 200x250 frame with:
     - a dark halo so the figure reads against the table
     - strong single-source rim light (chiaroscuro)
     - one identifying silhouette cue per character
   ===================================================================== */
(function (global) {
  'use strict';

  let uid = 0;

  const PALETTE = {
    void:  '#07070a',
    bone:  '#e6dcc9',
    blood: '#8e1b18',
    amber: '#e8b063',
    cold:  '#7c8b95',
    pale:  '#cdbfa6',
    ink:   '#12121a'
  };

  /* --- shared defs: a light source, a cloak gradient, a halo --------- */
  function defs(k, accent, skin) {
    return `
    <radialGradient id="halo${k}" cx="50%" cy="42%" r="62%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.30"/>
      <stop offset="55%" stop-color="${accent}" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="${PALETTE.void}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="cloak${k}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1b1b24"/>
      <stop offset="52%" stop-color="#0d0d13"/>
      <stop offset="100%" stop-color="#05050a"/>
    </linearGradient>
    <linearGradient id="skin${k}" x1="0.2" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="${skin}"/>
      <stop offset="58%" stop-color="${PALETTE.pale}"/>
      <stop offset="100%" stop-color="#6f6558"/>
    </linearGradient>
    <linearGradient id="rim${k}" x1="0" y1="0" x2="1" y2="0.35">
      <stop offset="0%" stop-color="${PALETTE.amber}" stop-opacity="0.85"/>
      <stop offset="45%" stop-color="${PALETTE.amber}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${PALETTE.blood}" stop-opacity="0.35"/>
    </linearGradient>
    <radialGradient id="vig${k}" cx="50%" cy="45%" r="52%">
      <stop offset="62%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.78"/>
    </radialGradient>`;
  }

  function frame(k, label, inner) {
    return `<svg class="portrait-svg" viewBox="0 0 200 250" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="118" rx="98" ry="118" fill="url(#halo${k})"/>
      <ellipse cx="100" cy="232" rx="86" ry="26" fill="#000" opacity="0.55"/>
      <g class="breathe">${inner}</g>
      <rect x="0" y="0" width="200" height="250" fill="url(#vig${k})" pointer-events="none"/>
    </svg>`;
  }

  /* ------------------------------------------------------------------
     Individual characters
     ------------------------------------------------------------------ */

  function widow(k) {
    return `
    ${defs(k, PALETTE.amber, '#b9a891')}
    <!-- shoulders / mourning dress -->
    <path d="M28 250 Q34 176 74 158 L126 158 Q166 176 172 250 Z" fill="url(#cloak${k})"/>
    <path d="M28 250 Q34 176 74 158 L92 158 Q72 186 66 250 Z" fill="#000" opacity="0.45"/>
    <!-- neck -->
    <path d="M86 150 Q100 162 114 150 L116 128 L84 128 Z" fill="url(#skin${k})" opacity="0.9"/>
    <!-- head -->
    <ellipse cx="100" cy="100" rx="31" ry="38" fill="url(#skin${k})"/>
    <!-- hair mass -->
    <path d="M66 96 Q62 52 100 46 Q138 52 134 96 Q130 70 100 66 Q70 70 66 96 Z" fill="#0a0a10"/>
    <!-- lace veil over the face -->
    <path d="M64 66 Q100 50 136 66 L142 148 Q100 168 58 148 Z" fill="#0f0f16" opacity="0.55"/>
    <g stroke="#cfc4ae" stroke-width="1" opacity="0.30" fill="none">
      <path d="M64 92 Q100 82 136 92"/><path d="M63 108 Q100 99 137 108"/>
      <path d="M63 124 Q100 116 137 124"/><path d="M62 140 Q100 134 138 140"/>
      <path d="M78 66 L74 152"/><path d="M92 60 L89 158"/><path d="M108 60 L111 158"/><path d="M122 66 L126 152"/>
    </g>
    <!-- eyes through the veil -->
    <ellipse cx="88" cy="100" rx="5" ry="3.2" fill="#0a0a0e"/>
    <ellipse cx="112" cy="100" rx="5" ry="3.2" fill="#0a0a0e"/>
    <ellipse cx="86.6" cy="99.2" rx="1.5" ry="1.5" fill="${PALETTE.bone}" opacity="0.85"/>
    <ellipse cx="110.6" cy="99.2" rx="1.5" ry="1.5" fill="${PALETTE.bone}" opacity="0.85"/>
    <!-- mouth -->
    <path d="M93 121 Q100 124 107 121" stroke="#4a1a18" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- rim light down the left cheek -->
    <path d="M69 84 Q63 108 70 132" stroke="url(#rim${k})" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.9"/>
    <!-- hand holding a card -->
    <g transform="translate(132 196) rotate(-14)">
      <rect x="0" y="0" width="30" height="42" rx="3" fill="#efe6d2" stroke="#b9a888" stroke-width="1.2"/>
      <text x="15" y="17" font-size="13" text-anchor="middle" fill="#1a1a22" font-family="serif">♠</text>
      <path d="M15 22 l5 8 h-10 z" fill="#1a1a22"/>
      <text x="15" y="37" font-size="9" text-anchor="middle" fill="#1a1a22" font-family="serif">A</text>
    </g>
    <path d="M124 200 q14 -8 22 2 q-6 16 -20 14 z" fill="#16161e"/>`;
  }

  function gravedigger(k) {
    return `
    ${defs(k, PALETTE.cold, '#a8947c')}
    <!-- shoulders / leather coat -->
    <path d="M24 250 Q32 172 74 156 L126 156 Q168 172 176 250 Z" fill="url(#cloak${k})"/>
    <path d="M74 156 L100 186 L126 156" fill="#000" opacity="0.5"/>
    <!-- spade over the shoulder -->
    <g transform="rotate(-18 156 176)">
      <rect x="150" y="60" width="7" height="150" fill="#3a2c1f" rx="3"/>
      <path d="M136 196 h36 l-6 44 h-24 z" fill="#6b6b72"/>
      <path d="M136 196 h36 l-2 10 h-32 z" fill="#8a8a92" opacity="0.6"/>
    </g>
    <!-- neck -->
    <path d="M86 148 Q100 158 114 148 L116 126 L84 126 Z" fill="url(#skin${k})"/>
    <!-- head -->
    <ellipse cx="100" cy="98" rx="32" ry="36" fill="url(#skin${k})"/>
    <!-- stubble -->
    <path d="M70 108 Q100 138 130 108 Q128 132 100 136 Q72 132 70 108 Z" fill="#2a2620" opacity="0.35"/>
    <!-- hood -->
    <path d="M62 104 Q58 46 100 40 Q142 46 138 104 Q134 74 100 70 Q66 74 62 104 Z" fill="#14141a"/>
    <path d="M62 100 Q60 58 100 52 Q84 62 78 96 Z" fill="#000" opacity="0.4"/>
    <!-- deep-set eyes -->
    <path d="M81 96 q7 -5 14 0 q-7 4 -14 0z" fill="#0b0b0e"/>
    <path d="M105 96 q7 -5 14 0 q-7 4 -14 0z" fill="#0b0b0e"/>
    <circle cx="88" cy="96" r="1.6" fill="${PALETTE.bone}"/>
    <circle cx="112" cy="96" r="1.6" fill="${PALETTE.bone}"/>
    <!-- brow creases -->
    <path d="M79 86 q9 -4 18 -1" stroke="#2a2118" stroke-width="2" fill="none" opacity="0.7"/>
    <path d="M103 85 q9 -3 18 1" stroke="#2a2118" stroke-width="2" fill="none" opacity="0.7"/>
    <!-- mouth, tired -->
    <path d="M92 122 q8 -3 16 0" stroke="#3b2a20" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- lantern glow from below -->
    <ellipse cx="100" cy="140" rx="42" ry="16" fill="${PALETTE.amber}" opacity="0.10"/>
    <path d="M66 92 Q60 112 66 130" stroke="url(#rim${k})" stroke-width="3.5" fill="none" opacity="0.8"/>`;
  }

  function confessor(k) {
    return `
    ${defs(k, PALETTE.amber, '#bfae97')}
    <!-- cassock -->
    <path d="M26 250 Q34 174 74 158 L126 158 Q166 174 174 250 Z" fill="url(#cloak${k})"/>
    <!-- white collar -->
    <path d="M100 158 L120 190 L100 214 L80 190 Z" fill="#d8cfba" opacity="0.9"/>
    <!-- neck -->
    <path d="M86 150 Q100 160 114 150 L116 128 L84 128 Z" fill="url(#skin${k})"/>
    <!-- head -->
    <ellipse cx="100" cy="98" rx="31" ry="36" fill="url(#skin${k})"/>
    <!-- tonsured hair -->
    <path d="M70 92 Q66 56 100 50 Q134 56 130 92 Q126 68 100 64 Q74 68 70 92 Z" fill="#12121a"/>
    <!-- blindfold bandage -->
    <path d="M66 88 Q100 76 134 88 L136 104 Q100 94 64 104 Z" fill="#ded4bd"/>
    <path d="M66 88 Q100 76 134 88 L134 92 Q100 81 66 92 Z" fill="#b9ad94"/>
    <g stroke="#b9ad94" stroke-width="0.8" opacity="0.7">
      <path d="M70 90 L66 104"/><path d="M84 88 L82 100"/><path d="M100 84 L100 97"/>
      <path d="M116 88 L118 100"/><path d="M130 90 L134 104"/>
    </g>
    <!-- mouth solemn -->
    <path d="M92 120 q8 2 16 0" stroke="#3b2a20" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- candle in hand -->
    <g transform="translate(146 176)">
      <rect x="0" y="0" width="12" height="52" rx="3" fill="#e2d7bf"/>
      <rect x="0" y="0" width="5" height="52" fill="#c2b79c" opacity="0.7"/>
      <ellipse cx="6" cy="0" rx="10" ry="4" fill="#fff4d2" opacity="0.5"/>
      <path d="M6 -18 q7 9 0 16 q-7 -7 0 -16z" fill="#ffd27a"/>
      <path d="M6 -13 q3.5 5 0 9 q-3.5 -4 0 -9z" fill="#fff9e6"/>
      <ellipse cx="6" cy="-6" rx="16" ry="18" fill="${PALETTE.amber}" opacity="0.13"/>
    </g>
    <path d="M136 196 q10 -10 20 0 q-4 12 -14 12 q-8 0 -6 -12z" fill="#16161e"/>
    <!-- warm rim -->
    <path d="M69 84 Q63 108 70 130" stroke="url(#rim${k})" stroke-width="4" fill="none" opacity="0.95"/>`;
  }

  function bride(k) {
    return `
    ${defs(k, '#c9c2d2', '#e8e2d6')}
    <!-- gown -->
    <path d="M20 250 Q30 172 72 156 L128 156 Q170 172 180 250 Z" fill="#d9d2c4" opacity="0.16"/>
    <path d="M20 250 Q30 172 72 156 L128 156 Q170 172 180 250 Z" fill="url(#cloak${k})" opacity="0.55"/>
    <!-- neck -->
    <path d="M86 148 Q100 158 114 148 L116 126 L84 126 Z" fill="url(#skin${k})"/>
    <!-- porcelain face -->
    <ellipse cx="100" cy="98" rx="30" ry="35" fill="#efe9dd"/>
    <ellipse cx="100" cy="98" rx="30" ry="35" fill="url(#skin${k})" opacity="0.35"/>
    <!-- cracks -->
    <g stroke="#7d7466" stroke-width="1.1" fill="none" opacity="0.85">
      <path d="M78 78 l8 12 l-5 9 l7 8"/>
      <path d="M120 84 l-7 10 l4 7"/>
      <path d="M100 60 l-2 14"/>
    </g>
    <!-- hollow eyes -->
    <ellipse cx="88" cy="98" rx="7.5" ry="9" fill="#05050a"/>
    <ellipse cx="112" cy="98" rx="7.5" ry="9" fill="#05050a"/>
    <ellipse cx="88" cy="100" rx="2" ry="2.6" fill="${PALETTE.blood}" opacity="0.6"/>
    <ellipse cx="112" cy="100" rx="2" ry="2.6" fill="${PALETTE.blood}" opacity="0.6"/>
    <!-- painted mouth -->
    <path d="M92 120 q8 5 16 0 q-8 8 -16 0z" fill="#7a1f1c" opacity="0.85"/>
    <!-- veil -->
    <path d="M62 70 Q100 48 138 70 L152 220 Q100 236 48 220 Z" fill="#efe9dd" opacity="0.12"/>
    <path d="M62 70 Q100 48 138 70 L140 108 Q100 92 60 108 Z" fill="#efe9dd" opacity="0.18"/>
    <g stroke="#efe9dd" stroke-width="0.7" opacity="0.25" fill="none">
      <path d="M56 110 Q100 96 144 110"/><path d="M52 140 Q100 128 148 140"/>
      <path d="M50 170 Q100 162 150 170"/><path d="M48 200 Q100 196 152 200"/>
      <path d="M72 66 L58 216"/><path d="M128 66 L142 216"/>
    </g>
    <!-- dried bouquet -->
    <g transform="translate(30 186) rotate(-12)" opacity="0.9">
      <path d="M8 52 L4 8 M8 52 L16 10 M8 52 L-2 14" stroke="#3a352c" stroke-width="1.6"/>
      <circle cx="4" cy="8" r="4" fill="#2a2620"/><circle cx="16" cy="10" r="4" fill="#2a2620"/>
      <circle cx="-2" cy="14" r="3.4" fill="#231f1a"/>
    </g>
    <path d="M70 82 Q64 104 71 126" stroke="url(#rim${k})" stroke-width="3.5" fill="none" opacity="0.75"/>`;
  }

  function croupier(k) {
    return `
    ${defs(k, PALETTE.blood, '#cfc6b4')}
    <!-- tailcoat -->
    <path d="M24 250 Q32 174 74 158 L126 158 Q168 174 176 250 Z" fill="url(#cloak${k})"/>
    <path d="M74 158 L100 210 L126 158 L114 158 L100 186 L86 158 Z" fill="#e8e2d2" opacity="0.9"/>
    <path d="M96 190 L104 190 L106 250 L94 250 Z" fill="#7a1f1c"/>
    <!-- neck -->
    <path d="M86 150 Q100 158 114 150 L116 128 L84 128 Z" fill="url(#skin${k})" opacity="0.75"/>
    <!-- blank head: no face at all -->
    <ellipse cx="100" cy="98" rx="30" ry="35" fill="#14141c"/>
    <ellipse cx="100" cy="98" rx="30" ry="35" fill="url(#skin${k})" opacity="0.10"/>
    <path d="M70 98 Q100 84 130 98" stroke="#2a2a34" stroke-width="1.4" fill="none" opacity="0.8"/>
    <!-- top hat -->
    <rect x="72" y="46" width="56" height="34" rx="3" fill="#0a0a10"/>
    <rect x="72" y="46" width="56" height="7" fill="#1a1a22"/>
    <ellipse cx="100" cy="80" rx="42" ry="7" fill="#0a0a10"/>
    <ellipse cx="100" cy="78" rx="42" ry="6" fill="#16161e"/>
    <path d="M74 50 h52" stroke="${PALETTE.blood}" stroke-width="2" opacity="0.6"/>
    <!-- gloved hands holding cards -->
    <g transform="translate(28 200) rotate(9)">
      <rect x="0" y="0" width="26" height="36" rx="3" fill="#efe6d2"/>
      <text x="13" y="15" font-size="11" text-anchor="middle" fill="#1a1a22" font-family="serif">♦</text>
      <text x="13" y="32" font-size="9" text-anchor="middle" fill="#1a1a22" font-family="serif">7</text>
    </g>
    <g transform="translate(146 198) rotate(-9)">
      <rect x="0" y="0" width="26" height="36" rx="3" fill="#efe6d2"/>
      <text x="13" y="15" font-size="11" text-anchor="middle" fill="#8e1b18" font-family="serif">♥</text>
      <text x="13" y="32" font-size="9" text-anchor="middle" fill="#1a1a22" font-family="serif">4</text>
    </g>
    <!-- rim -->
    <path d="M71 84 Q65 108 72 130" stroke="url(#rim${k})" stroke-width="3.5" fill="none" opacity="0.7"/>
    <ellipse cx="100" cy="98" rx="30" ry="35" fill="none" stroke="${PALETTE.blood}" stroke-width="0.8" opacity="0.25"/>`;
  }

  function mourner(k) {
    return `
    ${defs(k, PALETTE.cold, '#a39482')}
    <path d="M26 250 Q34 174 74 158 L126 158 Q166 174 174 250 Z" fill="url(#cloak${k})"/>
    <!-- mourning shawl -->
    <path d="M60 160 Q100 176 140 160 L146 250 L54 250 Z" fill="#0a0a11" opacity="0.85"/>
    <path d="M86 150 Q100 160 114 150 L116 128 L84 128 Z" fill="url(#skin${k})"/>
    <ellipse cx="100" cy="98" rx="30" ry="35" fill="url(#skin${k})"/>
    <!-- hood -->
    <path d="M64 108 Q58 44 100 38 Q142 44 136 108 Q132 72 100 68 Q68 72 64 108 Z" fill="#10101a"/>
    <!-- sorrowful eyes -->
    <path d="M82 96 q6 -4 13 0 q-6 3 -13 0z" fill="#0b0b0e"/>
    <path d="M105 96 q6 -4 13 0 q-6 3 -13 0z" fill="#0b0b0e"/>
    <circle cx="88" cy="95" r="1.5" fill="${PALETTE.bone}"/>
    <circle cx="111" cy="95" r="1.5" fill="${PALETTE.bone}"/>
    <!-- tear track -->
    <path d="M88 100 q1 8 -1 14" stroke="${PALETTE.cold}" stroke-width="1.4" fill="none" opacity="0.55"/>
    <!-- downturned mouth -->
    <path d="M92 122 q8 -4 16 0" stroke="#3b2a2a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- black-bordered card -->
    <g transform="translate(134 196) rotate(-10)">
      <rect x="0" y="0" width="30" height="42" rx="3" fill="#efe6d2"/>
      <rect x="0" y="0" width="30" height="42" rx="3" fill="none" stroke="#0a0a0e" stroke-width="4"/>
      <text x="15" y="27" font-size="14" text-anchor="middle" fill="#0a0a0e" font-family="serif">♣</text>
    </g>
    <path d="M124 200 q14 -8 22 2 q-6 16 -20 14 z" fill="#16161e"/>
    <path d="M67 88 Q61 110 68 132" stroke="url(#rim${k})" stroke-width="3.5" fill="none" opacity="0.7"/>`;
  }

  function veiled(k) {
    return `
    ${defs(k, PALETTE.blood, '#9c9082')}
    <!-- high collar and long coat -->
    <path d="M22 250 Q30 168 74 152 L126 152 Q170 168 178 250 Z" fill="url(#cloak${k})"/>
    <path d="M74 152 L100 178 L126 152 L112 148 L100 166 L88 148 Z" fill="#1c1c26"/>
    <!-- hood peak -->
    <path d="M100 26 Q58 40 56 100 Q56 128 70 142 L130 142 Q144 128 144 100 Q142 40 100 26 Z" fill="#0c0c14"/>
    <path d="M100 30 Q64 44 62 98 Q62 122 74 136 L126 136 Q138 122 138 98 Q136 44 100 30 Z" fill="#14141e"/>
    <!-- full-face mask -->
    <path d="M100 54 Q126 56 130 94 Q132 122 100 134 Q68 122 70 94 Q74 56 100 54 Z" fill="#d8cebb"/>
    <path d="M100 54 Q126 56 130 94 Q132 122 100 134 Q68 122 70 94 Q74 56 100 54 Z" fill="url(#skin${k})" opacity="0.28"/>
    <!-- eye slits: empty -->
    <path d="M78 92 q9 -6 19 0 q-10 7 -19 0z" fill="#05050a"/>
    <path d="M103 92 q9 -6 19 0 q-10 7 -19 0z" fill="#05050a"/>
    <!-- gold filigree on the mask -->
    <g stroke="${PALETTE.amber}" stroke-width="1.1" fill="none" opacity="0.55">
      <path d="M100 58 L100 78"/><path d="M88 70 q12 -8 24 0"/>
      <path d="M76 116 q24 14 48 0"/><path d="M82 126 q18 10 36 0"/>
      <circle cx="100" cy="86" r="3.2"/>
    </g>
    <!-- sealed mouth -->
    <path d="M92 116 q8 3 16 0" stroke="#4a3a30" stroke-width="1.6" fill="none"/>
    <rect x="94" y="112" width="12" height="3" fill="${PALETTE.blood}" opacity="0.75"/>
    <!-- rim -->
    <path d="M70 76 Q58 104 68 136" stroke="url(#rim${k})" stroke-width="4" fill="none" opacity="0.95"/>
    <path d="M130 78 Q142 104 132 136" stroke="${PALETTE.blood}" stroke-width="2" fill="none" opacity="0.35"/>`;
  }


  /* ---------------- Act II ----------------
     The long table. Things that have been at it a while. */

  function charnel(k) {
    return `
    ${defs(k, '#9aa6a0', '#a2927c')}
    <!-- butcher's apron -->
    <path d="M22 250 Q30 170 74 154 L126 154 Q170 170 178 250 Z" fill="url(#cloak${k})"/>
    <path d="M70 168 L130 168 L138 250 L62 250 Z" fill="#3a332b" opacity="0.9"/>
    <path d="M70 168 L130 168 L132 180 L68 180 Z" fill="#4a4034"/>
    <!-- neck -->
    <path d="M86 146 Q100 156 114 146 L116 124 L84 124 Z" fill="url(#skin${k})"/>
    <!-- iron half-mask, riveted -->
    <ellipse cx="100" cy="96" rx="31" ry="35" fill="url(#skin${k})"/>
    <path d="M100 62 Q132 64 134 96 Q136 128 100 134 L100 62 Z" fill="#6f7278"/>
    <path d="M100 62 Q132 64 134 96 Q136 128 100 134 L100 62 Z" fill="#8b8f96" opacity="0.35"/>
    <g fill="#4b4e54"><circle cx="112" cy="74" r="2"/><circle cx="124" cy="84" r="2"/>
      <circle cx="128" cy="100" r="2"/><circle cx="122" cy="116" r="2"/><circle cx="110" cy="126" r="2"/></g>
    <!-- eye slit, cold -->
    <rect x="102" y="92" width="26" height="4" rx="2" fill="#0a0a0e"/>
    <circle cx="114" cy="94" r="1.6" fill="${PALETTE.cold}"/>
    <!-- working jaw -->
    <path d="M84 118 Q92 126 100 124" stroke="#4a3a30" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M66 88 Q60 108 68 130" stroke="url(#rim${k})" stroke-width="3.5" fill="none" opacity="0.75"/>
    <!-- hanging hook -->
    <path d="M160 8 L160 60 q0 14 12 14 q12 0 12 -12" stroke="#5a5e66" stroke-width="3" fill="none"/>
    <path d="M172 74 q0 8 -6 8" stroke="#7d828a" stroke-width="3" fill="none"/>`;
  }

  function twins(k) {
    return `
    ${defs(k, '#a99bb0', '#b09a86')}
    <!-- one body, two heads -->
    <path d="M24 250 Q32 176 70 158 L130 158 Q168 176 176 250 Z" fill="url(#cloak${k})"/>
    <path d="M100 158 L100 250" stroke="#05050a" stroke-width="2" opacity="0.6"/>
    <!-- left head -->
    <ellipse cx="76" cy="100" rx="24" ry="30" fill="url(#skin${k})"/>
    <path d="M52 104 Q50 62 76 58 Q102 62 100 104 Q96 78 76 74 Q56 78 52 104 Z" fill="#12121a"/>
    <ellipse cx="68" cy="100" rx="3.4" ry="4.4" fill="#08080c"/>
    <ellipse cx="84" cy="100" rx="3.4" ry="4.4" fill="#08080c"/>
    <circle cx="67" cy="99" r="1.2" fill="${PALETTE.bone}"/>
    <circle cx="83" cy="99" r="1.2" fill="${PALETTE.bone}"/>
    <path d="M70 116 q6 3 12 0" stroke="#3b2a20" stroke-width="1.8" fill="none"/>
    <!-- right head -->
    <ellipse cx="124" cy="100" rx="24" ry="30" fill="url(#skin${k})"/>
    <path d="M100 104 Q98 62 124 58 Q150 62 148 104 Q144 78 124 74 Q104 78 100 104 Z" fill="#12121a"/>
    <ellipse cx="116" cy="100" rx="3.4" ry="4.4" fill="#08080c"/>
    <ellipse cx="132" cy="100" rx="3.4" ry="4.4" fill="#08080c"/>
    <circle cx="115" cy="99" r="1.2" fill="${PALETTE.bone}"/>
    <circle cx="131" cy="99" r="1.2" fill="${PALETTE.bone}"/>
    <path d="M118 116 q6 3 12 0" stroke="#3b2a20" stroke-width="1.8" fill="none"/>
    <!-- joined hands at the collar -->
    <path d="M92 168 q8 -10 16 0 q-8 8 -16 0z" fill="url(#skin${k})"/>
    <path d="M54 88 Q48 104 56 122" stroke="url(#rim${k})" stroke-width="3" fill="none" opacity="0.7"/>
    <path d="M146 88 Q152 104 144 122" stroke="url(#rim${k})" stroke-width="3" fill="none" opacity="0.7"/>`;
  }

  function candleEater(k) {
    return `
    ${defs(k, PALETTE.amber, '#b9a58c')}
    <path d="M26 250 Q34 176 74 158 L126 158 Q166 176 174 250 Z" fill="url(#cloak${k})"/>
    <!-- neck, thin -->
    <path d="M88 148 Q100 156 112 148 L114 122 L86 122 Z" fill="url(#skin${k})"/>
    <!-- gaunt head -->
    <ellipse cx="100" cy="96" rx="28" ry="35" fill="url(#skin${k})"/>
    <path d="M72 92 Q70 54 100 50 Q130 54 128 92 Q124 68 100 64 Q76 68 72 92 Z" fill="#0e0e16"/>
    <!-- sunken cheeks -->
    <path d="M74 104 q6 22 12 24" stroke="#6c5f50" stroke-width="2" fill="none" opacity="0.55"/>
    <path d="M126 104 q-6 22 -12 24" stroke="#6c5f50" stroke-width="2" fill="none" opacity="0.55"/>
    <!-- hollow eyes -->
    <ellipse cx="88" cy="96" rx="6.5" ry="7.5" fill="#06060a"/>
    <ellipse cx="112" cy="96" rx="6.5" ry="7.5" fill="#06060a"/>
    <circle cx="88" cy="97" r="1.6" fill="${PALETTE.amber}" opacity="0.75"/>
    <circle cx="112" cy="97" r="1.6" fill="${PALETTE.amber}" opacity="0.75"/>
    <!-- mouth open around a flame -->
    <ellipse cx="100" cy="120" rx="9" ry="11" fill="#1a0f0b"/>
    <path d="M100 112 q5 6 0 12 q-5 -6 0 -12z" fill="#ffd27a"/>
    <ellipse cx="100" cy="118" rx="12" ry="14" fill="${PALETTE.amber}" opacity="0.16"/>
    <!-- wax running down the chin -->
    <path d="M96 131 q1 14 -2 22" stroke="#e6dcc9" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M104 131 q3 10 1 16" stroke="#d8cdb4" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.7"/>
    <!-- candle stubs at the shoulder -->
    <rect x="150" y="196" width="10" height="26" rx="2" fill="#e2d7bf"/>
    <path d="M155 182 q5 7 0 13 q-5 -6 0 -13z" fill="#ffd27a"/>
    <path d="M68 92 Q62 110 70 128" stroke="url(#rim${k})" stroke-width="3.5" fill="none" opacity="0.8"/>`;
  }

  /* ---------------- Act III ----------------
     The head of the table. It has been waiting. */

  function choir(k) {
    return `
    ${defs(k, '#8f7ba0', '#a99a8c')}
    <path d="M18 250 Q28 168 72 150 L128 150 Q172 168 182 250 Z" fill="url(#cloak${k})"/>
    <!-- three hoods, overlapping -->
    <g opacity="0.55">
      <ellipse cx="58" cy="106" rx="22" ry="28" fill="#0b0b12"/>
      <path d="M58 118 q6 8 0 12 q-6 -4 0 -12z" fill="#05050a"/>
    </g>
    <g opacity="0.55">
      <ellipse cx="142" cy="106" rx="22" ry="28" fill="#0b0b12"/>
      <path d="M142 118 q6 8 0 12 q-6 -4 0 -12z" fill="#05050a"/>
    </g>
    <!-- the centre face -->
    <ellipse cx="100" cy="96" rx="28" ry="34" fill="url(#skin${k})"/>
    <path d="M72 100 Q70 56 100 50 Q130 56 128 100 Q124 72 100 68 Q76 72 72 100 Z" fill="#0a0a12"/>
    <!-- all their mouths are open, singing -->
    <ellipse cx="88" cy="94" rx="5" ry="7" fill="#120a0e"/>
    <ellipse cx="112" cy="94" rx="5" ry="7" fill="#120a0e"/>
    <ellipse cx="100" cy="122" rx="10" ry="13" fill="#120a0e"/>
    <path d="M100 130 q4 -6 0 -12 q-4 6 0 12z" fill="#3a1020"/>
    <!-- breath -->
    <ellipse cx="100" cy="134" rx="16" ry="7" fill="${PALETTE.bone}" opacity="0.07"/>
    <!-- hood ring -->
    <path d="M100 40 Q60 48 62 104" stroke="#2a2030" stroke-width="3" fill="none" opacity="0.8"/>
    <path d="M100 40 Q140 48 138 104" stroke="#2a2030" stroke-width="3" fill="none" opacity="0.8"/>
    <path d="M70 88 Q64 108 72 128" stroke="url(#rim${k})" stroke-width="3.5" fill="none" opacity="0.8"/>`;
  }

  function surgeon(k) {
    return `
    ${defs(k, '#9ba79c', '#a89680')}
    <path d="M24 250 Q32 174 74 156 L126 156 Q168 174 176 250 Z" fill="url(#cloak${k})"/>
    <!-- leather apron, stained -->
    <path d="M70 170 L130 170 L138 250 L62 250 Z" fill="#2c241c"/>
    <g fill="#4a1a18" opacity="0.55">
      <circle cx="86" cy="204" r="7"/><circle cx="112" cy="226" r="5"/><circle cx="96" cy="236" r="3.4"/>
    </g>
    <!-- neck -->
    <path d="M86 148 Q100 158 114 148 L116 126 L84 126 Z" fill="url(#skin${k})"/>
    <!-- head -->
    <ellipse cx="100" cy="98" rx="30" ry="34" fill="url(#skin${k})"/>
    <path d="M70 94 Q68 56 100 52 Q132 56 130 94 Q126 70 100 66 Q74 70 70 94 Z" fill="#171018"/>
    <!-- brass goggles -->
    <g>
      <circle cx="86" cy="96" r="12" fill="#141018" stroke="#a8853f" stroke-width="2.4"/>
      <circle cx="114" cy="96" r="12" fill="#141018" stroke="#a8853f" stroke-width="2.4"/>
      <path d="M98 96 h4" stroke="#a8853f" stroke-width="2.4"/>
      <circle cx="86" cy="96" r="6" fill="#2b3a3a" opacity="0.9"/>
      <circle cx="114" cy="96" r="6" fill="#2b3a3a" opacity="0.9"/>
      <circle cx="83" cy="93" r="2" fill="#cfe0d8" opacity="0.5"/>
      <circle cx="111" cy="93" r="2" fill="#cfe0d8" opacity="0.5"/>
    </g>
    <!-- surgical mask -->
    <path d="M78 110 Q100 104 122 110 L120 128 Q100 134 80 128 Z" fill="#cfc6b2"/>
    <g stroke="#a89e8a" stroke-width="0.8"><path d="M84 112 L83 127"/><path d="M92 110 L91 129"/>
      <path d="M100 109 L100 130"/><path d="M108 110 L109 129"/><path d="M116 112 L117 127"/></g>
    <!-- bone saw -->
    <g transform="translate(140 190) rotate(14)">
      <rect x="0" y="0" width="46" height="9" rx="2" fill="#8b8f96"/>
      <path d="M0 9 h10 l2 4 l-2 4 h-10z" fill="#6f7278"/>
      <path d="M4 4 h38" stroke="#b9bdc4" stroke-width="1.4" opacity="0.7"/>
    </g>
    <path d="M68 86 Q60 108 68 130" stroke="url(#rim${k})" stroke-width="3.5" fill="none" opacity="0.85"/>`;
  }

  function head(k) {
    return `
    ${defs(k, PALETTE.blood, '#cfc4b0')}
    <!-- it is very tall -->
    <path d="M10 250 Q22 158 66 140 L134 140 Q178 158 190 250 Z" fill="url(#cloak${k})"/>
    <!-- collar of small candles -->
    <g opacity="0.9">
      <rect x="52" y="150" width="7" height="18" rx="2" fill="#ded3ba"/>
      <rect x="70" y="146" width="7" height="22" rx="2" fill="#ded3ba"/>
      <rect x="123" y="146" width="7" height="22" rx="2" fill="#ded3ba"/>
      <rect x="141" y="150" width="7" height="18" rx="2" fill="#ded3ba"/>
      <g fill="#ffd27a"><path d="M55.5 142 q4 6 0 10 q-4 -4 0 -10z"/>
        <path d="M73.5 138 q4 6 0 10 q-4 -4 0 -10z"/>
        <path d="M126.5 138 q4 6 0 10 q-4 -4 0 -10z"/>
        <path d="M144.5 142 q4 6 0 10 q-4 -4 0 -10z"/></g>
    </g>
    <!-- long mask: too long, too smooth -->
    <path d="M100 28 Q140 34 142 96 Q144 148 100 158 Q56 148 58 96 Q60 34 100 28 Z" fill="#d8cebb"/>
    <path d="M100 28 Q140 34 142 96 Q144 148 100 158 Q56 148 58 96 Q60 34 100 28 Z" fill="url(#skin${k})" opacity="0.30"/>
    <!-- seven eyes, arranged wrong -->
    <g fill="#05050a">
      <ellipse cx="82" cy="76" rx="7" ry="5"/>
      <ellipse cx="118" cy="76" rx="7" ry="5"/>
      <ellipse cx="100" cy="66" rx="6" ry="4.4"/>
      <ellipse cx="70" cy="96" rx="5" ry="3.6"/>
      <ellipse cx="130" cy="96" rx="5" ry="3.6"/>
      <ellipse cx="88" cy="112" rx="5.5" ry="4"/>
      <ellipse cx="112" cy="112" rx="5.5" ry="4"/>
    </g>
    <g fill="${PALETTE.blood}">
      <circle cx="82" cy="76" r="1.8"/><circle cx="118" cy="76" r="1.8"/>
      <circle cx="100" cy="66" r="1.5"/><circle cx="70" cy="96" r="1.2"/>
      <circle cx="130" cy="96" r="1.2"/><circle cx="88" cy="112" r="1.3"/>
      <circle cx="112" cy="112" r="1.3"/>
    </g>
    <!-- the mouth: a seam, sewn shut -->
    <path d="M86 138 Q100 142 114 138" stroke="#4a2a26" stroke-width="1.8" fill="none"/>
    <g stroke="#8e1b18" stroke-width="1.6">
      <path d="M90 134 L92 142"/><path d="M96 135 L97 143"/><path d="M103 135 L102 143"/><path d="M109 134 L108 142"/>
    </g>
    <!-- crown of hands -->
    <g fill="#16161e" opacity="0.95">
      <path d="M78 30 q-6 -18 4 -22 q2 10 6 4 q2 8 6 18z"/>
      <path d="M100 26 q-4 -20 4 -24 q4 10 8 6 q0 10 2 18z"/>
      <path d="M122 30 q6 -18 -4 -22 q-2 10 -6 4 q-2 8 -6 18z"/>
    </g>
    <path d="M60 60 Q46 96 62 140" stroke="url(#rim${k})" stroke-width="4" fill="none" opacity="0.9"/>
    <path d="M140 60 Q154 96 138 140" stroke="${PALETTE.blood}" stroke-width="2" fill="none" opacity="0.35"/>`;
  }

  const ART = {
    widow:       { draw: widow,       label: 'The Widow, veiled in mourning lace' },
    gravedigger: { draw: gravedigger, label: 'The Gravedigger, hooded and lantern-lit' },
    confessor:   { draw: confessor,   label: 'The Confessor, blinded by a white bandage' },
    bride:       { draw: bride,       label: 'The Hollow Bride, porcelain face and veil' },
    croupier:    { draw: croupier,    label: 'The Pale Croupier, faceless beneath a top hat' },
    mourner:     { draw: mourner,     label: 'The Mourner, hooded with a black-bordered card' },
    veiled:      { draw: veiled,      label: 'The Veiled Dealer, masked and gold-filigreed' },
    charnel:     { draw: charnel,     label: 'The Charnel Warden, iron half-mask and butcher\u2019s apron' },
    twins:       { draw: twins,       label: 'The Twins, two heads on one body' },
    candle:      { draw: candleEater, label: 'The Candle-Eater, a flame burning in its throat' },
    choir:       { draw: choir,       label: 'The Hollow Choir, three mouths singing' },
    surgeon:     { draw: surgeon,     label: 'The Bone Surgeon, brass goggles and a saw' },
    head:        { draw: head,        label: 'The Thing at the Head of the Table, crowned in hands' }
  };

  function portrait(id) {
    const entry = ART[id] || ART.widow;
    const k = 'p' + (uid++);
    return frame(k, entry.label, entry.draw(k));
  }

  /* A tiny sigil for rail badges and list rows. */
  function sigil(id) {
    const map = { widow: '♠', gravedigger: '†', confessor: '✝', bride: '✿',
                  croupier: '♣', mourner: '♦', veiled: '♥',
                  charnel: '⚒', twins: '⚭', candle: '✧', choir: '♪', surgeon: '✂', head: '♛' };
    return map[id] || '♠';
  }

  global.Art = { portrait, sigil, ids: Object.keys(ART) };
})(window);
