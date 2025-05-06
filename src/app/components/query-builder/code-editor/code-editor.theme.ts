import { EditorView, gutter, lineNumbers } from '@codemirror/view';
import { foldGutter } from "@codemirror/language";

/**
 * Dark theme for the CodeMirror editor
 */
export const powerExplorerTheme = EditorView.theme({
  '&': {
    // backgroundColor: '#1e2130',
    color: '#e0e0e0',
    height: '100%'
  },
  '.cm-content': {
    caretColor: '#7aa2f7',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '13px',
    lineHeight: '1.5'
  },
  '.cm-cursor': {
    borderLeftColor: '#7aa2f7',
    borderLeftWidth: '2px'
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.06) !important'
  },
  '.cm-gutters': {
    backgroundColor: '#1D1F21',
    color: '#636b8a',
    border: 'none'
  },
  '.cm-foldGutter': {
    color: '#636b8a'
  },
  '.cm-line': {
    color: '#A8A8A8',
  },
  '.cm-line .ͼi': {
    // color: '#869ED3',
    color: '#86B9D3',
  },
  '.cm-line .ͼc': {
    // color: '#869ED3',
    color: '#9b95c7',
  },
  '.cm-line .ͼd': {
    // color: '#869ED3',
    color: '#7db19c',
  },
  '.cm-line .ͼe': {
    // color: '#86D39A',
     color: '#c4d386',
    // color: '#D3869C',
  },
  '.cm-lineNumbers': {
    color: 'rgba(255, 255, 255, 0.38)',
    fontSize: '13px',   
    paddingTop: '2px',
    fontFamily: 'JetBrains Mono, monospace',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#1D1F21',
    color: 'rgba(255, 255, 255, 0.77)'
  },
  '.cm-selectionMatch': {
    backgroundColor: 'rgba(44, 109, 182, 0.4) !important'
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(44, 109, 182, 0.29) !important'
  },
  '.cm-matchingBracket, .cm-nonmatchingBracket': {
    backgroundColor: 'rgba(44, 109, 182, 0.4) !important',
    color: '#e0e0e0'
  },
  // Custom lint marker styling
  '.cm-lint-marker': {
    width: '15px',
    height: '15px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  '.cm-lint-marker-error': {
    backgroundImage: 'url("../../../../../assets/icons/warning-gutter.svg")',
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    width: '15px',
    height: '15px',
    content: '""',
    /* Override any existing styles */
    '&::before': {
      display: 'none !important'
    },
    '&::after': {
      display: 'none !important'
    }
  },
  // XML syntax highlight
//   '.ͼ4': { color: '#bb9af7' }, // Tags
//   '.ͼb': { color: '#7aa2f7' }, // Attributes
//   '.ͼc': { color: '#9ece6a' }  // Attribute values
}, { dark: true });

/**
 * Custom fold gutter style
 */
export const foldGutterStyle = EditorView.theme({
  ".cm-foldMarker": {
    width: "14px",
    height: "14px",
    display: "inline-flex",
    marginTop: '3px',
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer"
  }
});

/**
 * Custom fold gutter configuration with SVG icon
 */
export const customFoldGutter = foldGutter({
  markerDOM: (open) => {
    const marker = document.createElement("div");
    marker.className = "cm-foldMarker";
    
    if (open) {
      // Open state - downward arrow
      marker.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#636b8a" stroke-width="1.35417" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    } else {
      // Closed state - rightward arrow
      marker.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(-90deg);">
          <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#636b8a" stroke-width="1.35417" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }
    
    return marker;
  }
}); 