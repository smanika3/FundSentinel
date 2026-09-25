'use client';
/* Generated from design/_ds_bundle.js by web/scripts_convert_ds.py. Do not edit by hand. */
/* eslint-disable */
import * as React from 'react';



const __ds_ns = {};

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Lucide icons (lucide-static@0.460.0, ISC licence), copied verbatim. 16px, stroke 1.5.
const ICON_PATHS = {
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'circle-alert': '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  'minus': '<path d="M5 12h14"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  'file-spreadsheet': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>',
  'play': '<polygon points="6 3 20 12 6 21 6 3"/>',
  'loader-circle': '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
  'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'circle-check': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  'triangle-alert': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'cloud': '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  'git-compare': '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/>',
  'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  'list-checks': '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  'database': '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  'panel-left': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
  'refresh-cw': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  'external-link': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  'filter': '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  'circle-x': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  'circle-minus': '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>',
  'circle': '<circle cx="12" cy="12" r="10"/>',
  'history': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'crosshair': '<circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/>',
  'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  'moon': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  'corner-down-right': '<polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>',
  'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  'calculator': '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
  'eye': '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  'ban': '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  'log-in': '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/>',
  'settings-2': '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  'layers': '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  'copy': '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  'hash': '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
  'file-search': '<path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M4.268 21a2 2 0 0 0 1.727 1H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"/><path d="m9 18-1.5-1.5"/><circle cx="5" cy="14" r="3"/>',
  'undo-2': '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>'
};
function Icon({
  name,
  size = 16,
  strokeWidth = 1.5,
  className,
  style,
  title,
  ...rest
}) {
  const body = ICON_PATHS[name];
  if (!body) return null;
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": title ? undefined : true,
    role: title ? 'img' : undefined,
    "aria-label": title,
    className: className,
    style: {
      flexShrink: 0,
      display: 'block',
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: body
    }
  }, rest));
}
Object.assign(__ds_scope, { ICON_PATHS, Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    h: 30,
    px: 10,
    fs: 13
  },
  md: {
    h: 36,
    px: 14,
    fs: 14
  },
  lg: {
    h: 40,
    px: 18,
    fs: 15
  }
};
function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  children,
  style,
  type = 'button',
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = {
    primary: {
      background: 'var(--btn-primary-bg)',
      color: 'var(--btn-primary-fg)',
      border: '1px solid var(--btn-primary-bg)'
    },
    secondary: {
      background: 'var(--btn-secondary-bg)',
      color: 'var(--btn-secondary-fg)',
      border: '1px solid var(--btn-secondary-border)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text)',
      border: '1px solid transparent'
    },
    link: {
      background: 'transparent',
      color: 'var(--text-2)',
      border: '1px solid transparent',
      textDecoration: 'underline',
      textUnderlineOffset: 3,
      textDecorationColor: 'var(--border-strong)'
    }
  }[variant];
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled || loading,
    className: variant === 'link' ? undefined : 'fs-btn-' + variant,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: variant === 'link' ? 'auto' : s.h,
      padding: variant === 'link' ? 0 : '0 ' + s.px + 'px',
      borderRadius: 'var(--radius-md)',
      font: '500 ' + s.fs + 'px/1 var(--font-sans)',
      whiteSpace: 'nowrap',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'background var(--dur-fast) var(--ease-standard)',
      ...v,
      ...style
    }
  }, rest), loading ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "loader-circle",
    className: "fs-spin"
  }) : icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon
  }) : null, children, iconRight ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Disclosure.jsx
try { (() => {
function Disclosure({
  label = 'Show details',
  openLabel,
  defaultOpen = false,
  open: openProp,
  onToggle,
  children,
  style
}) {
  const [inner, setInner] = React.useState(defaultOpen);
  const open = openProp ?? inner;
  const toggle = () => {
    setInner(!open);
    onToggle && onToggle(!open);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: toggle,
    "aria-expanded": open,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 0',
      background: 'none',
      border: 0,
      color: 'var(--text-2)',
      font: '500 var(--text-small)/1.2 var(--font-sans)',
      cursor: 'pointer',
      borderRadius: 4
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 14,
    style: {
      transform: open ? 'rotate(90deg)' : 'none',
      transition: 'transform var(--dur-fast) var(--ease-standard)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      textDecoration: 'underline',
      textDecorationColor: 'var(--border-strong)',
      textUnderlineOffset: 3
    }
  }, open ? openLabel || label.replace(/^Show/, 'Hide') : label)), open ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, children) : null);
}
Object.assign(__ds_scope, { Disclosure });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Disclosure.jsx", error: String((e && e.message) || e) }); }

// components/core/KindBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const LABELS = {
  ai: 'AI',
  rule: 'Rule',
  safety: 'Safety rule'
};
function KindBadge({
  kind = 'ai',
  label,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    title: kind === 'ai' ? "An AI agent's judgement" : kind === 'safety' ? 'Fixed code that overruled the AI' : 'A fixed rule in code',
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      height: 18,
      padding: '0 6px',
      flexShrink: 0,
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--text-2)',
      font: 'var(--type-badge)',
      letterSpacing: 'var(--tracking-caps)',
      textTransform: 'uppercase',
      background: kind === 'safety' ? 'var(--bg-subtle)' : 'transparent',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), label || LABELS[kind]);
}
Object.assign(__ds_scope, { KindBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/KindBadge.jsx", error: String((e && e.message) || e) }); }

// components/core/Mono.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Mono({
  chip = false,
  strong = true,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: strong ? 600 : 400,
      fontSize: '0.9em',
      letterSpacing: 0,
      ...(chip ? {
        background: 'var(--bg-code)',
        padding: '2px 6px',
        borderRadius: 'var(--radius-sm)',
        fontWeight: 400
      } : null),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Mono });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Mono.jsx", error: String((e && e.message) || e) }); }

