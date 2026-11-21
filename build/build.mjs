#!/usr/bin/env node
/**
 * Moshly design tokens — build.
 *
 * Source of truth: tokens/neo-brut/*.tokens.json (W3C Design Tokens / DTCG format)
 *   core.tokens.json        values shared by both modes
 *   mode.dark.tokens.json   dark mode (default)
 *   mode.light.tokens.json  light mode
 *
 * Generates (commit the output; consumers don't need to build):
 *   dist/neo-brut.css                                   CSS custom properties (web, any framework)
 *   ios/Sources/MoshlyNeoBrut/NeoBrutTokens.generated.swift   Swift values (iOS / SwiftUI)
 *
 * Usage: npm run build            write outputs
 *        npm run check            fail if outputs are stale (CI)
 *
 * No dependencies — plain Node ≥ 18.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'tokens/neo-brut');
const CHECK = process.argv.includes('--check');

const read = (f) => JSON.parse(readFileSync(join(SRC, f), 'utf8'));

// ── Parse a DTCG tree into { 'nb.color.lime': { type, value, description } } ──
function flatten(node, path = [], inheritedType, out = {}) {
  const type = node.$type ?? inheritedType;
  if (Object.prototype.hasOwnProperty.call(node, '$value')) {
    if (!type) throw new Error(`Token ${path.join('.')} has no $type`);
    out[path.join('.')] = { type, value: node.$value, description: node.$description };
    return out;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    flatten(child, [...path, key], type, out);
  }
  return out;
}

const core = flatten(read('core.tokens.json'));
const modes = {
  dark: flatten(read('mode.dark.tokens.json')),
  light: flatten(read('mode.light.tokens.json')),
};

// ── Validate: modes must define the same tokens, and never redefine core ones ──
const darkKeys = Object.keys(modes.dark).sort();
const lightKeys = Object.keys(modes.light).sort();
const missing = [
  ...darkKeys.filter((k) => !modes.light[k]).map((k) => `light is missing ${k}`),
  ...lightKeys.filter((k) => !modes.dark[k]).map((k) => `dark is missing ${k}`),
  ...darkKeys.filter((k) => core[k]).map((k) => `${k} is defined in core and in a mode`),
];
if (missing.length) throw new Error('Token sets out of sync:\n  ' + missing.join('\n  '));

// ── Resolve {alias.references} for one mode ──
function resolver(tokens) {
  const resolve = (v, seen = []) => {
    if (typeof v === 'string') {
      const m = v.match(/^\{([^}]+)\}$/);
      if (!m) return v;
      const ref = m[1];
      if (seen.includes(ref)) throw new Error(`Alias cycle: ${[...seen, ref].join(' → ')}`);
      if (!tokens[ref]) throw new Error(`Unknown alias {${ref}}`);
      return resolve(tokens[ref].value, [...seen, ref]);
    }
    if (Array.isArray(v)) return v.map((x) => resolve(x, seen));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x, seen)]));
    return v;
  };
  return resolve;
}

const resolved = {};
for (const [mode, set] of Object.entries(modes)) {
  const all = { ...core, ...set };
  const resolve = resolver(all);
  resolved[mode] = Object.fromEntries(Object.entries(all).map(([k, t]) => [k, { ...t, value: resolve(t.value) }]));
}

// ── Value helpers ──
const dim = (d) => (typeof d === 'string' ? parseFloat(d) : d.value);
const dimCss = (d) => (typeof d === 'string' ? d : `${d.value}${d.unit}`);
function hexParts(hex) {
  const h = hex.replace('#', '');
  if (!/^([0-9a-f]{6}|[0-9a-f]{8})$/i.test(h)) throw new Error(`Bad colour ${hex}`);
  return { rgb: h.slice(0, 6).toUpperCase(), alpha: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
}

// ── CSS ──
// Naming: nb.color.<name> → --nb-<name>; everything else → --nb-<group>-<name>.
const cssName = (path) => {
  const parts = path.split('.').slice(1); // drop "nb"
  return '--nb-' + (parts[0] === 'color' ? parts.slice(1) : parts).join('-');
};
function cssValue({ type, value }) {
  switch (type) {
    case 'color': return value.toUpperCase();
    case 'dimension': return dimCss(value);
    case 'fontFamily': return value.map((f) => (/[\s]/.test(f) ? `"${f}"` : f)).join(', ');
    case 'fontWeight':
    case 'number': return String(value);
    case 'shadow': return [value.offsetX, value.offsetY, value.blur, value.spread].map(dimCss).join(' ') + ' ' + value.color.toUpperCase();
    default: throw new Error(`No CSS output for type ${type}`);
  }
}
const cssBlock = (tokens) => Object.entries(tokens)
  .map(([k, t]) => `  ${cssName(k)}: ${cssValue(t)};${t.description ? ` /* ${t.description} */` : ''}`)
  .join('\n');

const pick = (mode, keys) => Object.fromEntries(keys.map((k) => [k, resolved[mode][k]]));
const coreKeys = Object.keys(core);
const modeKeys = Object.keys(modes.dark); // source order

const css = `/* ============================================================
   MOSHLY NEO BRUT — design tokens (CSS custom properties)
   GENERATED by build/build.mjs from tokens/neo-brut/*.tokens.json.
   Do not edit — change the JSON and run \`npm run build\`.

   Apply on <html>:
     class="skin-brutal"              → dark (default)
     class="skin-brutal theme-light"  → light
   ============================================================ */

.skin-brutal {
  color-scheme: dark;
  /* ── Shared ── */
${cssBlock(pick('dark', coreKeys))}
  /* ── Dark mode ── */
${cssBlock(pick('dark', modeKeys))}
}

.skin-brutal.theme-light {
  color-scheme: light;
${cssBlock(pick('light', modeKeys))}
}
`;