// components/core/Skeleton.jsx
try { (() => {
function Skeleton({
  width = '100%',
  height = 12,
  radius,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "fs-skeleton",
    "aria-hidden": "true",
    style: {
      display: 'block',
      width,
      height,
      borderRadius: radius,
      ...style
    }
  });
}
function SkeletonRows({
  rows = 4,
  columns = [96, 150, 220, 1]
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-label": "Loading",
    style: {
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-surface)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 36,
      background: 'var(--bg-subtle)',
      borderBottom: '1px solid var(--border)'
    }
  }), Array.from({
    length: rows
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      height: 'var(--row-h)',
      padding: '0 16px',
      borderBottom: i < rows - 1 ? '1px solid var(--border)' : 0
    }
  }, columns.map((w, j) => /*#__PURE__*/React.createElement(Skeleton, {
    key: j,
    width: w === 1 ? undefined : w,
    height: 10,
    style: w === 1 ? {
      flex: 1
    } : null
  })))));
}
Object.assign(__ds_scope, { Skeleton, SkeletonRows });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/data/CoverageBar.jsx
try { (() => {
function CoverageBar({
  value,
  width = 72
}) {
  const v = Math.max(0, Math.min(100, value));
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8
    },
    "aria-label": v + '% of funds have a value'
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width,
      height: 6,
      background: 'var(--chart-track)',
      borderRadius: 2,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      height: '100%',
      width: v + '%',
      background: 'var(--chart-bar)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-small)',
      color: 'var(--text-2)',
      fontVariantNumeric: 'tabular-nums',
      minWidth: 34
    }
  }, v, "%"));
}
Object.assign(__ds_scope, { CoverageBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/CoverageBar.jsx", error: String((e && e.message) || e) }); }

// components/data/DataTable.jsx
try { (() => {
function DataTable({
  columns,
  rows,
  rowKey = 'id',
  onRowClick,
  selectedKey,
  focusKey,
  dense = false,
  emptyText = 'Nothing to show.',
  footer,
  style
}) {
  const h = dense ? 'var(--row-h-compact)' : 'var(--row-h)';
  const cell = c => ({
    padding: '0 16px',
    textAlign: c.align || 'left',
    width: c.width,
    whiteSpace: c.nowrap ? 'nowrap' : undefined,
    verticalAlign: 'middle'
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
      ...style
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontVariantNumeric: 'tabular-nums'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: 'var(--bg-subtle)',
      height: 36
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    scope: "col",
    style: {
      ...cell(c),
      font: '500 var(--text-small)/1.2 var(--font-sans)',
      color: 'var(--text-2)',
      borderBottom: '1px solid var(--border)'
    }
  }, c.label)))), /*#__PURE__*/React.createElement("tbody", null, rows.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: columns.length,
    style: {
      padding: 24,
      color: 'var(--text-2)'
    }
  }, emptyText)) : rows.map((r, i) => {
    const k = r[rowKey] ?? i;
    const click = onRowClick ? () => onRowClick(r) : undefined;
    return /*#__PURE__*/React.createElement("tr", {
      key: k,
      className: click ? 'fs-row' : undefined,
      tabIndex: click ? 0 : undefined,
      "aria-selected": selectedKey === k ? 'true' : undefined,
      "data-focus": focusKey === k ? 'true' : undefined,
      onClick: click,
      onKeyDown: click ? e => {
        if (e.key === 'Enter') click();
      } : undefined,
      style: {
        height: h,
        borderTop: i ? '1px solid var(--border)' : 0,
        outline: focusKey === k ? '2px solid var(--focus-ring)' : undefined,
        outlineOffset: -2
      }
    }, columns.map(c => /*#__PURE__*/React.createElement("td", {
      key: c.key,
      style: {
        ...cell(c),
        paddingTop: 10,
        paddingBottom: 10,
        font: c.small ? 'var(--type-small)' : 'var(--type-body)',
        color: c.muted ? 'var(--text-2)' : 'var(--text)'
      }
    }, c.render ? c.render(r) : r[c.key])));
  }))), footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border)',
      padding: '10px 16px',
      font: 'var(--type-small)',
      color: 'var(--text-2)'
    }
  }, footer) : null);
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/data/EvidenceTable.jsx
try { (() => {
function NumberLink({
  id,
  hlKey,
  value,
  active = false,
  hovered = false,
  onOpen,
  onHover
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "fs-link-num",
    "data-active": active ? 'true' : undefined,
    "data-hl": hovered ? 'true' : undefined,
    onClick: onOpen ? () => onOpen(id) : undefined,
    onMouseEnter: onHover ? () => onHover(hlKey) : undefined,
    onMouseLeave: onHover ? () => onHover(null) : undefined,
    onFocus: onHover ? () => onHover(hlKey) : undefined,
    onBlur: onHover ? () => onHover(null) : undefined,
    style: {
      background: 'transparent',
      border: 0,
      padding: '1px 3px',
      margin: '0 -3px',
      font: 'inherit',
      fontWeight: 600,
      color: 'var(--text)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, value);
}
function EvidenceTable({
  rows,
  activeId,
  hoverKey,
  onOpen,
  onHover
}) {
  const th = {
    textAlign: 'left',
    padding: '8px 12px',
    font: '500 12px/1.2 var(--font-sans)',
    color: 'var(--text-2)',
    background: 'var(--bg-subtle)',
    borderBottom: '1px solid var(--border)'
  };
  const td = {
    padding: '9px 12px',
    font: 'var(--type-small)',
    verticalAlign: 'top',
    borderTop: '1px solid var(--border)'
  };
  return /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--bg-surface)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: th
  }, "What"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Value"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Where it came from"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Rule checked"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      width: 110
    }
  }, "Evidence"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: r.id || i,
    style: {
      background: r.stale ? 'var(--bg-subtle)' : undefined
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      borderTop: i ? td.borderTop : 0
    }
  }, r.what), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      borderTop: i ? td.borderTop : 0,
      whiteSpace: 'nowrap',
      textDecoration: r.stale ? 'line-through' : undefined
    }
  }, r.stale ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-2)'
    }
  }, r.value) : /*#__PURE__*/React.createElement(NumberLink, {
    id: r.id,
    hlKey: r.hlKey || r.id,
    value: r.value,
    active: activeId === r.id,
    hovered: hoverKey != null && hoverKey === (r.hlKey || r.id),
    onOpen: onOpen,
    onHover: onHover
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      borderTop: i ? td.borderTop : 0,
      color: 'var(--text-2)'
    }
  }, r.source), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      borderTop: i ? td.borderTop : 0,
      color: 'var(--text-2)'
    }
  }, r.rule || '—'), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      borderTop: i ? td.borderTop : 0
    }
  }, r.stale ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-2)'
    }
  }, "Out of date") : r.verified === false ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      gap: 5,
      color: 'var(--status-person-fg)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "circle-alert",
    size: 14,
    strokeWidth: 2
  }), "Not verified") : /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      gap: 5,
      color: 'var(--status-good-fg)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 14,
    strokeWidth: 2
  }), "Verified"))))));
}
Object.assign(__ds_scope, { NumberLink, EvidenceTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/EvidenceTable.jsx", error: String((e && e.message) || e) }); }

// components/data/HBarChart.jsx
try { (() => {
function HBarChart({
  data,
  max,
  reading,
  valueLabel,
  style
}) {
  const m = max || Math.max(1, ...data.map(d => d.value));
  return /*#__PURE__*/React.createElement("figure", {
    style: {
      margin: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'max-content minmax(0,1fr) max-content',
      columnGap: 14,
      rowGap: 10,
      alignItems: 'center'
    }
  }, data.map(d => /*#__PURE__*/React.createElement(React.Fragment, {
    key: d.label
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-small)',
      color: 'var(--text)'
    }
  }, d.label), /*#__PURE__*/React.createElement("span", {
    style: {
      height: 10,
      background: 'var(--chart-track)',
      borderRadius: 2,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      height: '100%',
      width: d.value / m * 100 + '%',
      background: 'var(--chart-bar)',
      borderRadius: 2
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-small)',
      color: 'var(--text-2)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, valueLabel ? valueLabel(d) : d.value)))), reading ? /*#__PURE__*/React.createElement("figcaption", {
    style: {
      marginTop: 12,
      color: 'var(--text-2)',
      font: 'var(--type-small)'
    }
  }, reading) : null);
}
Object.assign(__ds_scope, { HBarChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/HBarChart.jsx", error: String((e && e.message) || e) }); }

// components/data/SourceRecord.jsx
try { (() => {
function SourceRecord({
  rowLabel,
  file,
  cells,
  activeColumn
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--bg-surface)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '8px 12px',
      background: 'var(--bg-subtle)',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 var(--text-small)/1.2 var(--font-sans)'
    }
  }, rowLabel), file ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 12px/1.2 var(--font-mono)',
      color: 'var(--text-2)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, file) : null), /*#__PURE__*/React.createElement("dl", {
    style: {
      margin: 0
    }
  }, cells.map((c, i) => {
    const on = c.column === activeColumn;
    return /*#__PURE__*/React.createElement("div", {
      key: c.column,
      style: {
        display: 'grid',
        gridTemplateColumns: '44% 56%',
        borderTop: i ? '1px solid var(--border)' : 0,
        background: on ? 'var(--bg-highlight)' : undefined,
        boxShadow: on ? 'inset 3px 0 0 var(--status-person-border)' : undefined
      }
    }, /*#__PURE__*/React.createElement("dt", {
      style: {
        padding: '7px 12px',
        font: '400 12px/1.4 var(--font-mono)',
        color: 'var(--text-2)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, c.column), /*#__PURE__*/React.createElement("dd", {
      style: {
        margin: 0,
        padding: '7px 12px',
        font: (on ? 600 : 400) + ' var(--text-small)/1.4 var(--font-sans)',
        fontVariantNumeric: 'tabular-nums',
        color: c.value === '' || c.value == null ? 'var(--text-3)' : 'var(--text)'
      }
    }, c.value === '' || c.value == null ? 'empty' : c.value));
  })));
}
function FactList({
  facts
}) {
  return /*#__PURE__*/React.createElement("dl", {
    style: {
      margin: 0,
      display: 'grid',
      gridTemplateColumns: 'max-content minmax(0,1fr)',
      columnGap: 20,
      rowGap: 10
    }
  }, facts.map(f => /*#__PURE__*/React.createElement(React.Fragment, {
    key: f.label
  }, /*#__PURE__*/React.createElement("dt", {
    style: {
      font: 'var(--type-small)',
      color: 'var(--text-2)',
      paddingTop: 1
    }
  }, f.label), /*#__PURE__*/React.createElement("dd", {
    style: {
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      textWrap: 'pretty'
    }
  }, f.value))));
}
Object.assign(__ds_scope, { SourceRecord, FactList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/SourceRecord.jsx", error: String((e && e.message) || e) }); }

// components/data/TimelineStep.jsx
try { (() => {
const VARIANTS = {
  default: null,
  sendback: {
    icon: 'undo-2',
    fg: 'var(--status-person-fg)',
    bg: 'var(--status-person-bg)',
    label: 'Sent back'
  },
  guardrail: {
    icon: 'shield-check',
    fg: 'var(--text-2)',
    bg: 'var(--bg-subtle)',
    label: 'Safety rule'
  },
  radar: {
    icon: 'history',
    fg: 'var(--text-2)',
    bg: 'var(--bg-subtle)',
    label: 'Update'
  },
  final: {
    icon: 'check',
    fg: 'var(--text)',
    bg: 'var(--bg-subtle)',
    label: 'Final decision'
  }
};
function TimelineStep({
  n,
  actor,
  kind = 'ai',
  variant = 'default',
  time,
  last = false,
  children,
  parallel
}) {
  const v = VARIANTS[variant];
  return /*#__PURE__*/React.createElement("li", {
    style: {
      display: 'grid',
      gridTemplateColumns: '28px minmax(0,1fr)',
      gap: 14,
      listStyle: 'none',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: '50%',
      border: '1px solid ' + (variant === 'sendback' ? 'var(--status-person-border)' : 'var(--border-strong)'),
      background: v ? v.bg : 'var(--bg-surface)',
      color: v ? v.fg : 'var(--text-2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '600 12px/1 var(--font-sans)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, v && variant !== 'default' ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: v.icon,
    size: 13,
    strokeWidth: 2
  }) : n), !last ? /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      width: 1,
      background: 'var(--border)',
      marginTop: 4,
      minHeight: 12
    }
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingBottom: last ? 0 : 18,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      minHeight: 26
    }
  }, v && variant !== 'default' ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 var(--text-small)/1 var(--font-sans)',
      color: v.fg
    }
  }, v.label, n != null ? ' · ' + n : '') : null, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 var(--text-body)/1.3 var(--font-sans)'
    }
  }, actor), /*#__PURE__*/React.createElement(__ds_scope.KindBadge, {
    kind: kind
  }), time ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      font: 'var(--type-small)',
      color: 'var(--text-3)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, time) : null), children ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3,
      color: 'var(--text-2)',
      textWrap: 'pretty'
    }
  }, children) : null, parallel ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px',
      background: 'var(--bg-surface)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '500 12px/1 var(--font-sans)',
      color: 'var(--text-3)',
      marginBottom: 8
    }
  }, "At the same time"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 8
    }
  }, parallel.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 var(--text-small)/1.3 var(--font-sans)'
    }
  }, p.actor), /*#__PURE__*/React.createElement(__ds_scope.KindBadge, {
    kind: p.kind || 'ai'
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-small)',
      color: 'var(--text-2)'
    }
  }, p.text))))) : null));
}
function Timeline({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("ol", {
    style: {
      margin: 0,
      padding: 0,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { TimelineStep, Timeline });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/TimelineStep.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function EmptyState({
  icon = 'file-spreadsheet',
  title,
  children,
  action,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      justifyItems: 'start',
      gap: 10,
      padding: '32px 28px',
      border: '1px dashed var(--border-strong)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-surface)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-2)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-section-title)'
    }
  }, title), children ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-2)',
      maxWidth: 520,
      textWrap: 'pretty'
    }
  }, children) : null, action ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, action) : null);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/RunSteps.jsx
try { (() => {
const STATES = {
  done: {
    icon: 'circle-check',
    color: 'var(--status-good-fg)',
    label: 'Done'
  },
  running: {
    icon: 'loader-circle',
    color: 'var(--text)',
    spin: true,
    label: 'In progress'
  },
  warning: {
    icon: 'circle-alert',
    color: 'var(--status-person-fg)',
    label: 'Done with warnings'
  },
  error: {
    icon: 'circle-x',
    color: 'var(--status-stop-fg)',
    label: 'Failed'
  },
  pending: {
    icon: 'circle',
    color: 'var(--border-strong)',
    label: 'Waiting'
  }
};
function RunSteps({
  steps
}) {
  return /*#__PURE__*/React.createElement("ol", {
    style: {
      margin: 0,
      padding: 0,
      listStyle: 'none',
      display: 'grid'
    }
  }, steps.map((s, i) => {
    const st = STATES[s.state] || STATES.pending;
    return /*#__PURE__*/React.createElement("li", {
      key: s.label,
      style: {
        display: 'grid',
        gridTemplateColumns: '20px minmax(0,1fr) auto',
        gap: 12,
        alignItems: 'start',
        padding: '10px 0',
        borderTop: i ? '1px solid var(--border)' : 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: st.color,
        paddingTop: 2
      },
      title: st.label
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: st.icon,
      className: st.spin ? 'fs-spin' : undefined,
      strokeWidth: s.state === 'pending' ? 1.5 : 2
    })), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        font: (s.state === 'running' ? 600 : 500) + ' var(--text-body)/1.4 var(--font-sans)',
        color: s.state === 'pending' ? 'var(--text-3)' : 'var(--text)'
      }
    }, s.label), s.detail ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        marginTop: 2,
        font: 'var(--type-small)',
        color: s.state === 'warning' ? 'var(--status-person-fg)' : 'var(--text-2)'
      }
    }, s.detail) : null), /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--type-small)',
        color: 'var(--text-3)',
        fontVariantNumeric: 'tabular-nums',
        paddingTop: 2
      }
    }, s.time || ''));
  }));
}
Object.assign(__ds_scope, { RunSteps });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/RunSteps.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function Field({
  label,
  hint,
  optional = false,
  htmlFor,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 6,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: {
      font: '500 var(--text-small)/1.3 var(--font-sans)',
      color: 'var(--text)'
    }
  }, label, optional ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-3)',
      fontWeight: 400
    }
  }, " (optional)") : null) : null, children, hint ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-small)',
      color: 'var(--text-2)'
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/RadioGroup.jsx
try { (() => {
function RadioGroup({
  name,
  options,
  value,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "radiogroup",
    style: {
      display: 'grid',
      gap: 8,
      ...style
    }
  }, options.map(o => {
    const on = o.value === value;
    return /*#__PURE__*/React.createElement("label", {
      key: o.value,
      className: "fs-hoverable",
      style: {
        display: 'grid',
        gridTemplateColumns: '18px minmax(0,1fr)',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid ' + (on ? 'var(--text)' : 'var(--border)'),
        background: 'var(--bg-surface)',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: name,
      value: o.value,
      checked: on,
      onChange: () => onChange && onChange(o.value),
      style: {
        position: 'absolute',
        opacity: 0,
        width: 1,
        height: 1
      }
    }), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        width: 16,
        height: 16,
        marginTop: 2,
        borderRadius: '50%',
        border: '1.5px solid ' + (on ? 'var(--text)' : 'var(--border-strong)'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, on ? /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: 'var(--text)'
      }
    }) : null), /*#__PURE__*/React.createElement("span", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        font: '500 var(--text-body)/1.4 var(--font-sans)'
      }
    }, o.label), o.description ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        font: 'var(--type-small)',
        color: 'var(--text-2)',
        marginTop: 2
      }
    }, o.description) : null, on && o.children ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        marginTop: 10
      }
    }, o.children) : null));
  }));
}
Object.assign(__ds_scope, { RadioGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/RadioGroup.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked,
  onChange,
  label,
  description,
  id
}) {
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("button", {
    id: id,
    type: "button",
    role: "switch",
    "aria-checked": checked,
    onClick: () => onChange && onChange(!checked),
    style: {
      flexShrink: 0,
      width: 32,
      height: 18,
      marginTop: 2,
      borderRadius: 999,
      border: 0,
      padding: 2,
      background: checked ? 'var(--text)' : 'var(--border-strong)',
      cursor: 'pointer',
      transition: 'background var(--dur-fast)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      width: 14,
      height: 14,
      borderRadius: '50%',
      background: 'var(--bg-surface)',
      transform: checked ? 'translateX(14px)' : 'none',
      transition: 'transform var(--dur-fast) var(--ease-standard)'
    }
  })), label ? /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: '500 var(--text-body)/1.4 var(--font-sans)'
    }
  }, label), description ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--type-small)',
      color: 'var(--text-2)'
    }
  }, description) : null) : null);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextInput.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const inputBase = {
  width: '100%',
  height: 38,
  padding: '0 12px',
  background: 'var(--bg-surface)',
  color: 'var(--text)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-md)',
  font: 'var(--type-body)',
  outline: 'none'
};
function TextInput({
  icon,
  mono = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'block',
      ...style
    }
  }, icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 11,
      top: 11,
      color: 'var(--text-3)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon
  })) : null, /*#__PURE__*/React.createElement("input", _extends({}, rest, {
    style: {
      ...inputBase,
      paddingLeft: icon ? 34 : 12,
      fontFamily: mono ? 'var(--font-mono)' : undefined,
      fontSize: mono ? 13 : undefined
    }
  })));
}
Object.assign(__ds_scope, { inputBase, TextInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextInput.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  options = [],
  value,
  onChange,
  mono = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'block',
      ...style
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    value: value,
    onChange: onChange ? e => onChange(e.target.value) : undefined
  }, rest, {
    style: {
      ...__ds_scope.inputBase,
      appearance: 'none',
      paddingRight: 34,
      cursor: 'pointer',
      fontFamily: mono ? 'var(--font-mono)' : undefined,
      fontSize: mono ? 13 : undefined
    }
  }), options.map(o => typeof o === 'string' ? /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o) : /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 11,
      top: 11,
      color: 'var(--text-2)',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down"
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavItem.jsx
try { (() => {
function NavItem({
  icon,
  label,
  active = false,
  collapsed = false,
  onClick,
  href
}) {
  const Tag = href ? 'a' : 'button';
  return /*#__PURE__*/React.createElement(Tag, {
    href: href,
    type: href ? undefined : 'button',
    onClick: onClick,
    "aria-current": active ? 'page' : undefined,
    title: collapsed ? label : undefined,
    className: "fs-hoverable",
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      height: 36,
      padding: collapsed ? 0 : '0 12px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      background: active ? 'var(--bg-selected)' : 'transparent',
      color: active ? 'var(--text)' : 'var(--text-2)',
      border: 0,
      borderRadius: 'var(--radius-md)',
      font: (active ? 600 : 500) + ' 14px/1 var(--font-sans)',
      textDecoration: 'none',
      cursor: 'pointer',
      textAlign: 'left'
    }
  }, active ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      left: 0,
      top: 8,
      bottom: 8,
      width: 3,
      borderRadius: 2,
      background: 'var(--nav-active-bar)'
    }
  }) : null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon
  }), collapsed ? null : /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { NavItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavItem.jsx", error: String((e && e.message) || e) }); }

// components/navigation/PageHeader.jsx
try { (() => {
function PageHeader({
  title,
  subtitle,
  eyebrow,
  meta,
  actions,
  style
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 24,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, eyebrow ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10,
      font: 'var(--type-small)',
      color: 'var(--text-2)',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, eyebrow) : null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: 'var(--type-page-title)',
      letterSpacing: 'var(--tracking-title)',
      color: 'var(--text)',
      textWrap: 'balance'
    }
  }, title), subtitle ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      font: 'var(--type-body)',
      color: 'var(--text-2)'
    }
  }, subtitle) : null, meta ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      font: 'var(--type-small)',
      lineHeight: '24px',
      color: 'var(--text-2)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, meta) : null), actions ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexShrink: 0
    }
  }, actions) : null);
}
function SectionTitle({
  children,
  aside,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 16,
      margin: '0 0 12px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: 'var(--type-section-title)',
      color: 'var(--text)'
    }
  }, children), aside ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-small)',
      color: 'var(--text-2)'
    }
  }, aside) : null);
}
Object.assign(__ds_scope, { PageHeader, SectionTitle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/PageHeader.jsx", error: String((e && e.message) || e) }); }

// components/navigation/RunPicker.jsx
try { (() => {
function RunTypeTag({
  type
}) {
  const label = {
    review: 'Review',
    update: 'Update',
    redteam: 'RedTeam test'
  }[type] || type;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      height: 18,
      padding: '0 6px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-strong)',
      font: '500 11px/1 var(--font-sans)',
      color: 'var(--text-2)',
      whiteSpace: 'nowrap'
    }
  }, label);
}
function RunSummary({
  run
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr)',
      gap: 5,
      minWidth: 0,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 12px/1.3 var(--font-mono)',
      color: 'var(--text)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, run.file), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      font: '400 12px/1 var(--font-sans)',
      color: 'var(--text-2)',
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement(RunTypeTag, {
    type: run.type
  }), run.funds, " funds \xB7 ", run.duration));
}
function RunPicker({
  runs = [],
  value,
  onChange,
  collapsed = false
}) {
  const [open, setOpen] = React.useState(false);
  const current = runs.find(r => r.id === value) || runs[0];
  if (!current) return null;
  if (collapsed) {
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      title: current.file,
      className: "fs-hoverable",
      style: {
        width: 40,
        height: 40,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-surface)',
        color: 'var(--text-2)',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "file-spreadsheet"
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '500 11px/1 var(--font-sans)',
      color: 'var(--text-3)',
      letterSpacing: 'var(--tracking-caps)',
      textTransform: 'uppercase',
      margin: '0 2px 8px'
    }
  }, "Run"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-haspopup": "listbox",
    "aria-expanded": open,
    onClick: () => setOpen(!open),
    className: "fs-hoverable",
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 16px',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      padding: '10px 10px 10px 12px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      color: 'var(--text-2)'
    }
  }, /*#__PURE__*/React.createElement(RunSummary, {
    run: current
  }), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down"
  })), open ? /*#__PURE__*/React.createElement("div", {
    role: "listbox",
    style: {
      position: 'absolute',
      zIndex: 30,
      left: 0,
      right: -120,
      top: '100%',
      marginTop: 4,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 4px 12px rgba(20,20,19,.06)',
      padding: 4
    }
  }, runs.map(r => /*#__PURE__*/React.createElement("button", {
    key: r.id,
    role: "option",
    "aria-selected": r.id === current.id,
    type: "button",
    className: "fs-hoverable",
    onClick: () => {
      setOpen(false);
      onChange && onChange(r.id);
    },
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 16px',
      gap: 8,
      alignItems: 'center',
      width: '100%',
      padding: '9px 10px',
      border: 0,
      borderRadius: 'var(--radius-md)',
      background: r.id === current.id ? 'var(--bg-selected)' : 'transparent',
      cursor: 'pointer',
      color: 'var(--text)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(RunSummary, {
    run: r
  }), r.when ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 12px/1 var(--font-sans)',
      color: 'var(--text-3)',
      textAlign: 'left'
    }
  }, r.when) : null), r.id === current.id ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check"
  }) : /*#__PURE__*/React.createElement("span", null)))) : null);
}
Object.assign(__ds_scope, { RunTypeTag, RunPicker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/RunPicker.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Sidebar.jsx
try { (() => {
const NAV = [{
  id: 'run',
  icon: 'play',
  label: 'Run a file'
}, {
  id: 'results',
  icon: 'list-checks',
  label: 'Results'
}, {
  id: 'fund',
  icon: 'file-text',
  label: 'Fund'
}, {
  id: 'data',
  icon: 'database',
  label: 'Data'
}, {
  id: 'policy',
  icon: 'shield-check',
  label: 'Policy'
}];
function Wordmark({
  collapsed = false
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 14,
      height: 14,
      borderRadius: 3,
      background: 'var(--brand)',
      flexShrink: 0
    }
  }), collapsed ? null : /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 18px/1 var(--font-serif)',
      letterSpacing: '-0.01em',
      color: 'var(--text)'
    }
  }, "FundSentinel"));
}
function Sidebar({
  active = 'results',
  onNavigate,
  runs,
  runId,
  onRunChange,
  collapsed = false,
  progress,
  onProgressClick,
  login = 'active',
  env = 'Running on AWS AgentCore · us-east-1',
  style
}) {
  const small = {
    font: '400 12px/1.4 var(--font-sans)',
    color: 'var(--text-2)'
  };
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)',
      flexShrink: 0,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      padding: collapsed ? '20px 12px' : '20px 16px',
      background: 'var(--bg-page)',
      borderRight: '1px solid var(--border)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: collapsed ? '2px 0 0' : '2px 4px 0',
      display: 'flex',
      justifyContent: collapsed ? 'center' : 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    collapsed: collapsed
  })), runs ? /*#__PURE__*/React.createElement(__ds_scope.RunPicker, {
    runs: runs,
    value: runId,
    onChange: onRunChange,
    collapsed: collapsed
  }) : null, /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Main",
    style: {
      display: 'grid',
      gap: 2
    }
  }, NAV.map(n => /*#__PURE__*/React.createElement(__ds_scope.NavItem, {
    key: n.id,
    icon: n.icon,
    label: n.label,
    active: active === n.id,
    collapsed: collapsed,
    onClick: () => onNavigate && onNavigate(n.id)
  }))), progress ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onProgressClick,
    className: "fs-hoverable",
    title: 'Running: ' + progress.done + ' of ' + progress.total + ' funds',
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: collapsed ? 'center' : 'flex-start',
      gap: 8,
      height: 32,
      padding: collapsed ? 0 : '0 12px',
      border: '1px solid var(--border)',
      borderRadius: 999,
      background: 'var(--bg-surface)',
      font: '500 13px/1 var(--font-sans)',
      color: 'var(--text)',
      cursor: 'pointer',
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "loader-circle",
    className: "fs-spin"
  }), collapsed ? null : /*#__PURE__*/React.createElement("span", null, "Running: ", progress.done, " of ", progress.total, " funds")) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      display: 'grid',
      gap: 10
    }
  }, collapsed ? /*#__PURE__*/React.createElement("span", {
    title: login === 'active' ? 'AWS login active' : 'Login expired',
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      margin: '0 auto',
      background: login === 'active' ? 'var(--status-good-fg)' : 'var(--status-stop-fg)'
    }
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...small,
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "cloud",
    size: 14,
    style: {
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("span", null, env)), /*#__PURE__*/React.createElement("div", {
    style: {
      ...small,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 8,
      height: 8,
      margin: '0 3px',
      borderRadius: '50%',
      background: login === 'active' ? 'var(--status-good-fg)' : 'var(--status-stop-fg)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: login === 'active' ? 'var(--text-2)' : 'var(--status-stop-fg)',
      fontWeight: login === 'active' ? 400 : 500
    }
  }, login === 'active' ? 'AWS login active' : 'Login expired')), /*#__PURE__*/React.createElement("div", {
    style: {
      ...small,
      color: 'var(--text-3)',
      borderTop: '1px solid var(--border)',
      paddingTop: 10
    }
  }, "Mock scenario \xB7 internal decision support \xB7 not investment advice"))));
}
Object.assign(__ds_scope, { Wordmark, Sidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Sidebar.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Sheet.jsx
try { (() => {
function Sheet({
  open = true,
  title,
  subtitle,
  onClose,
  contained = false,
  width,
  footer,
  children
}) {
  React.useEffect(() => {
    if (!open || !onClose) return;
    const h = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("aside", {
    role: "dialog",
    "aria-label": typeof title === 'string' ? title : 'Details',
    className: "fs-panel-in",
    style: {
      position: contained ? 'absolute' : 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      zIndex: 40,
      width: width || 'var(--panel-w)',
      maxWidth: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border)',
      boxShadow: '-1px 0 2px rgba(20,20,19,.03)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '18px 20px 16px',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-section-title)',
      color: 'var(--text)'
    }
  }, title), subtitle ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      font: 'var(--type-small)',
      color: 'var(--text-2)'
    }
  }, subtitle) : null), onClose ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    "aria-label": "Close",
    title: "Close (Esc)",
    className: "fs-btn-ghost",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      height: 28,
      padding: '0 8px',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      background: 'transparent',
      color: 'var(--text-2)',
      cursor: 'pointer',
      font: '500 12px/1 var(--font-sans)'
    }
  }, "Esc ", /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 14
  })) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 20,
      display: 'grid',
      alignContent: 'start',
      gap: 20
    }
  }, children), footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border)',
      padding: '12px 20px',
      font: 'var(--type-small)',
      color: 'var(--text-2)'
    }
  }, footer) : null);
}
Object.assign(__ds_scope, { Sheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Sheet.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Tooltip.jsx
try { (() => {
function Tooltip({
  content,
  children,
  side = 'top'
}) {
  const [show, setShow] = React.useState(false);
  const pos = side === 'bottom' ? {
    top: '100%',
    marginTop: 6
  } : {
    bottom: '100%',
    marginBottom: 6
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocus: () => setShow(true),
    onBlur: () => setShow(false)
  }, children, show ? /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      ...pos,
      zIndex: 50,
      maxWidth: 260,
      width: 'max-content',
      background: 'var(--text)',
      color: 'var(--bg-page)',
      font: '400 12px/1.4 var(--font-sans)',
      padding: '6px 9px',
      borderRadius: 'var(--radius-sm)',
      pointerEvents: 'none'
    }
  }, content) : null);
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/status/StatusChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  good: {
    fg: 'var(--status-good-fg)',
    bg: 'var(--status-good-bg)',
    border: 'var(--status-good-border)',
    icon: 'check'
  },
  person: {
    fg: 'var(--status-person-fg)',
    bg: 'var(--status-person-bg)',
    border: 'var(--status-person-border)',
    icon: 'circle-alert'
  },
  stop: {
    fg: 'var(--status-stop-fg)',
    bg: 'var(--status-stop-bg)',
    border: 'var(--status-stop-border)',
    icon: 'x'
  },
  neutral: {
    fg: 'var(--status-neutral-fg)',
    bg: 'var(--status-neutral-bg)',
    border: 'var(--status-neutral-border)',
    icon: 'minus'
  }
};
const SIZES = {
  sm: {
    h: 22,
    px: 8,
    fs: 12,
    icon: 13,
    gap: 4,
    sw: 2
  },
  md: {
    h: 26,
    px: 10,
    fs: 13,
    icon: 14,
    gap: 6,
    sw: 2
  },
  lg: {
    h: 34,
    px: 14,
    fs: 15,
    icon: 16,
    gap: 7,
    sw: 2
  },
  xl: {
    h: 60,
    px: 22,
    fs: 36,
    icon: 28,
    gap: 12,
    sw: 2.25
  }
};
function StatusChip({
  tone = 'neutral',
  label,
  icon,
  variant = 'soft',
  size = 'md',
  suffix,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.neutral;
  const s = SIZES[size] || SIZES.md;
  const outline = variant === 'outline';
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: s.gap,
      height: s.h,
      padding: '0 ' + s.px + 'px',
      borderRadius: 'var(--radius-pill)',
      whiteSpace: 'nowrap',
      flexShrink: 0,
      background: outline ? 'var(--bg-surface)' : t.bg,
      color: t.fg,
      border: '1px solid ' + (outline ? t.border : 'transparent'),
      font: (size === 'xl' ? 600 : 500) + ' ' + s.fs + 'px/1 var(--font-sans)',
      letterSpacing: size === 'xl' ? '-0.01em' : 0,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || t.icon,
    size: s.icon,
    strokeWidth: s.sw
  }), /*#__PURE__*/React.createElement("span", null, label), suffix ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      opacity: 0.9
    }
  }, suffix) : null);
}
Object.assign(__ds_scope, { TONES, StatusChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/status/StatusChip.jsx", error: String((e && e.message) || e) }); }

// components/data/NumberTile.jsx
try { (() => {
function NumberTile({
  label,
  value,
  of,
  sub,
  tone,
  icon,
  onClick,
  active = false,
  style
}) {
  const t = tone ? __ds_scope.TONES[tone] : null;
  const Tag = onClick ? 'button' : 'div';
  return /*#__PURE__*/React.createElement(Tag, {
    type: onClick ? 'button' : undefined,
    onClick: onClick,
    className: onClick ? 'fs-hoverable' : undefined,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 6,
      minWidth: 0,
      textAlign: 'left',
      padding: '16px 18px 18px',
      background: active ? 'var(--bg-selected)' : 'var(--bg-surface)',
      color: 'var(--text)',
      border: '1px solid ' + (active ? 'var(--border-strong)' : 'var(--border)'),
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      cursor: onClick ? 'pointer' : 'default',
      font: 'inherit',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      font: '500 var(--text-small)/1.3 var(--font-sans)',
      color: 'var(--text-2)'
    }
  }, t ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: t.fg
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || t.icon,
    size: 14,
    strokeWidth: 2
  })) : null, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-key)',
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.02em'
    }
  }, value), of != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 var(--text-body)/1 var(--font-sans)',
      color: 'var(--text-2)'
    }
  }, "of ", of) : null), sub ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-small)',
      color: 'var(--text-2)'
    }
  }, sub) : null);
}
function TileRow({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: 'var(--space-3)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { NumberTile, TileRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/NumberTile.jsx", error: String((e && e.message) || e) }); }

// components/status/Callout.jsx
try { (() => {
const KINDS = {
  warning: {
    tone: 'person',
    icon: 'circle-alert'
  },
  setaside: {
    tone: 'neutral',
    icon: 'minus'
  },
  error: {
    tone: 'stop',
    icon: 'circle-x'
  },
  info: {
    tone: 'neutral',
    icon: 'info'
  }
};
function Callout({
  kind = 'warning',
  title,
  items,
  action,
  children,
  style
}) {
  const k = KINDS[kind] || KINDS.warning;
  const t = __ds_scope.TONES[k.tone];
  return /*#__PURE__*/React.createElement("div", {
    role: kind === 'error' ? 'alert' : 'note',
    style: {
      display: 'flex',
      gap: 12,
      padding: '14px 16px',
      background: t.bg,
      color: 'var(--text)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid transparent',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: t.fg,
      paddingTop: 2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: k.icon,
    strokeWidth: 2
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 var(--text-body)/1.4 var(--font-sans)',
      color: t.fg
    }
  }, title) : null, items && items.length ? /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: title ? '6px 0 0' : 0,
      paddingLeft: 18,
      display: 'grid',
      gap: 4
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      textWrap: 'pretty'
    }
  }, it))) : null, children ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: title ? 4 : 0,
      textWrap: 'pretty'
    }
  }, children) : null), action ? /*#__PURE__*/React.createElement("div", {
    style: {
      alignSelf: 'center'
    }
  }, action) : null);
}
Object.assign(__ds_scope, { Callout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/status/Callout.jsx", error: String((e && e.message) || e) }); }

// components/status/OutcomeChip.jsx
try { (() => {
const OUTCOMES = {
  approved: {
    tone: 'good',
    label: 'Approved',
    icon: 'check'
  },
  conditions: {
    tone: 'good',
    label: 'Approved',
    suffix: 'with conditions',
    icon: 'check',
    variant: 'outline'
  },
  rejected: {
    tone: 'stop',
    label: 'Rejected',
    icon: 'x'
  },
  person: {
    tone: 'person',
    label: 'Needs a person',
    icon: 'circle-alert'
  },
  quarantined: {
    tone: 'neutral',
    label: "Couldn't judge",
    icon: 'minus'
  }
};
function OutcomeChip({
  outcome,
  size = 'md',
  style
}) {
  const o = OUTCOMES[outcome] || OUTCOMES.quarantined;
  return /*#__PURE__*/React.createElement(__ds_scope.StatusChip, {
    tone: o.tone,
    label: o.label,
    suffix: o.suffix,
    icon: o.icon,
    variant: o.variant,
    size: size,
    style: style
  });
}
Object.assign(__ds_scope, { OUTCOMES, OutcomeChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/status/OutcomeChip.jsx", error: String((e && e.message) || e) }); }

// components/data/DecisionChange.jsx
try { (() => {
function DecisionChange({
  ticker,
  name,
  from,
  to,
  reason,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: onClick ? 'fs-row' : undefined,
    tabIndex: onClick ? 0 : undefined,
    onClick: onClick,
    onKeyDown: onClick ? e => {
      if (e.key === 'Enter') onClick();
    } : undefined,
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) auto',
      gap: 16,
      alignItems: 'center',
      padding: '14px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Mono, null, ticker), /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, name)), reason ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      font: 'var(--type-small)',
      color: 'var(--text-2)'
    }
  }, reason) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.OutcomeChip, {
    outcome: from,
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-3)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrow-right"
  })), /*#__PURE__*/React.createElement(__ds_scope.OutcomeChip, {
    outcome: to,
    size: "md"
  })));
}
Object.assign(__ds_scope, { DecisionChange });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DecisionChange.jsx", error: String((e && e.message) || e) }); }

// components/feedback/FundProgressLine.jsx
try { (() => {
function FundProgressLine({
  ticker,
  name,
  outcome,
  time,
  sendbacks = 0,
  rerun = false,
  fresh = false,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: (onClick ? 'fs-row ' : '') + (fresh ? 'fs-row-in' : ''),
    tabIndex: onClick ? 0 : undefined,
    onClick: onClick,
    onKeyDown: onClick ? e => {
      if (e.key === 'Enter') onClick();
    } : undefined,
    style: {
      display: 'grid',
      gridTemplateColumns: '72px minmax(0,1fr) auto auto 56px',
      gap: 14,
      alignItems: 'center',
      height: 44,
      padding: '0 14px',
      borderTop: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Mono, null, ticker), /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      color: 'var(--text-2)',
      font: 'var(--type-small)'
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-small)',
      color: 'var(--text-2)',
      display: 'flex',
      gap: 5,
      alignItems: 'center'
    }
  }, rerun ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--status-person-fg)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "refresh-cw",
    size: 14
  })), "Reviewer needs a re-run") : sendbacks ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "undo-2",
    size: 14
  }), sendbacks, " send-back", sendbacks > 1 ? 's' : '') : null), /*#__PURE__*/React.createElement(__ds_scope.OutcomeChip, {
    outcome: outcome,
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-small)',
      color: 'var(--text-3)',
      textAlign: 'right',
      fontVariantNumeric: 'tabular-nums'
    }
  }, time));
}
Object.assign(__ds_scope, { FundProgressLine });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/FundProgressLine.jsx", error: String((e && e.message) || e) }); }