// ── Swift ──
const camel = (s) => s.replace(/^(\d)(\w+)/, (_, d, rest) => rest + d) // "2xl" → "xl2"
  .replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const swiftDoc = (t, indent) => (t.description ? `${indent}/// ${t.description}\n` : '');
const swiftNum = (n) => (Number.isInteger(n) ? `${n}` : `${n}`);
function swiftValue({ type, value }) {
  switch (type) {
    case 'color': { const { rgb, alpha } = hexParts(value); return `NBColor(hex: 0x${rgb}, alpha: ${+alpha.toFixed(3)})`; }
    case 'dimension': return swiftNum(dim(value));
    case 'fontFamily': return `[${value.map((f) => JSON.stringify(f)).join(', ')}]`;
    case 'fontWeight': return `${value}`;
    case 'number': return swiftNum(value);
    case 'shadow': return `NBShadow(color: ${swiftValue({ type: 'color', value: value.color })}, x: ${dim(value.offsetX)}, y: ${dim(value.offsetY)}, blur: ${dim(value.blur)}, spread: ${dim(value.spread)})`;
    default: throw new Error(`No Swift output for type ${type}`);
  }
}
const swiftType = (type) => ({ color: 'NBColor', dimension: 'Double', fontFamily: '[String]', fontWeight: 'Int', number: 'Double', shadow: 'NBShadow' })[type];

// Core tokens → nested enums: NeoBrut.Color.lime, NeoBrut.Space.md, NeoBrut.Font.Size.label …
function swiftCoreTree() {
  const tree = {};
  for (const k of coreKeys) {
    const parts = k.split('.').slice(1);
    let node = tree;
    for (const p of parts.slice(0, -1)) node = node[p] ??= {};
    node[parts.at(-1)] = { __token: resolved.dark[k] };
  }
  const render = (node, indent) => Object.entries(node).map(([key, child]) => {
    if (child.__token) {
      const t = child.__token;
      return `${swiftDoc(t, indent)}${indent}public static let ${camel(key)}: ${swiftType(t.type)} = ${swiftValue(t)}`;
    }
    // Avoid shadowing SwiftUI.Color / SwiftUI.Font inside the NeoBrut namespace.
    const renamed = { color: 'palette', font: 'typography' }[key] ?? key;
    const name = camel(renamed).replace(/^./, (c) => c.toUpperCase());
    return `${indent}public enum ${name} {\n${render(child, indent + '    ')}\n${indent}}`;
  }).join('\n');
  return render(tree, '    ');
}
// Mode tokens → one struct, two instances: NeoBrut.dark / NeoBrut.light
const modeField = (k) => {
  const parts = k.split('.').slice(1);
  return camel((parts[0] === 'color' ? parts.slice(1) : parts).join('-'));
};
const modeFields = modeKeys.map((k) => `${swiftDoc(resolved.dark[k], '    ')}    public let ${modeField(k)}: ${swiftType(resolved.dark[k].type)}`).join('\n');
const modeInstance = (mode) => `NeoBrutMode(\n${modeKeys.map((k) => `        ${modeField(k)}: ${swiftValue(resolved[mode][k])}`).join(',\n')}\n    )`;

const swift = `// GENERATED by build/build.mjs from tokens/neo-brut/*.tokens.json — do not edit.
// Change the JSON and run \`npm run build\`.

import Foundation

/// An sRGB colour, platform-neutral. SwiftUI: \`.color\` (see NeoBrut+SwiftUI.swift).
public struct NBColor: Equatable, Sendable {
    public let red: Double, green: Double, blue: Double, alpha: Double
    public init(hex: UInt32, alpha: Double = 1) {
        red = Double((hex >> 16) & 0xFF) / 255
        green = Double((hex >> 8) & 0xFF) / 255
        blue = Double(hex & 0xFF) / 255
        self.alpha = alpha
    }
}

/// A shadow in CSS terms (x, y, blur, spread in points).
public struct NBShadow: Equatable, Sendable {
    public let color: NBColor
    public let x: Double, y: Double, blur: Double, spread: Double
}

/// Everything that changes between dark and light mode.
public struct NeoBrutMode: Equatable, Sendable {
${modeFields}
}

/// Moshly Neo Brut tokens. Shared values are static; per-mode values are \`NeoBrut.dark\` / \`NeoBrut.light\`.
public enum NeoBrut {
${swiftCoreTree()}

    /// Dark mode (default): flat colour blocks, no offset shadows.
    public static let dark = ${modeInstance('dark')}

    /// Light mode: cream paper, black ink borders, hard offset shadows.
    public static let light = ${modeInstance('light')}
}
`;

// ── Write / check ──
const outputs = {
  'dist/neo-brut.css': css,
  'ios/Sources/MoshlyNeoBrut/NeoBrutTokens.generated.swift': swift,
};
let stale = [];
for (const [rel, content] of Object.entries(outputs)) {
  const file = join(ROOT, rel);
  let current = null;
  try { current = readFileSync(file, 'utf8'); } catch {}
  if (CHECK) {
    if (current !== content) stale.push(rel);
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    console.log(`wrote ${rel}`);
  }
}
if (CHECK) {
  if (stale.length) {
    console.error(`Generated files are out of date — run \`npm run build\`:\n  ${stale.join('\n  ')}`);
    process.exit(1);
  }
  console.log('Generated files are up to date.');
}