// components/status/VerdictChip.jsx
try { (() => {
const VERDICTS = {
  pass: {
    tone: 'good',
    label: 'Pass',
    icon: 'check'
  },
  concern: {
    tone: 'person',
    label: 'Concern',
    icon: 'circle-alert'
  },
  fail: {
    tone: 'stop',
    label: 'Fail',
    icon: 'x'
  },
  na: {
    tone: 'neutral',
    label: "Can't assess",
    icon: 'minus'
  },
  skipped: {
    tone: 'neutral',
    label: 'Skipped',
    icon: 'minus'
  },
  carried: {
    tone: 'neutral',
    label: 'Kept from last review',
    icon: 'corner-down-right'
  },
  rerun: {
    tone: 'person',
    label: 'Needs a re-run',
    icon: 'refresh-cw'
  }
};
function VerdictChip({
  verdict,
  size = 'sm',
  style
}) {
  const v = VERDICTS[verdict] || VERDICTS.na;
  return /*#__PURE__*/React.createElement(__ds_scope.StatusChip, {
    tone: v.tone,
    label: v.label,
    icon: v.icon,
    size: size,
    style: style
  });
}
Object.assign(__ds_scope, { VERDICTS, VerdictChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/status/VerdictChip.jsx", error: String((e && e.message) || e) }); }

// components/data/ReviewerRow.jsx
try { (() => {
function ReviewerRow({
  name,
  kind = 'ai',
  verdict,
  confidence,
  reason,
  evidence,
  reopened,
  children,
  first = false
}) {
  const special = verdict === 'skipped' || verdict === 'carried' || verdict === 'rerun';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 18px',
      borderTop: first ? 0 : '1px solid var(--border)',
      background: 'var(--bg-surface)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '150px 150px minmax(0,1fr) auto',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      paddingTop: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 var(--text-body)/1.3 var(--font-sans)'
    }
  }, name), /*#__PURE__*/React.createElement(__ds_scope.KindBadge, {
    kind: kind
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.VerdictChip, {
    verdict: verdict,
    size: "md"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: special ? 'var(--text-2)' : 'var(--text)',
      textWrap: 'pretty'
    }
  }, reason), reopened ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
      font: 'var(--type-small)',
      color: 'var(--text-2)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "history",
    size: 14
  }), " Reopened: ", reopened) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      paddingTop: 2,
      font: 'var(--type-small)',
      whiteSpace: 'nowrap'
    }
  }, confidence != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-2)'
    }
  }, confidence, " sure") : null, evidence === 'verified' ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      gap: 5,
      color: 'var(--status-good-fg)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 14,
    strokeWidth: 2
  }), "Evidence verified") : null, evidence === 'unverified' ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      gap: 5,
      color: 'var(--status-person-fg)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "circle-alert",
    size: 14,
    strokeWidth: 2
  }), "Evidence not verified") : null)), children ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 316,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Disclosure, {
    label: "Show evidence"
  }, children)) : null);
}
function ReviewerList({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { ReviewerRow, ReviewerList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ReviewerRow.jsx", error: String((e && e.message) || e) }); }

// components/status/VerdictDots.jsx
try { (() => {
const REVIEWERS = ['Analyst', 'Compliance', 'Finance', 'Suitability'];
function VerdictDots({
  verdicts = [],
  labels = REVIEWERS,
  size = 18
}) {
  const [hover, setHover] = React.useState(-1);
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      gap: 4,
      position: 'relative'
    },
    "aria-label": verdicts.map((v, i) => labels[i] + ': ' + (__ds_scope.VERDICTS[v] || __ds_scope.VERDICTS.na).label).join(', ')
  }, verdicts.map((v, i) => {
    const meta = __ds_scope.VERDICTS[v] || __ds_scope.VERDICTS.na;
    const t = __ds_scope.TONES[meta.tone];
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      onMouseEnter: () => setHover(i),
      onMouseLeave: () => setHover(-1),
      style: {
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: t.bg,
        color: t.fg,
        border: '1px solid ' + (v === 'skipped' || v === 'carried' ? t.border : 'transparent')
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: meta.icon,
      size: Math.round(size * 0.6),
      strokeWidth: 2.25
    }), hover === i ? /*#__PURE__*/React.createElement("span", {
      role: "tooltip",
      style: {
        position: 'absolute',
        bottom: size + 6,
        left: '50%',
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap',
        background: 'var(--text)',
        color: 'var(--bg-page)',
        font: '500 12px/1 var(--font-sans)',
        padding: '6px 8px',
        borderRadius: 'var(--radius-sm)',
        zIndex: 20,
        pointerEvents: 'none'
      }
    }, labels[i], ": ", meta.label) : null);
  }));
}
Object.assign(__ds_scope, { VerdictDots });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/status/VerdictDots.jsx", error: String((e && e.message) || e) }); }


__ds_ns.Button = __ds_scope.Button;
__ds_ns.Disclosure = __ds_scope.Disclosure;
__ds_ns.ICON_PATHS = __ds_scope.ICON_PATHS;
__ds_ns.Icon = __ds_scope.Icon;
__ds_ns.KindBadge = __ds_scope.KindBadge;
__ds_ns.Mono = __ds_scope.Mono;
__ds_ns.Skeleton = __ds_scope.Skeleton;
__ds_ns.SkeletonRows = __ds_scope.SkeletonRows;
__ds_ns.CoverageBar = __ds_scope.CoverageBar;
__ds_ns.DataTable = __ds_scope.DataTable;
__ds_ns.DecisionChange = __ds_scope.DecisionChange;
__ds_ns.NumberLink = __ds_scope.NumberLink;
__ds_ns.EvidenceTable = __ds_scope.EvidenceTable;
__ds_ns.HBarChart = __ds_scope.HBarChart;
__ds_ns.NumberTile = __ds_scope.NumberTile;
__ds_ns.TileRow = __ds_scope.TileRow;
__ds_ns.ReviewerRow = __ds_scope.ReviewerRow;
__ds_ns.ReviewerList = __ds_scope.ReviewerList;
__ds_ns.SourceRecord = __ds_scope.SourceRecord;
__ds_ns.FactList = __ds_scope.FactList;
__ds_ns.TimelineStep = __ds_scope.TimelineStep;
__ds_ns.Timeline = __ds_scope.Timeline;
__ds_ns.EmptyState = __ds_scope.EmptyState;
__ds_ns.FundProgressLine = __ds_scope.FundProgressLine;
__ds_ns.RunSteps = __ds_scope.RunSteps;
__ds_ns.Field = __ds_scope.Field;
__ds_ns.RadioGroup = __ds_scope.RadioGroup;
__ds_ns.Select = __ds_scope.Select;
__ds_ns.Switch = __ds_scope.Switch;
__ds_ns.TextInput = __ds_scope.TextInput;
__ds_ns.NavItem = __ds_scope.NavItem;
__ds_ns.PageHeader = __ds_scope.PageHeader;
__ds_ns.SectionTitle = __ds_scope.SectionTitle;
__ds_ns.RunTypeTag = __ds_scope.RunTypeTag;
__ds_ns.RunPicker = __ds_scope.RunPicker;
__ds_ns.Wordmark = __ds_scope.Wordmark;
__ds_ns.Sidebar = __ds_scope.Sidebar;
__ds_ns.Sheet = __ds_scope.Sheet;
__ds_ns.Tooltip = __ds_scope.Tooltip;
__ds_ns.Callout = __ds_scope.Callout;
__ds_ns.OUTCOMES = __ds_scope.OUTCOMES;
__ds_ns.OutcomeChip = __ds_scope.OutcomeChip;
__ds_ns.TONES = __ds_scope.TONES;
__ds_ns.StatusChip = __ds_scope.StatusChip;
__ds_ns.VERDICTS = __ds_scope.VERDICTS;
__ds_ns.VerdictChip = __ds_scope.VerdictChip;
__ds_ns.VerdictDots = __ds_scope.VerdictDots;


if (__ds_ns.__errors && __ds_ns.__errors.length) console.error('Design system errors', __ds_ns.__errors);

export const Button = __ds_ns.Button;
export const Disclosure = __ds_ns.Disclosure;
export const ICON_PATHS = __ds_ns.ICON_PATHS;
export const Icon = __ds_ns.Icon;
export const KindBadge = __ds_ns.KindBadge;
export const Mono = __ds_ns.Mono;
export const Skeleton = __ds_ns.Skeleton;
export const SkeletonRows = __ds_ns.SkeletonRows;
export const CoverageBar = __ds_ns.CoverageBar;
export const DataTable = __ds_ns.DataTable;
export const DecisionChange = __ds_ns.DecisionChange;
export const NumberLink = __ds_ns.NumberLink;
export const EvidenceTable = __ds_ns.EvidenceTable;
export const HBarChart = __ds_ns.HBarChart;
export const NumberTile = __ds_ns.NumberTile;
export const TileRow = __ds_ns.TileRow;
export const ReviewerRow = __ds_ns.ReviewerRow;
export const ReviewerList = __ds_ns.ReviewerList;
export const SourceRecord = __ds_ns.SourceRecord;
export const FactList = __ds_ns.FactList;
export const TimelineStep = __ds_ns.TimelineStep;
export const Timeline = __ds_ns.Timeline;
export const EmptyState = __ds_ns.EmptyState;
export const FundProgressLine = __ds_ns.FundProgressLine;
export const RunSteps = __ds_ns.RunSteps;
export const Field = __ds_ns.Field;
export const RadioGroup = __ds_ns.RadioGroup;
export const Select = __ds_ns.Select;
export const Switch = __ds_ns.Switch;
export const TextInput = __ds_ns.TextInput;
export const NavItem = __ds_ns.NavItem;
export const PageHeader = __ds_ns.PageHeader;
export const SectionTitle = __ds_ns.SectionTitle;
export const RunTypeTag = __ds_ns.RunTypeTag;
export const RunPicker = __ds_ns.RunPicker;
export const Wordmark = __ds_ns.Wordmark;
export const Sidebar = __ds_ns.Sidebar;
export const Sheet = __ds_ns.Sheet;
export const Tooltip = __ds_ns.Tooltip;
export const Callout = __ds_ns.Callout;
export const OUTCOMES = __ds_ns.OUTCOMES;
export const OutcomeChip = __ds_ns.OutcomeChip;
export const TONES = __ds_ns.TONES;
export const StatusChip = __ds_ns.StatusChip;
export const VERDICTS = __ds_ns.VERDICTS;
export const VerdictChip = __ds_ns.VerdictChip;
export const VerdictDots = __ds_ns.VerdictDots;
